import os
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import current_user, staff_user, authorized_department_ids
from ..core.logging import log_audit_event
from ..models import Document, Department, User, Organization, Notification

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

class DocumentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    service_domain: str = Field(pattern="^(transport|municipal|healthcare)$")
    department_id: str | None = None
    category: str = "announcement"  # announcement | notice | infrastructure | advisory
    is_public: bool = True

class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    is_public: bool | None = None

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
        "file_path": d.file_path,
        "file_size": d.file_size,
        "mime_type": d.mime_type,
        "publication_timestamp": d.publication_timestamp,
        "expiry_date": d.expiry_date,
        "is_public": d.is_public,
        "version": d.version,
        "created_at": d.created_at,
        "updated_at": d.updated_at
    }

@router.get("/public")
def list_public_documents(
    domain: str | None = None,
    category: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Citizens and guests can view published government notices and announcements."""
    q = select(Document).where(Document.status == "published", Document.is_public.is_(True))
    if domain:
        q = q.where(Document.service_domain == domain)
    if category:
        q = q.where(Document.category == category)

    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(
        q.order_by(Document.publication_timestamp.desc(), Document.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "total": total,
        "page": page,
        "items": [_doc_out(d, db) for d in rows]
    }

@router.get("")
def list_staff_documents(
    domain: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(staff_user),
    db: Session = Depends(get_db)
):
    """Staff view documents within their authorized department/org scope."""
    auth_depts = authorized_department_ids(db, user)
    q = select(Document)

    if user.role != "platform_admin":
        q = q.where(
            or_(
                Document.department_id.in_(auth_depts or {"none"}),
                Document.author_id == user.id
            )
        )

    if domain:
        q = q.where(Document.service_domain == domain)
    if status_filter:
        q = q.where(Document.status == status_filter)

    rows = db.scalars(q.order_by(Document.created_at.desc())).all()
    return [_doc_out(d, db) for d in rows]

@router.post("", status_code=201)
def create_document(
    body: DocumentCreate,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db)
):
    doc = Document(
        title=body.title,
        description=body.description,
        service_domain=body.service_domain,
        department_id=body.department_id,
        category=body.category,
        is_public=body.is_public,
        author_id=user.id,
        status="draft"
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
        details=f"Draft created: {doc.title}"
    )

    return _doc_out(doc, db)

@router.post("/upload")
def upload_document_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    service_domain: str = Form(...),
    category: str = Form("announcement"),
    department_id: str | None = Form(None),
    is_public: bool = Form(True),
    user: User = Depends(staff_user),
    db: Session = Depends(get_db)
):
    upload_dir = settings.UPLOAD_DIRECTORY
    os.makedirs(upload_dir, exist_ok=True)

    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File exceeds max upload size.")

    ext = os.path.splitext(file.filename or "")[1]
    safe_filename = f"doc_{secrets.token_hex(8)}{ext}"
    dest_path = os.path.join(upload_dir, safe_filename)

    with open(dest_path, "wb") as f:
        f.write(content)

    doc = Document(
        title=title,
        service_domain=service_domain,
        category=category,
        department_id=department_id,
        is_public=is_public,
        author_id=user.id,
        file_path=f"/uploads/{safe_filename}",
        file_size=len(content),
        mime_type=file.content_type,
        status="draft"
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
        details=f"Uploaded document {file.filename} as {safe_filename}"
    )

    return _doc_out(doc, db)

@router.post("/{doc_id}/submit-review")
def submit_for_review(doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if doc.status != "draft":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only draft documents can be submitted for review")

    doc.status = "review"
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_SUBMITTED_REVIEW",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/approve")
def approve_document(doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)):
    if user.role not in ("dept_admin", "platform_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only department administrators can approve documents")

    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    doc.status = "approved"
    doc.reviewer_id = user.id
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_APPROVED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/publish")
def publish_document(doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)):
    if user.role not in ("dept_admin", "platform_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can publish documents")

    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    doc.status = "published"
    doc.publication_timestamp = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_PUBLISHED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id,
        details=f"Published: {doc.title}"
    )
    return _doc_out(doc, db)

@router.post("/{doc_id}/unpublish")
def unpublish_document(doc_id: str, user: User = Depends(staff_user), db: Session = Depends(get_db)):
    if user.role not in ("dept_admin", "platform_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can unpublish documents")

    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    doc.status = "archived"
    db.commit()

    log_audit_event(
        db,
        action="DOCUMENT_UNPUBLISHED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="document",
        resource_id=doc.id
    )
    return _doc_out(doc, db)
