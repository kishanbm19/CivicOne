"""government operations workflow fields

Revision ID: 3a7f61c2d904
Revises: ed061c8798e9
Create Date: 2026-10-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.core.database import Base
from app import models  # noqa: F401


revision: str = "3a7f61c2d904"
down_revision: Union[str, None] = "ed061c8798e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("complaints") or not inspector.has_table("documents"):
        Base.metadata.create_all(bind=bind, checkfirst=True)
        return

    def add_column_if_missing(table: str, column: sa.Column) -> None:
        columns = {item["name"] for item in sa.inspect(bind).get_columns(table)}
        if column.name not in columns:
            op.add_column(table, column)

    def create_index_if_missing(name: str, table: str, columns: list[str]) -> None:
        indexes = {item["name"] for item in sa.inspect(bind).get_indexes(table)}
        if name not in indexes:
            op.create_index(name, table, columns)

    add_column_if_missing(
        "complaints",
        sa.Column("resolution_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    add_column_if_missing(
        "complaints", sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True)
    )
    create_index_if_missing(
        "ix_complaints_resolution_due_at", "complaints", ["resolution_due_at"]
    )

    for column in (
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_feedback", sa.Text(), nullable=True),
        sa.Column(
            "target_type", sa.String(length=20), nullable=False, server_default="domain"
        ),
        sa.Column("target_department_id", sa.String(length=36), nullable=True),
        sa.Column(
            "announcement_notifications_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    ):
        add_column_if_missing("documents", column)

    create_index_if_missing(
        "ix_documents_target_department_id", "documents", ["target_department_id"]
    )
    target_department_fk_exists = any(
        foreign_key["constrained_columns"] == ["target_department_id"]
        and foreign_key["referred_table"] == "departments"
        for foreign_key in sa.inspect(bind).get_foreign_keys("documents")
    )
    if not target_department_fk_exists:
        op.create_foreign_key(
            "fk_documents_target_department_id_departments",
            "documents",
            "departments",
            ["target_department_id"],
            ["id"],
        )

    if not sa.inspect(bind).has_table("complaint_activities"):
        op.create_table(
            "complaint_activities",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "complaint_id",
                sa.String(length=36),
                sa.ForeignKey("complaints.id"),
                nullable=False,
            ),
            sa.Column(
                "actor_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False
            ),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False),
            sa.Column("citizen_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
    for index_name, column in (
        ("ix_complaint_activities_complaint_id", "complaint_id"),
        ("ix_complaint_activities_actor_id", "actor_id"),
        ("ix_complaint_activities_action", "action"),
    ):
        create_index_if_missing(index_name, "complaint_activities", [column])

    if not sa.inspect(bind).has_table("complaint_evidence"):
        op.create_table(
            "complaint_evidence",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "complaint_id",
                sa.String(length=36),
                sa.ForeignKey("complaints.id"),
                nullable=False,
            ),
            sa.Column(
                "uploaded_by_id",
                sa.String(length=36),
                sa.ForeignKey("users.id"),
                nullable=False,
            ),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=False),
            sa.Column("citizen_visible", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
    for index_name, column in (
        ("ix_complaint_evidence_complaint_id", "complaint_id"),
        ("ix_complaint_evidence_uploaded_by_id", "uploaded_by_id"),
    ):
        create_index_if_missing(index_name, "complaint_evidence", [column])

    if not sa.inspect(bind).has_table("department_slas"):
        op.create_table(
            "department_slas",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "department_id",
                sa.String(length=36),
                sa.ForeignKey("departments.id"),
                nullable=False,
            ),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("resolution_hours", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint(
                "department_id", "category", name="uq_department_slas_department_id"
            ),
        )
    create_index_if_missing(
        "ix_department_slas_department_id", "department_slas", ["department_id"]
    )
    create_index_if_missing(
        "ix_department_slas_category", "department_slas", ["category"]
    )


def downgrade() -> None:
    op.drop_index("ix_department_slas_category", table_name="department_slas")
    op.drop_index("ix_department_slas_department_id", table_name="department_slas")
    op.drop_table("department_slas")
    op.drop_index("ix_complaint_evidence_uploaded_by_id", table_name="complaint_evidence")
    op.drop_index("ix_complaint_evidence_complaint_id", table_name="complaint_evidence")
    op.drop_table("complaint_evidence")
    op.drop_index("ix_complaint_activities_action", table_name="complaint_activities")
    op.drop_index("ix_complaint_activities_actor_id", table_name="complaint_activities")
    op.drop_index("ix_complaint_activities_complaint_id", table_name="complaint_activities")
    op.drop_table("complaint_activities")
    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_constraint(
            "fk_documents_target_department_id_departments", type_="foreignkey"
        )
    op.drop_column("documents", "announcement_notifications_sent_at")
    op.drop_index("ix_documents_target_department_id", table_name="documents")
    op.drop_column("documents", "target_department_id")
    op.drop_column("documents", "target_type")
    op.drop_column("documents", "scheduled_at")
    op.drop_column("documents", "review_feedback")
    op.drop_index("ix_complaints_resolution_due_at", table_name="complaints")
    op.drop_column("complaints", "escalated_at")
    op.drop_column("complaints", "resolution_due_at")
