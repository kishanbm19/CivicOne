from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import dept_admin_user, platform_admin_user
from ..core.security import hash_password
from ..core.logging import log_audit_event
from ..models import User, Organization, Department, DepartmentMembership, AuditEvent

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

class OrganizationCreate(BaseModel):
    name: str = Field(min_length=3, max_length=150)
    domain: str = Field(pattern="^(transport|municipal|healthcare)$")
    description: str | None = None

class DepartmentCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=3, max_length=150)
    category_key: str = Field(min_length=2, max_length=50)
    description: str | None = None

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

class StaffProvision(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_REGEX)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern="^(staff|dept_admin)$")
    department_id: str
    role_in_dept: str = "staff"

@router.get("/organizations")
def list_organizations(db: Session = Depends(get_db)):
    orgs = db.scalars(select(Organization).order_by(Organization.name)).all()
    return [
        {
            "id": o.id,
            "name": o.name,
            "domain": o.domain,
            "description": o.description,
            "departments": [
                {"id": d.id, "name": d.name, "category_key": d.category_key}
                for d in o.departments
            ]
        }
        for o in orgs
    ]

@router.post("/organizations", status_code=201)
def create_organization(
    body: OrganizationCreate,
    user: User = Depends(platform_admin_user),
    db: Session = Depends(get_db)
):
    existing = db.scalar(select(Organization).where(Organization.name == body.name))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Organization name already exists")

    org = Organization(name=body.name, domain=body.domain, description=body.description)
    db.add(org)
    db.commit()

    log_audit_event(
        db,
        action="ORGANIZATION_CREATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="organization",
        resource_id=org.id,
        details=f"Created {org.name}"
    )
    return {"id": org.id, "name": org.name, "domain": org.domain}

@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.scalars(select(Department).order_by(Department.name)).all()
    return [
        {
            "id": d.id,
            "organization_id": d.organization_id,
            "organization_name": d.organization.name if d.organization else None,
            "domain": d.organization.domain if d.organization else None,
            "name": d.name,
            "category_key": d.category_key
        }
        for d in depts
    ]

@router.post("/departments", status_code=201)
def create_department(
    body: DepartmentCreate,
    user: User = Depends(platform_admin_user),
    db: Session = Depends(get_db)
):
    org = db.get(Organization, body.organization_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    dept = Department(
        organization_id=body.organization_id,
        name=body.name,
        category_key=body.category_key,
        description=body.description
    )
    db.add(dept)
    db.commit()

    log_audit_event(
        db,
        action="DEPARTMENT_CREATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="department",
        resource_id=dept.id,
        details=f"Created {dept.name} under {org.name}"
    )
    return {"id": dept.id, "name": dept.name, "category_key": dept.category_key}

@router.get("/staff")
def list_staff(user: User = Depends(dept_admin_user), db: Session = Depends(get_db)):
    members = db.scalars(select(DepartmentMembership).where(DepartmentMembership.is_active.is_(True))).all()
    return [
        {
            "membership_id": m.id,
            "user_id": m.user.id,
            "full_name": m.user.full_name,
            "email": m.user.email,
            "role": m.user.role,
            "role_in_dept": m.role_in_dept,
            "department_id": m.department_id,
            "department_name": m.department.name if m.department else None,
            "domain": m.department.organization.domain if m.department and m.department.organization else None
        }
        for m in members
        if m.user
    ]

@router.post("/staff", status_code=201)
def provision_staff_account(
    body: StaffProvision,
    user: User = Depends(dept_admin_user),
    db: Session = Depends(get_db)
):
    dept = db.get(Department, body.department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")

    existing_u = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing_u:
        u = existing_u
        u.role = body.role
    else:
        u = User(
            email=body.email.lower(),
            full_name=body.full_name,
            password_hash=hash_password(body.password),
            role=body.role
        )
        db.add(u)
        db.flush()

    # Create department membership
    existing_m = db.scalar(
        select(DepartmentMembership).where(
            DepartmentMembership.user_id == u.id,
            DepartmentMembership.department_id == dept.id
        )
    )
    if not existing_m:
        m = DepartmentMembership(
            user_id=u.id,
            department_id=dept.id,
            role_in_dept=body.role_in_dept,
            is_active=True
        )
        db.add(m)

    db.commit()

    log_audit_event(
        db,
        action="STAFF_PROVISIONED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="user",
        resource_id=u.id,
        details=f"Provisioned staff {u.email} to {dept.name} with role {body.role}"
    )

    return {"message": "Staff account provisioned successfully", "user_id": u.id, "email": u.email}

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(dept_admin_user),
    db: Session = Depends(get_db)
):
    logs = db.scalars(
        select(AuditEvent)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "actor_id": log.actor_id,
            "actor_email": log.actor_email,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        }
        for log in logs
    ]
