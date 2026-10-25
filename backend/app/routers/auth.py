import uuid
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import current_user, staff_user
from ..core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token
)
from ..core.logging import log_audit_event
from ..models import User, DepartmentMembership, PasswordResetToken, RefreshSession, Organization, Department

router = APIRouter(prefix="/api/v1", tags=["auth"])

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_REGEX)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None

class LoginIn(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_REGEX)
    password: str
    portal: str = "citizen"  # citizen | government

class RefreshIn(BaseModel):
    refresh_token: str

class PasswordResetRequestIn(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_REGEX)

class PasswordResetConfirmIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

@router.post("/auth/register", status_code=201)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    u = User(
        email=body.email.lower(),
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        phone=body.phone,
        role="citizen"  # Registration strictly provisions citizen accounts only
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    log_audit_event(
        db,
        action="USER_REGISTRATION",
        actor_id=u.id,
        actor_email=u.email,
        resource_type="user",
        resource_id=u.id,
        details="Citizen account self-registered",
        ip_address=request.client.host if request.client else None
    )

    access_token = create_access_token(u.id)
    refresh_token = create_refresh_token(u.id)

    return {
        "user": {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role},
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/auth/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.lower()))
    if not u or not u.is_active or not verify_password(body.password, u.password_hash):
        log_audit_event(
            db,
            action="LOGIN_FAILURE",
            actor_email=body.email,
            details=f"Invalid credentials on {body.portal} portal",
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    # Portal isolation enforcement
    is_staff_or_admin = u.role in ("staff", "dept_admin", "platform_admin")
    if body.portal == "government" and not is_staff_or_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Access denied: This portal is strictly for authorized government staff."
        )
    if body.portal == "citizen" and is_staff_or_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Government staff must sign in through the Government Portal."
        )

    access_token = create_access_token(u.id)
    refresh_token = create_refresh_token(u.id)

    log_audit_event(
        db,
        action="LOGIN_SUCCESS",
        actor_id=u.id,
        actor_email=u.email,
        resource_type="user",
        resource_id=u.id,
        details=f"Successful login on {body.portal} portal",
        ip_address=request.client.host if request.client else None
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "phone": u.phone
        }
    }

@router.post("/auth/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    uid = decode_refresh_token(body.refresh_token)
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    u = db.get(User, uid)
    if not u or not u.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User account is inactive or not found")

    new_access_token = create_access_token(u.id)
    new_refresh_token = create_refresh_token(u.id)
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/auth/logout")
def logout(user: User = Depends(current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db,
        action="LOGOUT",
        actor_id=user.id,
        actor_email=user.email,
        details="User logged out"
    )
    return {"message": "Successfully logged out"}

@router.get("/auth/me")
def me(u: User = Depends(current_user)):
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "phone": u.phone,
        "created_at": u.created_at
    }

@router.get("/staff/me")
def staff_me(u: User = Depends(staff_user), db: Session = Depends(get_db)):
    ms = db.scalars(
        select(DepartmentMembership).where(
            DepartmentMembership.user_id == u.id,
            DepartmentMembership.is_active.is_(True)
        )
    ).all()

    departments_data = []
    primary_domain = "transport"

    for m in ms:
        dept = m.department
        org = dept.organization
        if org:
            primary_domain = org.domain
        departments_data.append({
            "id": dept.id,
            "name": dept.name,
            "category_key": dept.category_key,
            "role_in_dept": m.role_in_dept,
            "organization_id": dept.organization_id,
            "organization_name": org.name if org else None,
            "organization_domain": org.domain if org else None
        })

    # If platform_admin and no explicit dept membership, load all
    if u.role == "platform_admin" and not departments_data:
        all_depts = db.scalars(select(Department)).all()
        for d in all_depts:
            departments_data.append({
                "id": d.id,
                "name": d.name,
                "category_key": d.category_key,
                "role_in_dept": "admin",
                "organization_id": d.organization_id,
                "organization_name": d.organization.name if d.organization else None,
                "organization_domain": d.organization.domain if d.organization else None
            })
        primary_domain = "municipal"

    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "primary_domain": primary_domain,
        "departments": departments_data,
        "permissions": {
            "can_assign": u.role in ("dept_admin", "platform_admin", "staff"),
            "can_publish_documents": u.role in ("dept_admin", "platform_admin"),
            "can_manage_staff": u.role in ("dept_admin", "platform_admin"),
            "can_manage_orgs": u.role == "platform_admin",
            "can_view_audit": u.role in ("dept_admin", "platform_admin")
        }
    }

@router.post("/auth/password-reset/request")
def password_reset_request(body: PasswordResetRequestIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == body.email.lower()))
    if u:
        token = secrets.token_urlsafe(32)
        prt = PasswordResetToken(
            user_id=u.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
            used=False
        )
        db.add(prt)
        db.commit()
        log_audit_event(
            db,
            action="PASSWORD_RESET_REQUESTED",
            actor_id=u.id,
            actor_email=u.email,
            details=f"Token generated (demo token: {token})"
        )
        return {"message": "Password reset instructions have been generated.", "demo_token": token}
    return {"message": "If the email is registered, instructions have been generated."}

@router.post("/auth/password-reset/confirm")
def password_reset_confirm(body: PasswordResetConfirmIn, db: Session = Depends(get_db)):
    prt = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token == body.token,
            PasswordResetToken.used.is_(False)
        )
    )
    if not prt:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")

    now_utc = datetime.now(timezone.utc)
    expires_at = prt.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset token has expired")

    user = db.get(User, prt.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User account not found")

    user.password_hash = hash_password(body.new_password)
    prt.used = True
    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_RESET_COMPLETED",
        actor_id=user.id,
        actor_email=user.email,
        details="User password successfully reset"
    )
    return {"message": "Password updated successfully. You can now log in."}
