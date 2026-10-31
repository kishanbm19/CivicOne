from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import require_citizen, staff_user, authorized_department_ids, platform_admin_user
from ..models import (
    Complaint,
    ComplaintActivity,
    User,
    Department,
    Organization,
    Document,
    AuditEvent,
    HealthcareFacility,
    StatusHistory,
)
from ..services.operations import escalate_overdue_complaints

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@router.get("/public")
def get_public_stats(domain: str | None = None, db: Session = Depends(get_db)):
    """Database-backed civic statistics for landing page highlights."""
    filters = [Complaint.domain == domain] if domain else []
    total_complaints = db.scalar(select(func.count(Complaint.id)).where(*filters)) or 0
    resolved = db.scalar(
        select(func.count(Complaint.id)).where(
            *filters, Complaint.status.in_(("resolved", "closed"))
        )
    ) or 0
    in_progress = db.scalar(
        select(func.count(Complaint.id)).where(
            *filters,
            Complaint.status.in_(("in_progress", "acknowledged", "assigned", "on_hold", "reopened")),
        )
    ) or 0
    domain_rows = db.execute(
        select(Complaint.domain, Complaint.status, func.count(Complaint.id))
        .where(*filters)
        .group_by(Complaint.domain, Complaint.status)
    ).all()
    requests_by_domain = {}
    for complaint_domain, status, count in domain_rows:
        domain_stats = requests_by_domain.setdefault(
            complaint_domain,
            {"total": 0, "resolved": 0, "in_progress": 0, "pending": 0, "rejected": 0},
        )
        domain_stats["total"] += count
        if status in ("resolved", "closed"):
            domain_stats["resolved"] += count
        elif status in ("in_progress", "acknowledged", "assigned", "on_hold", "reopened"):
            domain_stats["in_progress"] += count
        elif status == "rejected":
            domain_stats["rejected"] += count
        else:
            domain_stats["pending"] += count

    rate = round(resolved / total_complaints * 100) if total_complaints else None

    return {
        "total_complaints": total_complaints,
        "issues_resolved": resolved,
        "in_progress": in_progress,
        "resolution_rate": rate,
        "requests_by_domain": requests_by_domain,
    }

@router.get("/citizen")
def get_citizen_dashboard_analytics(user: User = Depends(require_citizen), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Complaint.id)).where(Complaint.citizen_id == user.id)) or 0
    in_progress = db.scalar(select(func.count(Complaint.id)).where(
        Complaint.citizen_id == user.id,
        Complaint.status.in_(("in_progress", "acknowledged", "assigned", "submitted"))
    )) or 0
    resolved = db.scalar(select(func.count(Complaint.id)).where(
        Complaint.citizen_id == user.id,
        Complaint.status.in_(("resolved", "closed"))
    )) or 0

    return {
        "total": total,
        "in_progress": in_progress,
        "resolved": resolved
    }

