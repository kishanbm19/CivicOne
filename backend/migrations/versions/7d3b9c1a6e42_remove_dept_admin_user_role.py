"""remove deprecated department administrator user role

Revision ID: 7d3b9c1a6e42
Revises: c4d8a1f260b7
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7d3b9c1a6e42"
down_revision: Union[str, None] = "c4d8a1f260b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    legacy_accounts = bind.execute(
        sa.text("SELECT count(*) FROM users WHERE role = 'dept_admin'")
    ).scalar_one()
    if legacy_accounts:
        raise RuntimeError(
            "Cannot remove dept_admin from the user-role constraint while "
            f"{legacy_accounts} such account(s) remain. Reassign them to staff "
            "with department memberships or to org_admin with an organization "
            "assignment, then retry."
        )

    checks = {
        item["name"] for item in sa.inspect(bind).get_check_constraints("users")
    }
    with op.batch_alter_table("users") as batch_op:
        if "ck_users_role" in checks:
            batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('citizen', 'staff', 'org_admin', 'platform_admin')",
        )


def downgrade() -> None:
    checks = {
        item["name"]
        for item in sa.inspect(op.get_bind()).get_check_constraints("users")
    }
    with op.batch_alter_table("users") as batch_op:
        if "ck_users_role" in checks:
            batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('citizen', 'staff', 'dept_admin', 'org_admin', 'platform_admin')",
        )
