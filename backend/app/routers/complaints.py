import os
import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import current_user, authorized_department_ids
from ..core.logging import log_audit_event
from ..models import Complaint, StatusHistory, ComplaintInternalNote, User, Department, Notification
from ..ai.service import classify_complaint
from ..policies.routing import route_department
from ..policies.permissions import can_transition

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
    new_status: str
    reason: str | None = None
    citizen_visible: bool = True

class AssignIn(BaseModel):
    department_id: str | None = None
    assigned_to_user_id: str | None = None
    note: str | None = None

class InternalNoteIn(BaseModel):
    note: str = Field(min_length=2, max_length=2000)

class ReopenIn(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)

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
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }

def _visible(db: Session, user: User, c: Complaint) -> bool:
    if user.role == "citizen":
        return c.citizen_id == user.id
    if user.role == "platform_admin":
        return True
    authorized_depts = authorized_department_ids(db, user)
    # Visible if in authorized department or unassigned in user's domain
    return (c.department_id in authorized_depts) or (c.assigned_to_user_id == user.id)

@router.post("/upload-image")
def upload_image(file: UploadFile = File(...), user: User = Depends(current_user)):
    # Validate extension and size
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid image format. Allowed: JPG, PNG, WEBP.")

    upload_dir = settings.UPLOAD_DIRECTORY
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    safe_name = f"complaint_{secrets.token_hex(8)}{ext}"
    dest_path = os.path.join(upload_dir, safe_name)

    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"File size exceeds maximum {settings.MAX_UPLOAD_SIZE_MB}MB.")

    with open(dest_path, "wb") as f:
        f.write(content)

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
    cat_to_route = classification["category"] if classification.get("confident") else body.category
    dept_id = route_department(db, body.domain, cat_to_route)

    needs_review = (not classification.get("confident")) or (classification["priority"] == "critical") or (dept_id is None)
    initial_status = "submitted" if needs_review else "assigned"

    c = Complaint(
        reference=reference,
        citizen_id=user.id,
        domain=body.domain,
        title=body.title,
        description=body.description,
        category=body.category if body.category != "general" else classification["category"],
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
    search: str | None = None,
    assigned_to_me: bool = False,
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
            q = q.where(Complaint.assigned_to_user_id == user.id)
        else:
            q = q.where(
                or_(
                    Complaint.department_id.in_(auth_depts or {"none"}),
                    Complaint.assigned_to_user_id == user.id
                )
            )

    if domain:
        q = q.where(Complaint.domain == domain)
    if status:
        q = q.where(Complaint.status == status)
    if priority:
        q = q.where(Complaint.priority == priority)
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

    base = _out(c, db)
    base["history"] = history_data
    base["internal_notes"] = notes_data
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

    # Staff or admin transition check
    if not can_transition(c.status, body.new_status) and user.role not in ("dept_admin", "platform_admin"):
        # Allow flexible operational resolution
        valid = {"resolved", "in_progress", "on_hold", "acknowledged"}
        if body.new_status not in valid:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Cannot transition from {c.status} to {body.new_status}")

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

    if body.department_id:
        c.department_id = body.department_id
    if body.assigned_to_user_id is not None:
        c.assigned_to_user_id = body.assigned_to_user_id
    c.needs_review = False
    if c.status == "submitted":
        c.status = "assigned"

    if body.note:
        db.add(ComplaintInternalNote(
            complaint_id=c.id,
            author_id=user.id,
            note=f"Assignment note: {body.note}"
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
    db.commit()
    return {"message": "Internal note recorded", "id": note.id}

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

    db.commit()
    return _out(c, db)
