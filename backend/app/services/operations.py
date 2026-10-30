from datetime import datetime, timezone

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models import (
    AuditEvent,
    Complaint,
    DepartmentMembership,
    Document,
    Notification,
    User,
)


def dispatch_due_announcement_notifications(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.now(timezone.utc)
    due_documents = db.scalars(
        select(Document).where(
            Document.status == "published",
            Document.is_public.is_(True),
            Document.announcement_notifications_sent_at.is_(None),
            or_(Document.scheduled_at.is_(None), Document.scheduled_at <= current_time),
            or_(Document.expiry_date.is_(None), Document.expiry_date > current_time),
        )
    ).all()
    notified = 0
    for document in due_documents:
        claimed = db.execute(
            update(Document)
            .where(
                Document.id == document.id,
                Document.announcement_notifications_sent_at.is_(None),
            )
            .values(announcement_notifications_sent_at=current_time)
        )
        if claimed.rowcount != 1:
            continue

        if document.target_type == "all":
            recipient_ids = db.scalars(
                select(User.id).where(User.role == "citizen", User.is_active.is_(True))
            ).all()
        else:
            complaint_query = select(Complaint.citizen_id).where(
                Complaint.domain == document.service_domain
            )
            if document.target_type == "department" and document.target_department_id:
                complaint_query = complaint_query.where(
                    Complaint.department_id == document.target_department_id
                )
            recipient_ids = db.scalars(complaint_query.distinct()).all()

        for recipient_id in recipient_ids:
            db.add(
                Notification(
                    user_id=recipient_id,
                    title=f"Government announcement: {document.title}",
                    message=document.description or "A new public announcement is available.",
                    link="/notices",
                    notification_type="announcement",
                )
            )
            notified += 1
    if due_documents:
        db.commit()
    return notified


def archive_expired_announcements(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.now(timezone.utc)
    expired = db.scalars(
        select(Document).where(
            Document.status == "published",
            Document.expiry_date.is_not(None),
            Document.expiry_date <= current_time,
        )
    ).all()
    archived = 0
    for document in expired:
        claimed = db.execute(
            update(Document)
            .where(
                Document.id == document.id,
                Document.status == "published",
                Document.expiry_date <= current_time,
            )
            .values(status="archived")
            .execution_options(synchronize_session=False)
        )
        if claimed.rowcount != 1:
            continue
        document.status = "archived"
        db.add(
            AuditEvent(
                actor_id=None,
                actor_email="system",
                action="DOCUMENT_EXPIRED",
                resource_type="document",
                resource_id=document.id,
                details=f"Announcement expired at {document.expiry_date}.",
            )
        )
        archived += 1
    if expired:
        db.commit()
    return archived


def escalate_overdue_complaints(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.now(timezone.utc)
    overdue = db.scalars(
        select(Complaint).where(
            Complaint.department_id.is_not(None),
            Complaint.resolution_due_at.is_not(None),
            Complaint.resolution_due_at < current_time,
            Complaint.status.notin_(("resolved", "closed", "rejected")),
            Complaint.escalated_at.is_(None),
        )
    ).all()
    escalated = 0
    for complaint in overdue:
        claimed = db.execute(
            update(Complaint)
            .where(
                Complaint.id == complaint.id,
                Complaint.escalated_at.is_(None),
            )
            .values(escalated_at=current_time)
        )
        if claimed.rowcount != 1:
            continue
        supervisor_ids = db.scalars(
            select(DepartmentMembership.user_id)
            .join(User, User.id == DepartmentMembership.user_id)
            .where(
                DepartmentMembership.department_id == complaint.department_id,
                DepartmentMembership.is_active.is_(True),
                User.is_active.is_(True),
                or_(
                    DepartmentMembership.role_in_dept.in_(
                        ("department_admin", "admin", "supervisor", "lead")
                    ),
                    User.role == "dept_admin",
                ),
            )
            .distinct()
        ).all()
        if not supervisor_ids:
            supervisor_ids = db.scalars(
                select(User.id).where(
                    User.role == "platform_admin", User.is_active.is_(True)
                )
            ).all()
        for supervisor_id in supervisor_ids:
            db.add(
                Notification(
                    user_id=supervisor_id,
                    title=f"Overdue complaint: {complaint.reference}",
                    message=f"{complaint.title} is past its resolution deadline.",
                    link=f"/government/complaints/{complaint.id}",
                    notification_type="complaint_escalation",
                )
            )
        db.add(
            AuditEvent(
                actor_id=None,
                actor_email="system",
                action="COMPLAINT_OVERDUE_ESCALATED",
                resource_type="complaint",
                resource_id=complaint.id,
                details=f"Resolution deadline passed at {complaint.resolution_due_at}.",
            )
        )
        complaint.escalated_at = current_time
        escalated += 1
    if overdue:
        db.commit()
    return escalated


def run_operations_maintenance() -> tuple[int, int]:
    with SessionLocal() as db:
        archive_expired_announcements(db)
        announcements = dispatch_due_announcement_notifications(db)
        overdue = escalate_overdue_complaints(db)
        return announcements, overdue
