"""Department routing logic for incoming civic complaints."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Department, Organization


def route_department(db: Session, domain: str, category: str) -> str | None:
    """Deterministic routing: department for (domain, category); None -> review queue."""
    q = (
        select(Department.id)
        .join(Organization, Organization.id == Department.organization_id)
        .where(Organization.domain == domain, Department.category_key == category)
    )
    return db.execute(q).scalars().first()