@router.get("/department")
def get_department_analytics(domain: str | None = None, user: User = Depends(staff_user), db: Session = Depends(get_db)):
    auth_depts = authorized_department_ids(db, user)
    filters = []
    if user.role != "platform_admin":
        filters.append(Complaint.department_id.in_(auth_depts or {"none"}))
    if domain:
        filters.append(Complaint.domain == domain)

    def count(*extra):
        return db.scalar(
            select(func.count(Complaint.id)).where(*filters, *extra)
        ) or 0

    now = datetime.now(timezone.utc)
    escalate_overdue_complaints(db, now)

    total = count()
    pending = count(Complaint.status.in_(("submitted", "classified")))
    in_progress = count(Complaint.status.in_(("assigned", "acknowledged", "in_progress", "on_hold", "reopened")))
    resolved = count(Complaint.status.in_(("resolved", "closed")))
    overdue = count(
        Complaint.status.notin_(("resolved", "closed", "rejected")),
        Complaint.resolution_due_at.is_not(None),
        Complaint.resolution_due_at < now,
    )
    assigned_to_me = db.scalar(
        select(func.count(Complaint.id)).where(
            *filters,
            Complaint.assigned_to_user_id == user.id,
            Complaint.status.notin_(("resolved", "closed", "rejected")),
        )
    ) or 0

    category_rows = db.execute(
        select(Complaint.category, func.count(Complaint.id).label("amount"))
        .where(*filters)
        .group_by(Complaint.category)
        .order_by(func.count(Complaint.id).desc())
        .limit(5)
    ).all()
    category_total = sum(row.amount for row in category_rows)
    top_categories = [
        {
            "name": row.category,
            "value": round(row.amount * 100 / category_total) if category_total else 0,
            "color": ["#2563EB", "#10B981", "#F59E0B", "#E11D48", "#0284C7"][index % 5],
        }
        for index, row in enumerate(category_rows)
    ]

    six_months_ago = now - timedelta(days=183)
    created_recent = db.scalars(
        select(Complaint.created_at).where(*filters, Complaint.created_at >= six_months_ago)
    ).all()
    resolved_recent = db.scalars(
        select(StatusHistory.created_at)
        .join(Complaint, Complaint.id == StatusHistory.complaint_id)
        .where(*filters, StatusHistory.new_status.in_(("resolved", "closed")), StatusHistory.created_at >= six_months_ago)
    ).all()
    month_labels = []
    for offset in range(5, -1, -1):
        month_index = now.month - offset
        year = now.year
        while month_index <= 0:
            month_index += 12
            year -= 1
        month_labels.append((year, month_index))
    monthly_trends = [
        {
            "name": datetime(year, month, 1).strftime("%b"),
            "count": sum(1 for value in created_recent if value.year == year and value.month == month),
            "resolved": sum(1 for value in resolved_recent if value.year == year and value.month == month),
        }
        for year, month in month_labels
    ]

    workload_q = (
        select(User.id, User.full_name, func.count(Complaint.id).label("amount"))
        .join(Complaint, Complaint.assigned_to_user_id == User.id)
        .where(*filters, Complaint.status.notin_(("resolved", "closed", "rejected")))
        .group_by(User.id, User.full_name)
        .order_by(func.count(Complaint.id).desc())
    )
    staff_workload = []
    if user.role != "platform_admin":
        staff_workload = [
            {"user_id": row.id, "staff_name": row.full_name, "open_complaints": row.amount}
            for row in db.execute(workload_q).all()
        ]

    resolved_dates = db.execute(
        select(Complaint.created_at, StatusHistory.created_at)
        .join(StatusHistory, StatusHistory.complaint_id == Complaint.id)
        .where(*filters, StatusHistory.new_status == "resolved")
    ).all()
    resolution_hours = []
    for created_at, resolved_at in resolved_dates:
        if created_at.tzinfo is None and resolved_at.tzinfo is not None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elif resolved_at.tzinfo is None and created_at.tzinfo is not None:
            resolved_at = resolved_at.replace(tzinfo=timezone.utc)
        resolution_hours.append((resolved_at - created_at).total_seconds() / 3600)
    avg_resolution_hours = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None

    recent_activities = []
    if user.role != "platform_admin":
        activity_q = (
            select(ComplaintActivity, User.full_name)
            .join(Complaint, Complaint.id == ComplaintActivity.complaint_id)
            .join(User, User.id == ComplaintActivity.actor_id)
            .where(*filters)
            .order_by(ComplaintActivity.created_at.desc())
            .limit(10)
        )
        recent_activities = [
            {
                "action": row.action,
                "summary": row.summary,
                "actor_name": actor_name,
                "created_at": row.created_at,
                "complaint_id": row.complaint_id,
            }
            for row, actor_name in db.execute(activity_q).all()
        ]

    document_filters = []
    if user.role != "platform_admin":
        document_filters.append(
            or_(Document.department_id.in_(auth_depts or {"none"}), Document.author_id == user.id)
        )
    if domain:
        document_filters.append(Document.service_domain == domain)
    announcement_statuses = dict(db.execute(
        select(Document.status, func.count(Document.id))
        .where(*document_filters)
        .group_by(Document.status)
    ).all())
    announcement_stats = {
        "draft": announcement_statuses.get("draft", 0),
        "pending_approval": announcement_statuses.get("review", 0),
        "published": announcement_statuses.get("published", 0),
        "archived": announcement_statuses.get("archived", 0),
    }

    return {
        "total": total,
        "pending": pending,
        "assigned_to_me": assigned_to_me,
        "in_progress": in_progress,
        "resolved": resolved,
        "overdue": overdue,
        "trends": monthly_trends,
        "category_distribution": top_categories,
        "staff_workload": staff_workload if user.role != "platform_admin" else [],
        "recent_activities": recent_activities,
        "announcement_stats": announcement_stats,
        "avg_resolution_hours": avg_resolution_hours,
    }

@router.get("/platform")
def get_platform_admin_analytics(user: User = Depends(platform_admin_user), db: Session = Depends(get_db)):

    orgs_count = db.scalar(select(func.count(Organization.id))) or 0
    depts_count = db.scalar(select(func.count(Department.id))) or 0
    users_count = db.scalar(select(func.count(User.id))) or 0
    complaints_count = db.scalar(select(func.count(Complaint.id))) or 0
    documents_count = db.scalar(
        select(func.count(Document.id)).where(Document.status == "published")
    ) or 0
    audit_events_count = db.scalar(select(func.count(AuditEvent.id))) or 0

    return {
        "organizations": orgs_count,
        "departments": depts_count,
        "users": users_count,
        "total_complaints": complaints_count,
        "published_documents": documents_count,
        "audit_events": audit_events_count
    }
