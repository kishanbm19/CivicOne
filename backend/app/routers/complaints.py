import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import (
    can_manage_department,
    current_user,
    authorized_department_ids,
)
from ..core.logging import log_audit_event
from ..models import (
    Complaint,
    ComplaintActivity,
    ComplaintEvidence,
    DepartmentSLA,
    StatusHistory,
    ComplaintInternalNote,
    User,
    Department,
    Organization,
    DepartmentMembership,
    Notification,
)
from ..services.ai_classifier import classify_complaint
from ..services.complaint_router import route_department
from ..services.storage_service import (
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_DOCUMENT_EXTENSIONS,
    validate_and_save_upload,
    get_canonical_storage_path,
)
from ..core.permissions import can_transition

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

class ComplaintIn(BaseModel):
    domain: str = Field(pattern="^(transport|municipal|healthcare)$")
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=4000)
    category: str = Field(min_length=2, max_length=50)
    address: str = Field(min_length=5, max_length=300)  # strictly manual entry; no GPS
    locality: str | None = Field(default=None, max_length=150)
    image_url: str | None = None

class StatusIn(BaseModel):
    new_status: str = Field(pattern="^(submitted|classified|assigned|acknowledged|in_progress|on_hold|resolved|closed|reopened|rejected)$")
    reason: str | None = Field(default=None, max_length=2000)
    citizen_visible: bool = True

class AssignIn(BaseModel):
    department_id: str | None = None
    assigned_to_user_id: str | None = None
    note: str | None = None

class InternalNoteIn(BaseModel):
    note: str = Field(min_length=2, max_length=2000)

class ReopenIn(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)

class InformationRequestIn(BaseModel):
    message: str = Field(min_length=5, max_length=2000)

def _activity(db: Session, complaint_id: str, actor_id: str, action: str, summary: str, citizen_visible: bool = False):
    db.add(ComplaintActivity(
        complaint_id=complaint_id,
        actor_id=actor_id,
        action=action,
        summary=summary,
        citizen_visible=citizen_visible,
    ))

def _set_resolution_deadline(db: Session, complaint: Complaint) -> None:
    if not complaint.department_id:
        return
    sla = db.scalar(
        select(DepartmentSLA).where(
            DepartmentSLA.department_id == complaint.department_id,
            DepartmentSLA.category == complaint.category.strip().lower(),
        )
    )
    if sla:
        complaint.resolution_due_at = datetime.now(timezone.utc) + timedelta(hours=sla.resolution_hours)

def _out(c: Complaint, db: Session | None = None):
    dept_name = None
    assigned_staff_name = None
    if c.department_id and db:
        d = db.get(Department, c.department_id)
        if d:
            dept_name = d.name
    if c.assigned_to_user_id and db:
        u = db.get(User, c.assigned_to_user_id)
        if u:
            assigned_staff_name = u.full_name

    return {
        "id": c.id,
        "reference": c.reference,
        "domain": c.domain,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "address": c.address,
        "locality": c.locality,
        "priority": c.priority,
        "status": c.status,
        "department_id": c.department_id,
        "department_name": dept_name,
        "assigned_to_user_id": c.assigned_to_user_id,
        "assigned_staff_name": assigned_staff_name,
        "image_url": c.image_url,
        "needs_review": c.needs_review,
        "classified_by": c.classified_by,
        "ai_confidence": c.ai_confidence,
        "ai_explanation": c.ai_explanation,
        "resolution_summary": c.resolution_summary,
        "resolution_due_at": c.resolution_due_at,
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }

def _visible(db: Session, user: User, c: Complaint) -> bool:
    if user.role == "citizen":
        return c.citizen_id == user.id
    if user.role == "platform_admin":
        return True
    authorized_depts = authorized_department_ids(db, user)
    return c.department_id in authorized_depts

@router.post("/upload-image")
def upload_image(file: UploadFile = File(...), user: User = Depends(current_user)):
    content = file.file.read()
    safe_name, detected_mime, _ = validate_and_save_upload(
        filename=file.filename or "complaint.jpg",
        content=content,
        declared_content_type=file.content_type,
        allowed_types=ALLOWED_IMAGE_EXTENSIONS,
        prefix="complaint",
    )
    return {"image_url": f"/uploads/{safe_name}", "filename": safe_name}

