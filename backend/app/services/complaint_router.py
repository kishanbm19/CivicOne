"""Department routing logic for incoming civic complaints."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Department, Organization


def route_department(
    db: Session, organization_id: str, category: str
) -> str | None:
    """Return a department only when its category belongs to this organization."""
    if not db.get(Organization, organization_id):
        return None
    q = (
        select(Department.id)
        .where(
            Department.organization_id == organization_id,
            Department.category_key == category.strip().lower(),
        )
    )
    department_ids = db.execute(q).scalars().all()
    return department_ids[0] if len(department_ids) == 1 else None
