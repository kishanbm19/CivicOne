import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, Boolean, DateTime, UniqueConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .core.database import Base

def uid() -> str:
    return str(uuid.uuid4())

def now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150))
    # Roles: citizen | staff | dept_admin | platform_admin
    role: Mapped[str] = mapped_column(String(30), default="citizen", index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    memberships: Mapped[list["DepartmentMembership"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    domain: Mapped[str] = mapped_column(String(20), index=True)  # transport | municipal | healthcare
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    departments: Mapped[list["Department"]] = relationship(back_populates="organization", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    category_key: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    organization: Mapped[Organization] = relationship(back_populates="departments")
    memberships: Mapped[list["DepartmentMembership"]] = relationship(back_populates="department", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

class DepartmentMembership(Base):
    __tablename__ = "department_memberships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), index=True)
    role_in_dept: Mapped[str] = mapped_column(String(30), default="staff")  # staff | lead | supervisor
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(back_populates="memberships")
    department: Mapped[Department] = relationship(back_populates="memberships")
    __table_args__ = (UniqueConstraint("user_id", "department_id"),)

class Complaint(Base):
    __tablename__ = "complaints"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    reference: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    citizen_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    domain: Mapped[str] = mapped_column(String(20), index=True)  # transport | municipal | healthcare
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), index=True)
    address: Mapped[str] = mapped_column(String(300))  # strictly manual entry; no GPS
    locality: Mapped[str | None] = mapped_column(String(150), nullable=True)
    priority: Mapped[str] = mapped_column(String(15), default="medium", index=True)  # low | medium | high | critical
    # Statuses: submitted | classified | assigned | acknowledged | in_progress | on_hold | resolved | closed | reopened
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    assigned_to_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    classified_by: Mapped[str] = mapped_column(String(20), default="fallback")  # ai | fallback | human
    ai_confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    citizen: Mapped[User] = relationship(foreign_keys=[citizen_id])
    department: Mapped[Department | None] = relationship(foreign_keys=[department_id])
    assigned_staff: Mapped[User | None] = relationship(foreign_keys=[assigned_to_user_id])
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="complaint", cascade="all, delete-orphan", order_by="StatusHistory.created_at")
    internal_notes: Mapped[list["ComplaintInternalNote"]] = relationship(back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintInternalNote.created_at")

class StatusHistory(Base):
    __tablename__ = "complaint_status_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), index=True)
    previous_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    citizen_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    complaint: Mapped[Complaint] = relationship(back_populates="history")
    actor: Mapped[User] = relationship(foreign_keys=[actor_id])

class ComplaintInternalNote(Base):
    __tablename__ = "complaint_internal_notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    note: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    complaint: Mapped[Complaint] = relationship(back_populates="internal_notes")
    author: Mapped[User] = relationship(foreign_keys=[author_id])

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_domain: Mapped[str] = mapped_column(String(20), index=True)  # transport | municipal | healthcare
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), default="announcement")  # announcement | notice | infrastructure | advisory
    # status: draft | review | approved | published | archived
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    publication_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    author: Mapped[User] = relationship(foreign_keys=[author_id])
    department: Mapped[Department | None] = relationship(foreign_keys=[department_id])

class ConsentGrant(Base):
    __tablename__ = "consent_grants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    recipient_organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    data_scope: Mapped[str] = mapped_column(String(100))  # e.g. "profile,complaint_history,healthcare_mock_records"
    purpose: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active | revoked | expired
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    organization: Mapped[Organization] = relationship(foreign_keys=[recipient_organization_id])

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_type: Mapped[str] = mapped_column(String(50), default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(back_populates="notifications")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)

class HealthcareFacility(Base):
    __tablename__ = "healthcare_facilities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(200))
    facility_type: Mapped[str] = mapped_column(String(50))  # Hospital | PHC | Clinic | Mobile Unit
    address: Mapped[str] = mapped_column(String(300))
    locality: Mapped[str] = mapped_column(String(100))
    contact_phone: Mapped[str] = mapped_column(String(25))
    services_offered: Mapped[str] = mapped_column(Text)
    timings: Mapped[str] = mapped_column(String(100), default="24/7 or 8 AM - 8 PM")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AppointmentRequest(Base):
    __tablename__ = "appointment_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    facility_id: Mapped[str] = mapped_column(ForeignKey("healthcare_facilities.id"), index=True)
    department_name: Mapped[str] = mapped_column(String(100))
    appointment_date: Mapped[str] = mapped_column(String(20))
    time_slot: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="requested")  # requested | confirmed | completed | cancelled
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    facility: Mapped[HealthcareFacility] = relationship(foreign_keys=[facility_id])

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RefreshSession(Base):
    __tablename__ = "refresh_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