@router.post("", status_code=201)
def create_complaint(body: ComplaintIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "citizen":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only citizens can file civic complaints")

    # Domain prefix reference matching screenshot convention
    prefix_map = {"transport": "T", "municipal": "M", "healthcare": "H"}
    pfx = prefix_map.get(body.domain, "CO")
    ref_num = secrets.randbelow(9000) + 1000
    reference = f"#{pfx}-2024-{ref_num:04d}"

    # AI-assisted classification with deterministic fallback
    classification = classify_complaint(body.title, body.description, body.domain)

    # Route to department based on classified or provided category
    cat_to_route = (classification["category"] if classification.get("confident") else body.category).strip().lower()
    dept_id = route_department(db, body.domain, cat_to_route)

    needs_review = (not classification.get("confident")) or (classification["priority"] == "critical") or (dept_id is None)
    initial_status = "submitted" if needs_review else "assigned"

    c = Complaint(
        reference=reference,
        citizen_id=user.id,
        domain=body.domain,
        title=body.title,
        description=body.description,
        category=(classification["category"] if body.category == "general" else body.category).strip().lower(),
        address=body.address,
        locality=body.locality,
        priority=classification["priority"],
        department_id=dept_id,
        image_url=body.image_url,
        needs_review=needs_review,
        classified_by=classification["source"],
        ai_confidence=str(classification.get("confidence", "")),
        ai_explanation=classification.get("explanation"),
        status=initial_status
    )
    _set_resolution_deadline(db, c)
    db.add(c)
    db.flush()

    # Record initial status history
    db.add(StatusHistory(
        complaint_id=c.id,
        previous_status=None,
        new_status=initial_status,
        actor_id=user.id,
        reason="Complaint submitted by citizen",
        citizen_visible=True
    ))

    # Create citizen notification
    db.add(Notification(
        user_id=user.id,
        title=f"Complaint Registered ({reference})",
        message=f"Your complaint regarding '{body.title}' has been registered.",
        link=f"/app/complaints/{c.id}",
        notification_type="complaint"
    ))
    _activity(db, c.id, user.id, "submitted", "Complaint submitted.", True)

    log_audit_event(
        db,
        action="COMPLAINT_CREATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
        details=f"Reference: {reference}, Domain: {body.domain}",
        ip_address=request.client.host if request.client else None
    )

    db.commit()
    return _out(c, db)

@router.get("")
def list_complaints(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    domain: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    assigned_to_user_id: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    search: str | None = None,
    assigned_to_me: bool = False,
    overdue_only: bool = False,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    q = select(Complaint)

    if user.role == "citizen":
        q = q.where(Complaint.citizen_id == user.id)
    elif user.role == "platform_admin":
        pass  # sees all
    else:
        # Department staff
        auth_depts = authorized_department_ids(db, user)
        if assigned_to_me:
            q = q.where(
                Complaint.assigned_to_user_id == user.id,
                Complaint.department_id.in_(auth_depts or {"none"}),
            )
        else:
            q = q.where(Complaint.department_id.in_(auth_depts or {"none"}))

    if domain:
        q = q.where(Complaint.domain == domain)
    if status:
        q = q.where(Complaint.status == status)
    if priority:
        q = q.where(Complaint.priority == priority)
    if category:
        q = q.where(Complaint.category == category)
    if assigned_to_user_id:
        q = q.where(Complaint.assigned_to_user_id == assigned_to_user_id)
    if start_date:
        q = q.where(Complaint.created_at >= start_date)
    if end_date:
        q = q.where(Complaint.created_at <= end_date)
    if overdue_only:
        q = q.where(
            Complaint.resolution_due_at.is_not(None),
            Complaint.resolution_due_at < datetime.now(timezone.utc),
            Complaint.status.notin_(("resolved", "closed", "rejected")),
        )
    if search:
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                Complaint.title.ilike(term),
                Complaint.reference.ilike(term),
                Complaint.address.ilike(term),
                Complaint.locality.ilike(term)
            )
        )

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(
        q.order_by(Complaint.created_at.desc()).offset((page - 1) * size).limit(size)
    ).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [_out(c, db) for c in rows]
    }

