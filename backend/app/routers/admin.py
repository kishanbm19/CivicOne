from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import (
    authorized_department_ids,
    can_manage_department,
    platform_admin_user,
    staff_user,
)
from ..core.security import hash_password
from ..core.logging import log_audit_event
from ..models import (
    User,
    Organization,
    Department,
    DepartmentMembership,
    AuditEvent,
    DepartmentSLA,
    Complaint,
    Document,
)

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
    role_in_dept: str = Field(
        default="staff",
        pattern="^(staff|department_admin|supervisor|public_information_officer)$",
    )

class DepartmentSLAIn(BaseModel):
    department_id: str
    category: str = Field(min_length=2, max_length=50)
    resolution_hours: int = Field(ge=1, le=8760)

class StaffMembershipUpdate(BaseModel):
    role_in_dept: str = Field(
        pattern="^(staff|department_admin|supervisor|public_information_officer)$"
    )
    is_active: bool

@router.get("/organizations")
def list_organizations(user: User = Depends(staff_user), db: Session = Depends(get_db)):
    q = select(Organization)
    if user.role != "platform_admin":
        dept_ids = authorized_department_ids(db, user)
        q = q.where(Organization.id.in_(
            select(Department.organization_id).where(Department.id.in_(dept_ids or {"none"}))
        ))
    orgs = db.scalars(q.order_by(Organization.name)).all()
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
def list_departments(user: User = Depends(staff_user), db: Session = Depends(get_db)):
    q = select(Department)
    if user.role != "platform_admin":
        q = q.where(Department.id.in_(authorized_department_ids(db, user) or {"none"}))
    depts = db.scalars(q.order_by(Department.name)).all()
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
def list_staff(user: User = Depends(staff_user), db: Session = Depends(get_db)):
    dept_ids = authorized_department_ids(db, user)
    if user.role != "platform_admin":
        dept_ids = {
            dept_id for dept_id in dept_ids
            if can_manage_department(db, user, dept_id)
        }
    if not dept_ids and user.role != "platform_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Department administrator privileges required")
    members = db.scalars(
        select(DepartmentMembership)
        .where(
            DepartmentMembership.department_id.in_(dept_ids) if user.role != "platform_admin" else True
        )
    ).all()
    return [
        {
            "membership_id": m.id,
            "user_id": m.user.id,
            "full_name": m.user.full_name,
            "email": m.user.email,
            "role": m.user.role,
            "role_in_dept": m.role_in_dept,
            "is_active": m.is_active,
            "user_is_active": m.user.is_active,
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
    user: User = Depends(staff_user),
    db: Session = Depends(get_db)
):
    dept = db.get(Department, body.department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    if not can_manage_department(db, user, dept.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot manage staff in this department")

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
    else:
        existing_m.role_in_dept = body.role_in_dept
        existing_m.is_active = True

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

@router.put("/staff/{membership_id}")
def update_staff_membership(
    membership_id: str,
    body: StaffMembershipUpdate,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    membership = db.get(DepartmentMembership, membership_id)
    if not membership:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff membership not found")
    if not can_manage_department(db, user, membership.department_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot manage this department's staff")

    elevated_roles = {"department_admin", "admin"}
    if membership.is_active and membership.role_in_dept in elevated_roles and (
        not body.is_active or body.role_in_dept not in elevated_roles
    ):
        active_admins = db.scalar(
            select(func.count(DepartmentMembership.id)).where(
                DepartmentMembership.department_id == membership.department_id,
                DepartmentMembership.is_active.is_(True),
                DepartmentMembership.role_in_dept.in_(elevated_roles),
                DepartmentMembership.id != membership.id,
            )
        ) or 0
        if active_admins == 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "A department must retain at least one active department administrator",
            )

    membership.role_in_dept = body.role_in_dept
    membership.is_active = body.is_active
    db.commit()
    log_audit_event(
        db,
        action="STAFF_MEMBERSHIP_UPDATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="department_membership",
        resource_id=membership.id,
        details=f"Updated {membership.user.email} in {membership.department.name}",
    )
    return {
        "membership_id": membership.id,
        "role_in_dept": membership.role_in_dept,
        "is_active": membership.is_active,
    }

@router.get("/slas")
def list_department_slas(user: User = Depends(staff_user), db: Session = Depends(get_db)):
    q = select(DepartmentSLA)
    if user.role != "platform_admin":
        dept_ids = authorized_department_ids(db, user)
        q = q.where(DepartmentSLA.department_id.in_(dept_ids or {"none"}))
    rows = db.scalars(q.order_by(DepartmentSLA.department_id, DepartmentSLA.category)).all()
    return [
        {
            "id": row.id,
            "department_id": row.department_id,
            "department_name": row.department.name if row.department else None,
            "category": row.category,
            "resolution_hours": row.resolution_hours,
        }
        for row in rows
    ]

@router.put("/slas")
def upsert_department_sla(
    body: DepartmentSLAIn,
    user: User = Depends(staff_user),
    db: Session = Depends(get_db),
):
    department = db.get(Department, body.department_id)
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    if not can_manage_department(db, user, department.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot manage this department's SLAs")

    category = body.category.strip().lower()
    row = db.scalar(
        select(DepartmentSLA).where(
            DepartmentSLA.department_id == department.id,
            DepartmentSLA.category == category,
        )
    )
    if row:
        row.resolution_hours = body.resolution_hours
    else:
        row = DepartmentSLA(
            department_id=department.id,
            category=category,
            resolution_hours=body.resolution_hours,
        )
        db.add(row)
    open_complaints = db.scalars(
        select(Complaint).where(
            Complaint.department_id == department.id,
            Complaint.category == category,
            Complaint.status.notin_(("resolved", "closed", "rejected")),
        )
    ).all()
    for complaint in open_complaints:
        complaint.resolution_due_at = complaint.created_at + timedelta(hours=body.resolution_hours)
    db.commit()
    log_audit_event(
        db,
        action="DEPARTMENT_SLA_UPDATED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="department_sla",
        resource_id=row.id,
        details=f"{category}: {body.resolution_hours} hours in {department.name}",
    )
    return {
        "id": row.id,
        "department_id": row.department_id,
        "department_name": department.name,
        "category": row.category,
        "resolution_hours": row.resolution_hours,
    }

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(staff_user),
    db: Session = Depends(get_db)
):
    query = select(AuditEvent)
    if user.role != "platform_admin":
        dept_ids = {
            dept_id for dept_id in authorized_department_ids(db, user)
            if can_manage_department(db, user, dept_id)
        }
        if not dept_ids:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Department audit access required")
        complaint_ids = db.scalars(
            select(Complaint.id).where(Complaint.department_id.in_(dept_ids))
        ).all()
        document_ids = db.scalars(
            select(Document.id).where(Document.department_id.in_(dept_ids))
        ).all()
        staff_ids = db.scalars(
            select(DepartmentMembership.user_id).where(
                DepartmentMembership.department_id.in_(dept_ids),
                DepartmentMembership.is_active.is_(True),
            )
        ).all()
        query = query.where(or_(
            (AuditEvent.resource_type == "department") & AuditEvent.resource_id.in_(dept_ids),
            (AuditEvent.resource_type == "complaint") & AuditEvent.resource_id.in_(complaint_ids or {"none"}),
            (AuditEvent.resource_type == "document") & AuditEvent.resource_id.in_(document_ids or {"none"}),
            AuditEvent.actor_id.in_(staff_ids or {"none"}),
        ))
    logs = db.scalars(
        query.order_by(AuditEvent.created_at.desc()).limit(limit)
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
