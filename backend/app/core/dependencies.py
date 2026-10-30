from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from .security import decode_access_token
from ..models import User, DepartmentMembership, Department

bearer = HTTPBearer(auto_error=False)

def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication credentials were not provided")
    uid = decode_access_token(cred.credentials)
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User account is inactive or not found")
    return user

def staff_user(user: User = Depends(current_user)) -> User:
    if user.role == "citizen":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Government staff credentials required")
    return user

def dept_admin_user(user: User = Depends(current_user)) -> User:
    if user.role not in ("dept_admin", "platform_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Department administrator privileges required")
    return user

def platform_admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "platform_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform administrator privileges required")
    return user

def authorized_department_ids(db: Session, user: User) -> set[str]:
    """Returns set of department IDs the user is authorized to manage or view."""
    if user.role == "platform_admin":
        # Platform admin has access across all departments
        all_ids = db.scalars(select(Department.id)).all()
        return set(all_ids)
    rows = db.scalars(
        select(DepartmentMembership.department_id).where(
            DepartmentMembership.user_id == user.id,
            DepartmentMembership.is_active.is_(True)
        )
    ).all()
    return set(rows)

def department_role(db: Session, user: User, department_id: str) -> str | None:
    if user.role == "platform_admin":
        return "platform_admin"
    if department_id not in authorized_department_ids(db, user):
        return None
    if user.role == "dept_admin":
        return "department_admin"
    return db.scalar(
        select(DepartmentMembership.role_in_dept).where(
            DepartmentMembership.user_id == user.id,
            DepartmentMembership.department_id == department_id,
            DepartmentMembership.is_active.is_(True)
        )
    )

def can_manage_department(db: Session, user: User, department_id: str) -> bool:
    return department_role(db, user, department_id) in {
        "platform_admin", "department_admin", "dept_admin", "admin", "supervisor", "lead"
    }

def can_publish_for_department(db: Session, user: User, department_id: str) -> bool:
    return department_role(db, user, department_id) in {
        "platform_admin", "department_admin", "dept_admin", "admin",
        "public_information_officer", "information_officer"
    }

def authorized_organization_ids(db: Session, user: User) -> set[str]:
    """Returns set of organization IDs the user is authorized to access."""
    if user.role == "platform_admin":
        return set()
    dept_ids = authorized_department_ids(db, user)
    if not dept_ids:
        return set()
    org_ids = db.scalars(
        select(Department.organization_id).where(Department.id.in_(dept_ids))
    ).all()
    return set(org_ids)
