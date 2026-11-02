import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
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
    role: Mapped[str] = mapped_column(String(30), default="citizen", index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    memberships: Mapped[list["DepartmentMembership"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    organization: Mapped["Organization | None"] = relationship(
        back_populates="administrators"
    )
    __table_args__ = (
        CheckConstraint(
            "role IN ('citizen', 'staff', 'org_admin', 'platform_admin')",
            name="ck_users_role",
        ),
        CheckConstraint(
            "role != 'org_admin' OR organization_id IS NOT NULL",
            name="ck_users_org_admin_organization",
        ),
        Index("uq_users_email_lower", func.lower(email), unique=True),
    )

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    domain: Mapped[str] = mapped_column(String(20), index=True)  # transport | municipal | healthcare
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    departments: Mapped[list["Department"]] = relationship(back_populates="organization")
    administrators: Mapped[list[User]] = relationship(back_populates="organization")
    __table_args__ = (
        UniqueConstraint("id", "domain", name="uq_organizations_id_domain"),
        CheckConstraint(
            "domain IN ('transport', 'municipal', 'healthcare')",
            name="ck_organizations_domain",
        ),
    )

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String(150))
    category_key: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    organization: Mapped[Organization] = relationship(back_populates="departments")
    memberships: Mapped[list["DepartmentMembership"]] = relationship(back_populates="department")
    __table_args__ = (
        UniqueConstraint("organization_id", "name"),
        UniqueConstraint("id", "organization_id", name="uq_departments_id_organization"),
    )

class DepartmentMembership(Base):
    __tablename__ = "department_memberships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    department_id: Mapped[str] = mapped_column(
        ForeignKey("departments.id"), index=True
    )
    role_in_dept: Mapped[str] = mapped_column(String(30), default="staff")  # staff | lead | supervisor
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    user: Mapped[User] = relationship(back_populates="memberships")
    department: Mapped[Department] = relationship(back_populates="memberships")
    __table_args__ = (
        UniqueConstraint("user_id", "department_id"),
        CheckConstraint(
            "role_in_dept IN ('staff', 'lead', 'supervisor', 'department_admin', "
            "'admin', 'public_information_officer', 'information_officer')",
            name="ck_department_memberships_role",
        ),
    )

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
    # Statuses: submitted | classified | assigned | acknowledged | in_progress | on_hold | resolved | closed | reopened | rejected
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    assigned_to_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    classified_by: Mapped[str] = mapped_column(String(20), default="fallback")  # ai | fallback | human
    ai_confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    citizen: Mapped[User] = relationship(foreign_keys=[citizen_id])
    organization: Mapped[Organization | None] = relationship(foreign_keys=[organization_id])
    department: Mapped[Department | None] = relationship(foreign_keys=[department_id])
    assigned_staff: Mapped[User | None] = relationship(foreign_keys=[assigned_to_user_id])
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="complaint", order_by="StatusHistory.created_at")
    internal_notes: Mapped[list["ComplaintInternalNote"]] = relationship(back_populates="complaint", order_by="ComplaintInternalNote.created_at")
    activities: Mapped[list["ComplaintActivity"]] = relationship(back_populates="complaint", order_by="ComplaintActivity.created_at")
    evidence: Mapped[list["ComplaintEvidence"]] = relationship(back_populates="complaint", order_by="ComplaintEvidence.created_at")
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "domain"],
            ["organizations.id", "organizations.domain"],
            name="fk_complaints_organization_domain",
        ),
        ForeignKeyConstraint(
            ["department_id", "organization_id"],
            ["departments.id", "departments.organization_id"],
            name="fk_complaints_department_organization",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'critical')",
            name="ck_complaints_priority",
        ),
        CheckConstraint(
            "domain IN ('transport', 'municipal', 'healthcare')",
            name="ck_complaints_domain",
        ),
        CheckConstraint(
            "status IN ('submitted', 'classified', 'assigned', 'acknowledged', "
            "'in_progress', 'on_hold', 'resolved', 'closed', 'reopened', 'rejected')",
            name="ck_complaints_status",
        ),
        Index("ix_complaints_organization_status", "organization_id", "status"),
        Index("ix_complaints_department_status", "department_id", "status"),
    )

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

class ComplaintActivity(Base):
    __tablename__ = "complaint_activities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    summary: Mapped[str] = mapped_column(Text)
    citizen_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    complaint: Mapped[Complaint] = relationship(back_populates="activities")
    actor: Mapped[User] = relationship(foreign_keys=[actor_id])

class ComplaintEvidence(Base):
    __tablename__ = "complaint_evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    complaint_id: Mapped[str] = mapped_column(ForeignKey("complaints.id"), index=True)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    file_path: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    citizen_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    complaint: Mapped[Complaint] = relationship(back_populates="evidence")
    uploaded_by: Mapped[User] = relationship(foreign_keys=[uploaded_by_id])

class DepartmentSLA(Base):
    __tablename__ = "department_slas"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    category: Mapped[str] = mapped_column(String(50), index=True)
    resolution_hours: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    department: Mapped[Department] = relationship()
    __table_args__ = (
        UniqueConstraint("department_id", "category"),
        CheckConstraint("resolution_hours > 0", name="ck_department_slas_resolution_hours"),
    )

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
    review_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    publication_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    target_type: Mapped[str] = mapped_column(String(20), default="domain")
    target_department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    announcement_notifications_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    # Stores a SHA-256 hex digest of the raw token; the raw token is never persisted.
    token_hash: Mapped[str] = mapped_column("token", String(100), unique=True, index=True)
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
