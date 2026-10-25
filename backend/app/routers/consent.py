from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import current_user
from ..core.logging import log_audit_event
from ..models import ConsentGrant, Organization, User

router = APIRouter(prefix="/api/v1/consent", tags=["consent"])

class ConsentGrantIn(BaseModel):
    recipient_organization_id: str
    data_scope: str = Field(min_length=2, max_length=100)
    purpose: str = Field(min_length=5, max_length=255)
    validity_days: int = Field(default=365, ge=1, le=730)

def _consent_out(c: ConsentGrant, db: Session):
    org = db.get(Organization, c.recipient_organization_id)
    return {
        "id": c.id,
        "user_id": c.user_id,
        "recipient_organization_id": c.recipient_organization_id,
        "recipient_organization_name": org.name if org else "Department",
        "recipient_domain": org.domain if org else "civic",
        "data_scope": c.data_scope,
        "purpose": c.purpose,
        "status": c.status,
        "granted_at": c.granted_at,
        "expires_at": c.expires_at,
        "revoked_at": c.revoked_at
    }

@router.get("")
def list_my_consent_grants(user: User = Depends(current_user), db: Session = Depends(get_db)):
    grants = db.scalars(
        select(ConsentGrant)
        .where(ConsentGrant.user_id == user.id)
        .order_by(ConsentGrant.granted_at.desc())
    ).all()
    return [_consent_out(g, db) for g in grants]

@router.post("", status_code=201)
def create_consent_grant(
    body: ConsentGrantIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    org = db.get(Organization, body.recipient_organization_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipient organization not found")

    now_utc = datetime.now(timezone.utc)
    grant = ConsentGrant(
        user_id=user.id,
        recipient_organization_id=body.recipient_organization_id,
        data_scope=body.data_scope,
        purpose=body.purpose,
        status="active",
        granted_at=now_utc,
        expires_at=now_utc + timedelta(days=body.validity_days)
    )
    db.add(grant)
    db.commit()

    log_audit_event(
        db,
        action="CONSENT_GRANTED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="consent_grant",
        resource_id=grant.id,
        details=f"Scope: {grant.data_scope} to {org.name}"
    )

    return _consent_out(grant, db)

@router.post("/{grant_id}/revoke")
def revoke_consent_grant(
    grant_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    grant = db.get(ConsentGrant, grant_id)
    if not grant or grant.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consent grant not found")

    grant.status = "revoked"
    grant.revoked_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db,
        action="CONSENT_REVOKED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="consent_grant",
        resource_id=grant.id,
        details="Consent revoked by citizen"
    )

    return _consent_out(grant, db)
