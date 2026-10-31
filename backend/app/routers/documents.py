import os
from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
    Form,
    status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import (
    current_user,
    staff_user,
    platform_admin_user,
    active_department_membership_ids,
    can_manage_department,
    can_publish_for_department,
    bearer,
)
from ..core.security import decode_access_token
from ..core.logging import log_audit_event
from ..models import Document, Department, User, Notification
from ..services.storage_service import (
    ALLOWED_DOCUMENT_EXTENSIONS,
    validate_and_save_upload,
    get_canonical_storage_path,
)
from ..services.operations import dispatch_due_announcement_notifications

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class DocumentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    service_domain: str = Field(pattern="^(transport|municipal|healthcare)$")
    department_id: str | None = None
    category: str = "announcement"  # announcement | notice | infrastructure | advisory
    is_public: bool = True
    target_type: str = Field(default="domain", pattern="^(all|domain|department)$")
    target_department_id: str | None = None
    scheduled_at: datetime | None = None
    expiry_date: datetime | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    category: str | None = Field(default=None, max_length=50)
    is_public: bool | None = None

class ReviewFeedbackIn(BaseModel):
    message: str = Field(min_length=5, max_length=2000)

class AdminDocumentAccessIn(BaseModel):
    reason: str = Field(min_length=10, max_length=1000)
    download: bool = False

    @field_validator("reason")
    @classmethod
    def require_nonblank_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("A non-empty access reason is required")
        return normalized


def _document_department_ids(db: Session, user: User) -> set[str]:
    return active_department_membership_ids(db, user)


def _can_access_document_department(db: Session, user: User, department_id: str | None) -> bool:
    return bool(department_id and department_id in _document_department_ids(db, user))


def _get_optional_user(
    cred=Depends(bearer), db: Session = Depends(get_db)
) -> User | None:
    """Returns the authenticated user if a valid bearer token is provided, else None."""
    if not cred:
        return None
    uid = decode_access_token(cred.credentials)
    if not uid:
        return None
    u = db.get(User, uid)
    if not u or not u.is_active:
        return None
    return u


def _doc_out(d: Document, db: Session | None = None):
    dept_name = None
    if d.department_id and db:
        dept = db.get(Department, d.department_id)
        if dept:
            dept_name = dept.name

    author_name = None
    if d.author_id and db:
        u = db.get(User, d.author_id)
        if u:
            author_name = u.full_name

    reviewer_name = None
    if d.reviewer_id and db:
        u = db.get(User, d.reviewer_id)
        if u:
            reviewer_name = u.full_name

    # Download URL routes through secure endpoint rather than raw file_path
    download_url = f"/api/v1/documents/{d.id}/download" if d.file_path else None

    return {
        "id": d.id,
        "title": d.title,
        "description": d.description,
        "service_domain": d.service_domain,
        "department_id": d.department_id,
        "department_name": dept_name,
        "category": d.category,
        "status": d.status,
        "author_id": d.author_id,
        "author_name": author_name,
        "reviewer_id": d.reviewer_id,
        "reviewer_name": reviewer_name,
        "review_feedback": d.review_feedback,
        "file_path": download_url or d.file_path,
        "download_url": download_url,
        "file_size": d.file_size,
        "mime_type": d.mime_type,
        "publication_timestamp": d.publication_timestamp,
        "expiry_date": d.expiry_date,
        "scheduled_at": d.scheduled_at,
        "target_type": d.target_type,
        "target_department_id": d.target_department_id,
        "is_public": d.is_public,
        "version": d.version,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


def _check_document_access(doc: Document, user: User | None, db: Session) -> None:
    """
    Enforces authorization check for viewing or downloading a document:
    - If document is public and published: anyone (including guests/citizens) can view/download.
    - If document is private (is_public=False) or not published (draft, review, approved, archived):
      requires authenticated staff with an active membership in the document's department.
    """
    if doc.is_public and doc.status == "published":
        return

    # Non-public or unreleased document requires staff authentication
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this document.",
        )

    if user.role == "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: citizens cannot view internal or unpublished documents.",
        )

    if user.role not in ("staff", "dept_admin", "platform_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: government staff credentials required.",
        )

    # Department scoped check
    auth_depts = _document_department_ids(db, user)
    if doc.department_id and doc.department_id in auth_depts:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: you do not have permission to access this document.",
    )