@router.get("/staff-options")
def list_complaint_staff_options(
    domain: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role == "citizen":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Government staff credentials required")
    dept_ids = authorized_department_ids(db, user)
    query = (
        select(User.id, User.full_name, DepartmentMembership.department_id)
        .join(DepartmentMembership, DepartmentMembership.user_id == User.id)
        .where(
            DepartmentMembership.is_active.is_(True),
            User.is_active.is_(True),
            DepartmentMembership.department_id.in_(dept_ids or {"none"}),
        )
    )
    if domain:
        query = query.join(Department, Department.id == DepartmentMembership.department_id)
        query = query.join(Organization, Organization.id == Department.organization_id)
        query = query.where(Organization.domain == domain)
    return [
        {"user_id": row.id, "full_name": row.full_name, "department_id": row.department_id}
        for row in db.execute(query.order_by(User.full_name)).all()
    ]

@router.get("/{cid}")
def get_complaint_detail(cid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = db.get(Complaint, cid)
    if not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    hist_q = select(StatusHistory).where(StatusHistory.complaint_id == cid).order_by(StatusHistory.created_at)
    if user.role == "citizen":
        hist_q = hist_q.where(StatusHistory.citizen_visible.is_(True))
    hist = db.scalars(hist_q).all()

    notes_data = []
    if user.role != "citizen":
        notes = db.scalars(
            select(ComplaintInternalNote)
            .where(ComplaintInternalNote.complaint_id == cid)
            .order_by(ComplaintInternalNote.created_at.desc())
        ).all()
        notes_data = [
            {
                "id": n.id,
                "note": n.note,
                "author_id": n.author_id,
                "author_name": n.author.full_name if n.author else "Staff",
                "created_at": n.created_at
            }
            for n in notes
        ]

    history_data = [
        {
            "id": h.id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "reason": h.reason,
            "citizen_visible": h.citizen_visible,
            "created_at": h.created_at,
            "actor_name": h.actor.full_name if h.actor else "System"
        }
        for h in hist
    ]
    activities = db.scalars(
        select(ComplaintActivity)
        .where(
            ComplaintActivity.complaint_id == cid,
            ComplaintActivity.citizen_visible.is_(True) if user.role == "citizen" else True,
        )
        .order_by(ComplaintActivity.created_at)
    ).all()
    evidence = db.scalars(
        select(ComplaintEvidence)
        .where(
            ComplaintEvidence.complaint_id == cid,
            ComplaintEvidence.citizen_visible.is_(True) if user.role == "citizen" else True,
        )
        .order_by(ComplaintEvidence.created_at)
    ).all()

    base = _out(c, db)
    base["history"] = history_data
    base["internal_notes"] = notes_data
    base["activities"] = [
        {
            "id": item.id,
            "action": item.action,
            "summary": item.summary,
            "actor_name": item.actor.full_name if item.actor else "Staff",
            "created_at": item.created_at,
        }
        for item in activities
    ]
    base["evidence"] = [
        {
            "id": item.id,
            "file_name": item.file_name,
            "mime_type": item.mime_type,
            "file_size": item.file_size,
            "download_url": f"/api/v1/complaints/{cid}/evidence/{item.id}/download",
            "created_at": item.created_at,
        }
        for item in evidence
    ]
    return base

@router.post("/{cid}/status")
def update_complaint_status(
    cid: str,
    body: StatusIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    c = db.get(Complaint, cid)
    if not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    if user.role == "citizen":
        if not (c.status in ("resolved", "closed") and body.new_status == "reopened"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Citizens can only request reopening of resolved complaints")

    legacy_staff_transition = body.new_status in {
        "acknowledged", "in_progress", "on_hold", "resolved"
    }
    if user.role != "citizen" and not can_transition(c.status, body.new_status) and not legacy_staff_transition:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Cannot transition from {c.status} to {body.new_status}")
    if body.new_status in ("closed", "rejected") and (
        not c.department_id or not can_manage_department(db, user, c.department_id)
    ):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Only a department supervisor or administrator can close or reject complaints",
        )

    if body.new_status == "resolved":
        if not body.reason or not body.reason.strip():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Resolution remarks are required")
        if c.priority in ("high", "critical") and not db.scalar(
            select(ComplaintEvidence.id).where(ComplaintEvidence.complaint_id == c.id).limit(1)
        ):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Upload resolution evidence before resolving high-priority complaints")
    if body.new_status == "rejected" and (not body.reason or not body.reason.strip()):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A reason is required when rejecting a complaint")

    old_status = c.status
    c.status = body.new_status

    if body.new_status == "resolved" and body.reason:
        c.resolution_summary = body.reason

    hist = StatusHistory(
        complaint_id=c.id,
        previous_status=old_status,
        new_status=body.new_status,
        actor_id=user.id,
        reason=body.reason or f"Status changed to {body.new_status.replace('_', ' ')}",
        citizen_visible=body.citizen_visible
    )
    db.add(hist)
    _activity(
        db, c.id, user.id, "status_changed",
        f"Status changed from {old_status.replace('_', ' ')} to {body.new_status.replace('_', ' ')}.",
        body.citizen_visible,
    )

    # Notify citizen if status update is visible
    if body.citizen_visible and c.citizen_id:
        db.add(Notification(
            user_id=c.citizen_id,
            title=f"Complaint Status Update ({c.reference})",
            message=f"Status changed to {body.new_status.replace('_', ' ')}: {body.reason or 'Please check your dashboard.'}",
            link=f"/app/complaints/{c.id}",
            notification_type="complaint_status"
        ))

    log_audit_event(
        db,
        action="COMPLAINT_STATUS_UPDATE",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
        details=f"Status changed from {old_status} to {body.new_status}"
    )

    db.commit()
    return _out(c, db)

@router.post("/{cid}/assign")
def assign_complaint(
    cid: str,
    body: AssignIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if user.role == "citizen":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to assign complaints")

    c = db.get(Complaint, cid)
    if not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    target_department_id = body.department_id or c.department_id
    if not target_department_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Select a department before assigning this complaint")
    if c.department_id and c.department_id != target_department_id and not can_manage_department(db, user, c.department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot reassign complaints from this department")
    if not can_manage_department(db, user, target_department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot assign complaints to this department")

    assigned_staff = None
    if body.assigned_to_user_id:
        membership = db.scalar(
            select(DepartmentMembership).where(
                DepartmentMembership.user_id == body.assigned_to_user_id,
                DepartmentMembership.department_id == target_department_id,
                DepartmentMembership.is_active.is_(True),
            )
        )
        assigned_staff = db.get(User, body.assigned_to_user_id)
        if not membership or not assigned_staff or assigned_staff.role == "citizen" or not assigned_staff.is_active:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Assigned staff must be an active member of the target department")

    c.department_id = target_department_id
    c.assigned_to_user_id = body.assigned_to_user_id
    c.resolution_due_at = None
    _set_resolution_deadline(db, c)
    c.needs_review = False
    old_status = c.status
    if c.status == "submitted":
        c.status = "assigned"
        db.add(StatusHistory(
            complaint_id=c.id,
            previous_status=old_status,
            new_status="assigned",
            actor_id=user.id,
            reason="Complaint assigned to a department.",
            citizen_visible=True,
        ))

    if body.note:
        db.add(ComplaintInternalNote(
            complaint_id=c.id,
            author_id=user.id,
            note=f"Assignment note: {body.note}"
        ))
    _activity(
        db, c.id, user.id, "assigned",
        f"Assigned to {assigned_staff.full_name if assigned_staff else 'department queue'}.",
        True,
    )

    if c.citizen_id:
        db.add(Notification(
            user_id=c.citizen_id,
            title=f"Complaint Assigned ({c.reference})",
            message="Your complaint has been assigned to the responsible department.",
            link=f"/app/complaints/{c.id}",
            notification_type="complaint_assigned",
        ))

    log_audit_event(
        db,
        action="COMPLAINT_ASSIGNED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
        details=f"Assigned to staff={body.assigned_to_user_id}, dept={body.department_id}"
    )

    db.commit()
    return _out(c, db)

@router.post("/{cid}/notes")
def add_internal_note(
    cid: str,
    body: InternalNoteIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    if user.role == "citizen":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Citizens cannot add internal staff notes")

    c = db.get(Complaint, cid)
    if not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    note = ComplaintInternalNote(
        complaint_id=c.id,
        author_id=user.id,
        note=body.note
    )
    db.add(note)
    _activity(db, c.id, user.id, "internal_note", "An internal department note was added.")
    log_audit_event(
        db,
        action="COMPLAINT_INTERNAL_NOTE_ADDED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
    )
    db.commit()
    return {"message": "Internal note recorded", "id": note.id}

@router.post("/{cid}/request-information")
def request_additional_information(
    cid: str,
    body: InformationRequestIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    c = db.get(Complaint, cid)
    if user.role == "citizen" or not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    _activity(db, c.id, user.id, "information_requested", body.message, True)
    db.add(Notification(
        user_id=c.citizen_id,
        title=f"More information requested ({c.reference})",
        message=body.message,
        link=f"/app/complaints/{c.id}",
        notification_type="complaint_information_request",
    ))
    log_audit_event(
        db,
        action="COMPLAINT_INFORMATION_REQUESTED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
    )
    db.commit()
    return {"message": "Information request sent"}

@router.post("/{cid}/evidence", status_code=201)
def upload_resolution_evidence(
    cid: str,
    file: UploadFile = File(...),
    citizen_visible: bool = True,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    c = db.get(Complaint, cid)
    if user.role == "citizen" or not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    content = file.file.read()
    filename, detected_mime, file_size = validate_and_save_upload(
        filename=file.filename or "resolution-evidence.pdf",
        content=content,
        declared_content_type=file.content_type,
        allowed_types=ALLOWED_DOCUMENT_EXTENSIONS,
        prefix="evidence",
    )
    evidence = ComplaintEvidence(
        complaint_id=c.id,
        uploaded_by_id=user.id,
        file_path=f"/uploads/{filename}",
        file_name=os.path.basename(file.filename or filename),
        mime_type=detected_mime,
        file_size=file_size,
        citizen_visible=citizen_visible,
    )
    db.add(evidence)
    db.flush()
    _activity(db, c.id, user.id, "evidence_added", "Resolution evidence was uploaded.", citizen_visible)
    log_audit_event(
        db,
        action="COMPLAINT_EVIDENCE_UPLOADED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint_evidence",
        resource_id=evidence.id,
    )
    db.commit()
    return {
        "id": evidence.id,
        "file_name": evidence.file_name,
        "download_url": f"/api/v1/complaints/{c.id}/evidence/{evidence.id}/download",
    }

@router.get("/{cid}/evidence/{evidence_id}/download")
def download_complaint_evidence(
    cid: str,
    evidence_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    c = db.get(Complaint, cid)
    evidence = db.get(ComplaintEvidence, evidence_id)
    if not c or not evidence or evidence.complaint_id != c.id or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    if user.role == "citizen" and not evidence.citizen_visible:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    filename = os.path.basename(evidence.file_path)
    safe_path = get_canonical_storage_path(filename)
    if not os.path.isfile(safe_path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence file not found")
    return FileResponse(safe_path, media_type=evidence.mime_type, filename=evidence.file_name)

@router.post("/{cid}/reopen")
def reopen_complaint(
    cid: str,
    body: ReopenIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    c = db.get(Complaint, cid)
    if not c or not _visible(db, user, c):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    if c.status not in ("resolved", "closed"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only resolved or closed complaints can be reopened")

    old_status = c.status
    c.status = "reopened"
    db.add(StatusHistory(
        complaint_id=c.id,
        previous_status=old_status,
        new_status="reopened",
        actor_id=user.id,
        reason=f"Reopened by citizen: {body.reason}",
        citizen_visible=True
    ))
    _activity(db, c.id, user.id, "reopened", f"Complaint reopened: {body.reason}", True)
    log_audit_event(
        db,
        action="COMPLAINT_REOPENED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="complaint",
        resource_id=c.id,
    )

    db.commit()
    return _out(c, db)
