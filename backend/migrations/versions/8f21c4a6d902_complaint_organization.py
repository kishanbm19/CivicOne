"""persist selected organization for pending complaint routing

Revision ID: 8f21c4a6d902
Revises: 3a7f61c2d904
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f21c4a6d902"
down_revision: Union[str, None] = "3a7f61c2d904"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {
        column["name"] for column in inspector.get_columns("complaints")
    }
    if "organization_id" not in columns:
        with op.batch_alter_table("complaints") as batch_op:
            batch_op.add_column(
                sa.Column("organization_id", sa.String(length=36), nullable=True)
            )
            batch_op.create_foreign_key(
                "fk_complaints_organization_id_organizations",
                "organizations",
                ["organization_id"],
                ["id"],
            )
    foreign_keys = inspector.get_foreign_keys("complaints")
    if not any(
        foreign_key["constrained_columns"] == ["organization_id"]
        and foreign_key["referred_table"] == "organizations"
        for foreign_key in foreign_keys
    ):
        with op.batch_alter_table("complaints") as batch_op:
            batch_op.create_foreign_key(
                "fk_complaints_organization_id_organizations",
                "organizations",
                ["organization_id"],
                ["id"],
            )
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("complaints")}
    if "ix_complaints_organization_id" not in indexes:
        op.create_index(
            "ix_complaints_organization_id", "complaints", ["organization_id"]
        )

    bind.execute(
        sa.text(
            """
            UPDATE complaints
            SET organization_id = (
                SELECT departments.organization_id
                FROM departments
                WHERE departments.id = complaints.department_id
            )
            WHERE organization_id IS NULL AND department_id IS NOT NULL
            """
        )
    )
    organizations = bind.execute(
        sa.text("SELECT id, domain FROM organizations ORDER BY id")
    ).all()
    by_domain: dict[str, list[str]] = {}
    for organization_id, domain in organizations:
        by_domain.setdefault(domain, []).append(organization_id)
    for domain, organization_ids in by_domain.items():
        if len(organization_ids) == 1:
            bind.execute(
                sa.text(
                    """
                    UPDATE complaints
                    SET organization_id = :organization_id
                    WHERE organization_id IS NULL AND domain = :domain
                    """
                ),
                {"organization_id": organization_ids[0], "domain": domain},
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {
        column["name"] for column in inspector.get_columns("complaints")
    }
    if "organization_id" in columns:
        indexes = {index["name"] for index in inspector.get_indexes("complaints")}
        if "ix_complaints_organization_id" in indexes:
            op.drop_index("ix_complaints_organization_id", table_name="complaints")
        for foreign_key in inspector.get_foreign_keys("complaints"):
            if foreign_key["constrained_columns"] == ["organization_id"]:
                with op.batch_alter_table("complaints") as batch_op:
                    batch_op.drop_constraint(foreign_key["name"], type_="foreignkey")
        with op.batch_alter_table("complaints") as batch_op:
            batch_op.drop_column("organization_id")
