import logging
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import AuditEvent

logger = logging.getLogger("civicone")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

def log_audit_event(
    db: Session,
    action: str,
    actor_id: str | None = None,
    actor_email: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: str | None = None,
    ip_address: str | None = None
) -> AuditEvent:
    """Records an immutable security audit event into the database and application log."""
    try:
        event = AuditEvent(
            id=str(uuid.uuid4()),
            actor_id=actor_id,
            actor_email=actor_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc)
        )
        db.add(event)
        db.commit()
        logger.info(f"AUDIT: action={action} actor={actor_email or actor_id} resource={resource_type}:{resource_id}")
        return event
    except Exception as e:
        logger.error(f"Failed to record audit event: {e}")
        return None