@router.get("/public")
def list_public_documents(
    domain: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Citizens and guests can view published government notices and announcements."""
    now = datetime.now(timezone.utc)
    dispatch_due_announcement_notifications(db, now)

    q = select(Document).where(
        Document.status == "published",
        Document.is_public.is_(True),
        or_(Document.scheduled_at.is_(None), Document.scheduled_at <= now),
        or_(Document.expiry_date.is_(None), Document.expiry_date > now),
    )
    if domain:
        q = q.where(or_(Document.target_type == "all", Document.service_domain == domain))
    if category:
        q = q.where(Document.category == category)

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(
        q.order_by(Document.publication_timestamp.desc(), Document.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {"total": total, "page": page, "items": [_doc_out(d, db) for d in rows]}


@router.get("")
def list_staff_documents(
    domain: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    """Staff view documents within their authorized department/org scope."""
    auth_depts = _document_department_ids(db, user)
    q = select(Document).where(Document.department_id.in_(auth_depts or {"none"}))

    if domain:
        q = q.where(Document.service_domain == domain)
    if status_filter:
        q = q.where(Document.status == status_filter)

    rows = db.scalars(q.order_by(Document.created_at.desc())).all()
    return [_doc_out(d, db) for d in rows]


@router.get("/{doc_id}")
def get_document_details(
    doc_id: str,
    user: User | None = Depends(_get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Get metadata for a single document.
    Enforces authorization: private/unreleased documents require staff permission.
    """
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found."
        )

    _check_document_access(doc, user, db)
    return _doc_out(doc, db)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    user: User | None = Depends(_get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Securely download document file.
    - Validates authorization (private/draft docs require authorized staff).
    - Prevents directory traversal attacks via canonical path validation.
    - Returns proper Content-Type, Content-Length, and Content-Disposition headers.
    """
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found."
        )

    _check_document_access(doc, user, db)

    if not doc.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file attached to this document.",
        )

    # Extract filename from stored file_path (e.g., "/uploads/doc_xyz.pdf" -> "doc_xyz.pdf")
    filename = os.path.basename(doc.file_path)
    safe_abs_path = get_canonical_storage_path(filename)

    if not os.path.isfile(safe_abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on storage server.",
        )

    log_audit_event(
        db,
        action="DOCUMENT_DOWNLOADED",
        actor_id=user.id if user else None,
        actor_email=user.email if user else "anonymous",
        resource_type="document",
        resource_id=doc.id,
        details=f"Downloaded '{doc.title}' ({filename})",
    )

    media_type = doc.mime_type or "application/octet-stream"
    download_filename = f"{doc.title.replace(' ', '_')}{os.path.splitext(filename)[1]}"

    return FileResponse(
        path=safe_abs_path,
        media_type=media_type,
        filename=download_filename,
    )


@router.post("", status_code=201)
def create_document(
    body: DocumentCreate,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    auth_depts = _document_department_ids(db, user)
    department_id = body.department_id
    if department_id is None:
        candidates = db.scalars(
            select(Department.id)
            .where(
                Department.id.in_(auth_depts or {"none"}),
                Department.organization.has(domain=body.service_domain),
            )
            .order_by(Department.name)
        ).all()
        department_id = candidates[0] if candidates else None
    if department_id:
        department = db.get(Department, department_id)
        if (
            not department
            or department_id not in auth_depts
            or not department.organization
            or department.organization.domain != body.service_domain
        ):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You cannot create documents for this department or domain",
            )
    else:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "A document must belong to one of your departments",
        )

    if body.target_type == "department":
        target = db.get(Department, body.target_department_id) if body.target_department_id else None
        if (
            not target
            or not target.organization
            or target.organization.domain != body.service_domain
        ):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "A valid target department in the selected domain is required",
            )
        if target.id not in auth_depts:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot target this department")
    elif body.target_department_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Target department is only valid for department-targeted notices",
        )
    if body.expiry_date and body.expiry_date <= (body.scheduled_at or datetime.now(timezone.utc)):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Expiry must be later than scheduled publication",
        )

    doc = Document(
        title=body.title,
        description=body.description,
        service_domain=body.service_domain,
        department_id=department_id,
        category=body.category,
        is_public=body.is_public,
        target_type=body.target_type,
        target_department_id=body.target_department_id,
        scheduled_at=body.scheduled_at,
        expiry_date=body.expiry_date,
        author_id=user.id,
        status="draft",
    )
    db.add(doc)
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_DRAFT_CREATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=f"Draft created: {doc.title}",
    )

    return _doc_out(doc, db)

@router.patch("/{doc_id}")
def update_document(
    doc_id: str,
    body: DocumentUpdate,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if doc.status not in ("draft", "changes_requested"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only draft documents can be edited")
    if not _can_access_document_department(db, user, doc.department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot edit this document")
    if doc.author_id != user.id and not can_manage_department(db, user, doc.department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author or a department administrator can edit this document")
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide at least one field to update")
    for field in ("title", "category", "is_public"):
        if field in changes and changes[field] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{field} cannot be null")
    for field, value in changes.items():
        setattr(doc, field, value)
    doc.status = "draft"
    doc.review_feedback = None
    doc.version += 1
    db.commit()
    log_audit_event(
        db,
        action="DOCUMENT_UPDATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
    )
    return _doc_out(doc, db)

@router.post("/upload")
def upload_document_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str | None = Form(None),
    service_domain: str = Form(...),
    category: str = Form("announcement"),
    department_id: str | None = Form(None),
    is_public: bool = Form(True),
    target_type: str = Form("domain"),
    target_department_id: str | None = Form(None),
    scheduled_at: datetime | None = Form(None),
    expiry_date: datetime | None = Form(None),
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    """
    Upload document file with strict validation:
    - Maximum file size check
    - Extension whitelist (PDF, PNG, JPG, WEBP, TXT)
    - Magic byte header inspection
    - Directory traversal defense
    """
    if target_type not in {"all", "domain", "department"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid announcement audience")
    if service_domain not in {"transport", "municipal", "healthcare"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid service domain")
    auth_depts = _document_department_ids(db, user)
    if department_id is None:
        department_id = db.scalar(
            select(Department.id)
            .where(
                Department.id.in_(auth_depts or {"none"}),
                Department.organization.has(domain=service_domain),
            )
            .order_by(Department.name)
            .limit(1)
        )
    department = db.get(Department, department_id) if department_id else None
    if not department or department.id not in auth_depts:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot create documents for this department")
    if department and (not department.organization or department.organization.domain != service_domain):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Department does not belong to the selected domain")
    if target_type == "department":
        target = db.get(Department, target_department_id) if target_department_id else None
        if not target or target.id not in auth_depts or not target.organization or target.organization.domain != service_domain:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid or unauthorized target department")
    elif target_department_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Target department requires department targeting")
    if expiry_date and expiry_date <= (scheduled_at or datetime.now(timezone.utc)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Expiry must be later than scheduled publication")

    content = file.file.read()

    safe_filename, detected_mime, file_size = validate_and_save_upload(
        filename=file.filename or "upload.pdf",
        content=content,
        declared_content_type=file.content_type,
        allowed_types=ALLOWED_DOCUMENT_EXTENSIONS,
        prefix="doc",
    )

    doc = Document(
        title=title,
        description=description,
        service_domain=service_domain,
        category=category,
        department_id=department_id,
        is_public=is_public,
        target_type=target_type,
        target_department_id=target_department_id,
        scheduled_at=scheduled_at,
        expiry_date=expiry_date,
        author_id=user.id,
        file_path=f"/uploads/{safe_filename}",
        file_size=file_size,
        mime_type=detected_mime,
        status="draft",
    )
    db.add(doc)
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_UPLOADED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=f"Uploaded document {file.filename} as {safe_filename} (type: {detected_mime})",
    )

    return _doc_out(doc, db)


@router.post("/{doc_id}/submit-review")
def submit_for_review(
    doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if doc.status != "draft":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only draft documents can be submitted for review",
        )
    if not _can_access_document_department(db, user, doc.department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot submit this document")

    doc.status = "review"
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_SUBMITTED_REVIEW",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
    )
    return _doc_out(doc, db)


@router.post("/{doc_id}/approve")
def approve_document(
    doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not _can_access_document_department(db, user, doc.department_id) or not (
        doc.department_id and can_manage_department(db, user, doc.department_id)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an authorized department supervisor can approve this document")
    if doc.status != "review":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only documents under review can be approved")

    doc.status = "approved"
    doc.reviewer_id = user.id
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_APPROVED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/request-changes")
def request_document_changes(
    doc_id: str,
    body: ReviewFeedbackIn,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not _can_access_document_department(db, user, doc.department_id) or not (
        doc.department_id and can_manage_department(db, user, doc.department_id)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an authorized supervisor can request changes")
    if doc.status != "review":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only documents under review can be returned for changes")
    doc.status = "changes_requested"
    doc.reviewer_id = user.id
    doc.review_feedback = body.message
    db.add(Notification(
        user_id=doc.author_id,
        title=f"Changes requested: {doc.title}",
        message=body.message,
        link="/government/documents",
        notification_type="document_review",
    ))
    db.commit()
    log_audit_event(
        db,
        action="DOCUMENT_CHANGES_REQUESTED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=body.message,
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/reject")
def reject_document(
    doc_id: str,
    body: ReviewFeedbackIn,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not _can_access_document_department(db, user, doc.department_id) or not (
        doc.department_id and can_manage_department(db, user, doc.department_id)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an authorized supervisor can reject documents")
    if doc.status != "review":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only documents under review can be rejected")
    doc.status = "rejected"
    doc.reviewer_id = user.id
    doc.review_feedback = body.message
    db.add(Notification(
        user_id=doc.author_id,
        title=f"Document rejected: {doc.title}",
        message=body.message,
        link="/government/documents",
        notification_type="document_review",
    ))
    db.commit()
    log_audit_event(
        db,
        action="DOCUMENT_REJECTED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=body.message,
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/publish")
def publish_document(
    doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not _can_access_document_department(db, user, doc.department_id) or not (
        doc.department_id and can_publish_for_department(db, user, doc.department_id)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot publish documents for this department")
    if doc.status != "approved":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only approved documents can be published")

    doc.status = "published"
    doc.publication_timestamp = doc.scheduled_at or datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_PUBLISHED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=f"Published: {doc.title}",
    )
    return _doc_out(doc, db)


@router.post("/{doc_id}/unpublish")
def unpublish_document(
    doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not _can_access_document_department(db, user, doc.department_id) or not (
        doc.department_id and can_publish_for_department(db, user, doc.department_id)
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot archive documents for this department")

    doc.status = "archived"
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_UNPUBLISHED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
    )
    return _doc_out(doc, db)


@router.post("/{doc_id}/admin-access")
def platform_admin_document_access(
    doc_id: str,
    body: AdminDocumentAccessIn,
    user: User = Depends(platform_admin_user),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if doc.is_public and doc.status == "published":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Published public documents are available through the public document endpoint",
        )

    download_details: tuple[str, str] | None = None
    if body.download:
        if not doc.file_path:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No file attached to this document")

        filename = os.path.basename(doc.file_path)
        safe_path = get_canonical_storage_path(filename)
        if not os.path.isfile(safe_path):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Document file not found")
        download_details = (safe_path, filename)

    log_audit_event(
        db,
        action="SENSITIVE_DOCUMENT_ACCESSED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=f"Platform administrator accessed a restricted document. Reason: {body.reason}",
    )
    if download_details is None:
        return _doc_out(doc, db)

    safe_path, filename = download_details
    return FileResponse(
        safe_path,
        media_type=doc.mime_type or "application/octet-stream",
        filename=f"{doc.title.replace(' ', '_')}{os.path.splitext(filename)[1]}",
    )
