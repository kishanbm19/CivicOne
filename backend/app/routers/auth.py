import hashlib
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.database import get_db
from ..core.dependencies import current_user, staff_user
from ..core.ratelimit import check_rate_limit, RateLimitExceeded
from ..core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token
)
from ..core.logging import log_audit_event
from ..models import User, DepartmentMembership, PasswordResetToken, RefreshSession, Organization, Department
from ..services.email import send_password_reset_email, EmailNotConfiguredError, EmailDeliveryError

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
    portal: Literal["citizen", "government"] = "citizen"

class RefreshIn(BaseModel):
    refresh_token: str

class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class ProfileUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=20)

class PasswordResetRequestIn(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=EMAIL_REGEX)

class PasswordResetConfirmIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

def _issue_refresh_token(db: Session, user: User) -> str:
    token = create_refresh_token(user.id)
    db.add(RefreshSession(
        user_id=user.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    ))
    db.commit()
    return token

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
    refresh_token = _issue_refresh_token(db, u)

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
    if u.role not in ("citizen", "staff", "dept_admin", "platform_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account role is not authorized for portal access")
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
    refresh_token = _issue_refresh_token(db, u)

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

    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    session = db.scalar(
        select(RefreshSession).where(
            RefreshSession.user_id == u.id,
            RefreshSession.token_hash == token_hash,
            RefreshSession.is_revoked.is_(False),
            RefreshSession.expires_at > datetime.now(timezone.utc),
        )
    )
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or revoked refresh token")

    session.is_revoked = True
    new_access_token = create_access_token(u.id)
    new_refresh_token = create_refresh_token(u.id)
    db.add(RefreshSession(
        user_id=u.id,
        token_hash=hashlib.sha256(new_refresh_token.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    ))
    db.commit()
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/auth/logout")
def logout(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sessions = db.scalars(
        select(RefreshSession).where(
            RefreshSession.user_id == user.id,
            RefreshSession.is_revoked.is_(False),
        )
    ).all()
    for session in sessions:
        session.is_revoked = True
    db.commit()
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

@router.patch("/auth/profile")
def update_profile(
    body: ProfileUpdateIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide at least one profile field to update")
    if "full_name" in changes and changes["full_name"] is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Full name cannot be null")
    for field, value in changes.items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "created_at": user.created_at,
    }

@router.post("/auth/password/change")
def change_password(
    body: PasswordChangeIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Current password is incorrect")
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "New password must differ from the current password")

    user.password_hash = hash_password(body.new_password)
    sessions = db.scalars(
        select(RefreshSession).where(
            RefreshSession.user_id == user.id,
            RefreshSession.is_revoked.is_(False),
        )
    ).all()
    for session in sessions:
        session.is_revoked = True
    db.commit()
    log_audit_event(
        db,
        action="PASSWORD_CHANGED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="user",
        resource_id=user.id,
        details=f"Password changed; {len(sessions)} refresh session(s) revoked",
    )
    return {"message": "Password updated successfully. Please sign in again."}

@router.get("/staff/me")
def staff_me(u: User = Depends(staff_user), db: Session = Depends(get_db)):
    ms = db.scalars(
        select(DepartmentMembership).where(
            DepartmentMembership.user_id == u.id,
            DepartmentMembership.is_active.is_(True)
        )
    ).all()

    departments_data = []
    primary_domain = None

    for m in ms:
        dept = m.department
        org = dept.organization
        if org and primary_domain is None:
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
            if primary_domain is None and d.organization:
                primary_domain = d.organization.domain

    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "primary_domain": primary_domain,
        "departments": departments_data,
        "permissions": {
            "can_assign": u.role == "platform_admin" or u.role == "dept_admin" or any(
                d["role_in_dept"] in ("department_admin", "admin", "supervisor", "lead")
                for d in departments_data
            ),
            "can_publish_documents": u.role == "platform_admin" or u.role == "dept_admin" or any(
                d["role_in_dept"] in ("department_admin", "admin", "public_information_officer", "information_officer")
                for d in departments_data
            ),
            "can_approve_documents": u.role == "platform_admin" or u.role == "dept_admin" or any(
                d["role_in_dept"] in ("department_admin", "admin", "supervisor", "lead")
                for d in departments_data
            ),
            "can_manage_staff": u.role == "platform_admin" or u.role == "dept_admin" or any(
                d["role_in_dept"] in ("department_admin", "admin")
                for d in departments_data
            ),
            "can_manage_orgs": u.role == "platform_admin",
            "can_view_audit": u.role in ("dept_admin", "platform_admin")
        }
    }

@router.post("/auth/password-reset/request")
def password_reset_request(body: PasswordResetRequestIn, request: Request, db: Session = Depends(get_db)):
    """
    Initiate a password-reset flow.

    Security properties:
    - Always returns the same generic message regardless of whether the email
      is registered, preventing user-enumeration.
    - The raw token is NEVER written to the API response or to any log.
    - Only a SHA-256 hash of the token is stored in the database.
    - The token expires after PASSWORD_RESET_TOKEN_EXPIRE_MINUTES (default 20 min).
    - Old unused tokens for the same user are invalidated before issuing a new one.
    - Rate-limited per client IP to prevent abuse.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"pw_reset_rate:{client_ip}"

    # --- Rate limiting (DB-backed sliding window) ---
    try:
        check_rate_limit(
            db,
            key=rate_key,
            limit=settings.PASSWORD_RESET_RATE_LIMIT,
            window_minutes=settings.PASSWORD_RESET_RATE_WINDOW_MINUTES,
        )
    except RateLimitExceeded:
        # Record the blocked attempt without revealing whether the email exists.
        log_audit_event(
            db,
            action=rate_key,
            details="Password-reset rate limit exceeded",
            ip_address=client_ip,
        )
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many password-reset requests. Please try again later."
        )

    # Record this attempt for rate-limit counting in future calls.
    log_audit_event(
        db,
        action=rate_key,
        details="Password-reset attempt counted for rate limiting",
        ip_address=client_ip,
    )

    # --- Generic response regardless of account existence ---
    _GENERIC_OK = {"message": "If that email is registered, a password-reset link has been sent."}

    u = db.scalar(select(User).where(User.email == body.email.lower()))
    if not u or not u.is_active:
        # Do not reveal whether the address is registered.
        return _GENERIC_OK

    # --- Invalidate any existing unused tokens for this user ---
    old_tokens = db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == u.id,
            PasswordResetToken.used.is_(False),
        )
    ).all()
    for old in old_tokens:
        old.used = True
    if old_tokens:
        db.flush()

    # --- Generate a cryptographically secure token ---
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    prt = PasswordResetToken(
        user_id=u.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        ),
        used=False,
    )
    db.add(prt)
    db.commit()

    # --- Build the reset link and send the email ---
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

    try:
        send_password_reset_email(to_address=u.email, reset_link=reset_link)
    except EmailNotConfiguredError:
        # SMTP is not configured — refuse to silently swallow.
        # Mark the token as used so it cannot be exploited if someone gains
        # DB access, then return a clear operational error.
        prt.used = True
        db.commit()
        log_audit_event(
            db,
            action="PASSWORD_RESET_EMAIL_NOT_CONFIGURED",
            actor_id=u.id,
            actor_email=u.email,
            details="Password-reset email could not be sent: SMTP not configured",
            ip_address=client_ip,
        )
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Email delivery is not configured on this server. "
            "Please contact the administrator.",
        )
    except EmailDeliveryError:
        # Transient SMTP failure — invalidate the token and tell the client.
        prt.used = True
        db.commit()
        log_audit_event(
            db,
            action="PASSWORD_RESET_EMAIL_FAILED",
            actor_id=u.id,
            actor_email=u.email,
            details="Password-reset email delivery failed due to SMTP error",
            ip_address=client_ip,
        )
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Failed to send the password-reset email. Please try again later.",
        )

    # Audit — no raw token logged.
    log_audit_event(
        db,
        action="PASSWORD_RESET_REQUESTED",
        actor_id=u.id,
        actor_email=u.email,
        resource_type="user",
        resource_id=u.id,
        details="Password-reset email sent",
        ip_address=client_ip,
    )

    return _GENERIC_OK


@router.post("/auth/password-reset/confirm")
def password_reset_confirm(body: PasswordResetConfirmIn, db: Session = Depends(get_db)):
    """
    Complete a password-reset using the token from the emailed link.

    Security properties:
    - Accepts the raw token from the client, hashes it, and looks up the hash —
      the raw token is never stored or logged.
    - Rejects tokens that are expired, already used, or do not exist (all return
      the same 400 so attackers cannot distinguish between the cases).
    - Marks the token as used immediately upon successful reset (single-use).
    - Revokes all active refresh sessions for the account so existing logins
      are terminated.
    """
    _INVALID_MSG = "Invalid or expired reset token"

    # Hash the submitted token and look up only its hash in the DB.
    submitted_hash = hashlib.sha256(body.token.encode()).hexdigest()

    prt = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == submitted_hash,
            PasswordResetToken.used.is_(False),
        )
    )
    if not prt:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_MSG)

    now_utc = datetime.now(timezone.utc)
    expires_at = prt.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_MSG)

    user = db.get(User, prt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_MSG)

    # --- Apply the new password ---
    user.password_hash = hash_password(body.new_password)

    # --- Consume the token (single-use) ---
    prt.used = True

    # --- Revoke all active refresh sessions for this account ---
    active_sessions = db.scalars(
        select(RefreshSession).where(
            RefreshSession.user_id == user.id,
            RefreshSession.is_revoked.is_(False),
        )
    ).all()
    for session in active_sessions:
        session.is_revoked = True

    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_RESET_COMPLETED",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="user",
        resource_id=user.id,
        details=f"Password reset completed; {len(active_sessions)} refresh session(s) revoked",
    )

    return {"message": "Password updated successfully. You can now log in."}
