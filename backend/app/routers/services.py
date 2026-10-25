from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import current_user
from ..core.logging import log_audit_event
from ..models import HealthcareFacility, AppointmentRequest, User

router = APIRouter(prefix="/api/v1/services", tags=["services"])

class AppointmentCreate(BaseModel):
    facility_id: str
    department_name: str
    appointment_date: str
    time_slot: str
    reason: str

@router.get("/facilities")
def get_healthcare_facilities(db: Session = Depends(get_db)):
    facilities = db.scalars(
        select(HealthcareFacility).where(HealthcareFacility.is_active.is_(True))
    ).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "facility_type": f.facility_type,
            "address": f.address,
            "locality": f.locality,
            "contact_phone": f.contact_phone,
            "services_offered": f.services_offered,
            "timings": f.timings
        }
        for f in facilities
    ]

@router.get("/appointments")
def list_user_appointments(user: User = Depends(current_user), db: Session = Depends(get_db)):
    appts = db.scalars(
        select(AppointmentRequest)
        .where(AppointmentRequest.user_id == user.id)
        .order_by(AppointmentRequest.created_at.desc())
    ).all()

    return [
        {
            "id": a.id,
            "facility_id": a.facility_id,
            "facility_name": a.facility.name if a.facility else "Health Center",
            "department_name": a.department_name,
            "appointment_date": a.appointment_date,
            "time_slot": a.time_slot,
            "reason": a.reason,
            "status": a.status,
            "created_at": a.created_at
        }
        for a in appts
    ]

@router.post("/appointments", status_code=201)
def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    facility = db.get(HealthcareFacility, body.facility_id)
    if not facility:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Healthcare facility not found")

    appt = AppointmentRequest(
        user_id=user.id,
        facility_id=body.facility_id,
        department_name=body.department_name,
        appointment_date=body.appointment_date,
        time_slot=body.time_slot,
        reason=body.reason,
        status="confirmed"
    )
    db.add(appt)
    db.commit()

    log_audit_event(
        db,
        action="DEMO_HEALTH_APPOINTMENT_REQUESTED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="appointment",
        resource_id=appt.id,
        details=f"Demo appointment at {facility.name}"
    )

    return {
        "id": appt.id,
        "facility_name": facility.name,
        "appointment_date": appt.appointment_date,
        "time_slot": appt.time_slot,
        "status": appt.status,
        "message": "Demo appointment confirmed successfully."
    }
