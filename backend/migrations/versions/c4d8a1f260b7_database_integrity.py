"""enforce organization and complaint integrity constraints

Revision ID: c4d8a1f260b7
Revises: 8f21c4a6d902
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d8a1f260b7"
down_revision: Union[str, None] = "8f21c4a6d902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _assert_no_rows(query: str, message: str) -> None:
    if op.get_bind().execute(sa.text(query)).scalar_one():
        raise RuntimeError(message)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    _assert_no_rows(
        "SELECT count(*) FROM users WHERE role NOT IN "
        "('citizen', 'staff', 'dept_admin', 'org_admin', 'platform_admin')",
        "Unsupported user role found; resolve existing accounts before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM users WHERE role = 'org_admin' "
        "AND organization_id IS NULL",
        "An organization administrator has no organization assignment.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM users u LEFT JOIN organizations o "
        "ON o.id = u.organization_id "
        "WHERE u.organization_id IS NOT NULL AND o.id IS NULL",
        "A user references an unknown organization.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM users WHERE length(organization_id) > 36",
        "A user organization identifier exceeds the supported length.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM (SELECT lower(email) FROM users "
        "GROUP BY lower(email) HAVING count(*) > 1) duplicates",
        "Case-insensitive duplicate user emails must be resolved before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM complaints c "
        "LEFT JOIN users u ON u.id = c.citizen_id "
        "LEFT JOIN departments d ON d.id = c.department_id "
        "LEFT JOIN organizations o ON o.id = c.organization_id "
        "WHERE u.id IS NULL OR o.id IS NULL "
        "OR (c.department_id IS NOT NULL AND d.id IS NULL) "
        "OR c.domain <> o.domain "
        "OR (d.id IS NOT NULL AND d.organization_id <> c.organization_id)",
        "Complaint ownership, organization, domain, or department links are inconsistent.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM complaints WHERE priority NOT IN "
        "('low', 'medium', 'high', 'critical')",
        "Unsupported complaint priority found; resolve it before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM complaints WHERE status NOT IN "
        "('submitted', 'classified', 'assigned', 'acknowledged', 'in_progress', "
        "'on_hold', 'resolved', 'closed', 'reopened', 'rejected')",
        "Unsupported complaint status found; resolve it before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM organizations "
        "WHERE domain NOT IN ('transport', 'municipal', 'healthcare')",
        "Unsupported organization domain found; resolve it before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM department_memberships WHERE role_in_dept NOT IN "
        "('staff', 'lead', 'supervisor', 'department_admin', 'admin', "
        "'public_information_officer', 'information_officer')",
        "Unsupported department membership role found; resolve it before migration.",
    )
    _assert_no_rows(
        "SELECT count(*) FROM department_slas WHERE resolution_hours <= 0",
        "Non-positive SLA resolution target found; resolve it before migration.",
    )

    _assert_no_rows(
        "SELECT count(*) FROM complaints WHERE organization_id IS NULL",
        "Complaint organization backfill is incomplete; map remaining complaints "
        "before migration.",
    )

    inspector = sa.inspect(bind)
    user_org_column = next(
        item
        for item in inspector.get_columns("users")
        if item["name"] == "organization_id"
    )
    if user_org_column["type"].length != 36:
        op.alter_column(
            "users",
            "organization_id",
            existing_type=user_org_column["type"],
            type_=sa.String(length=36),
            existing_nullable=True,
            postgresql_using="organization_id::varchar(36)",
        )

    inspector = sa.inspect(bind)
    if not any(
        item["constrained_columns"] == ["organization_id"]
        and item["referred_table"] == "organizations"
        for item in inspector.get_foreign_keys("users")
    ):
        op.create_foreign_key(
            "fk_users_organization_id_organizations",
            "users",
            "organizations",
            ["organization_id"],
            ["id"],
        )

    user_indexes = {item["name"] for item in inspector.get_indexes("users")}
    if "ix_users_organization_id" not in user_indexes:
        op.create_index("ix_users_organization_id", "users", ["organization_id"])
    if "uq_users_email_lower" not in user_indexes:
        op.create_index(
            "uq_users_email_lower",
            "users",
            [sa.text("lower(email)")],
            unique=True,
        )

    inspector = sa.inspect(bind)
    organization_uniques = {
        tuple(item["column_names"])
        for item in inspector.get_unique_constraints("organizations")
    }
    if ("id", "domain") not in organization_uniques:
        op.create_unique_constraint(
            "uq_organizations_id_domain", "organizations", ["id", "domain"]
        )
    organization_checks = {
        item["name"] for item in inspector.get_check_constraints("organizations")
    }
    if "ck_organizations_domain" not in organization_checks:
        op.create_check_constraint(
            "ck_organizations_domain",
            "organizations",
            "domain IN ('transport', 'municipal', 'healthcare')",
        )

    inspector = sa.inspect(bind)
    department_uniques = {
        tuple(item["column_names"])
        for item in inspector.get_unique_constraints("departments")
    }
    if ("id", "organization_id") not in department_uniques:
        op.create_unique_constraint(
            "uq_departments_id_organization",
            "departments",
            ["id", "organization_id"],
        )

    inspector = sa.inspect(bind)
    complaint_columns = {
        item["name"]: item for item in inspector.get_columns("complaints")
    }
    if complaint_columns["organization_id"]["nullable"]:
        op.alter_column(
            "complaints",
            "organization_id",
            existing_type=sa.String(length=36),
            nullable=False,
        )
    complaint_fks = inspector.get_foreign_keys("complaints")
    if not any(
        item["constrained_columns"] == ["organization_id", "domain"]
        and item["referred_table"] == "organizations"
        for item in complaint_fks
    ):
        op.create_foreign_key(
            "fk_complaints_organization_domain",
            "complaints",
            "organizations",
            ["organization_id", "domain"],
            ["id", "domain"],
        )
    if not any(
        item["constrained_columns"] == ["department_id", "organization_id"]
        and item["referred_table"] == "departments"
        for item in complaint_fks
    ):
        op.create_foreign_key(
            "fk_complaints_department_organization",
            "complaints",
            "departments",
            ["department_id", "organization_id"],
            ["id", "organization_id"],
        )

    complaint_checks = {
        item["name"] for item in inspector.get_check_constraints("complaints")
    }
    checks = (
        (
            "ck_complaints_domain",
            "domain IN ('transport', 'municipal', 'healthcare')",
        ),
        (
            "ck_complaints_priority",
            "priority IN ('low', 'medium', 'high', 'critical')",
        ),
        (
            "ck_complaints_status",
            "status IN ('submitted', 'classified', 'assigned', 'acknowledged', "
            "'in_progress', 'on_hold', 'resolved', 'closed', 'reopened', 'rejected')",
        ),
    )
    for name, condition in checks:
        if name not in complaint_checks:
            op.create_check_constraint(name, "complaints", condition)

    inspector = sa.inspect(bind)
    user_checks = {
        item["name"] for item in inspector.get_check_constraints("users")
    }
    if "ck_users_role" not in user_checks:
        op.create_check_constraint(
            "ck_users_role",
            "users",
            "role IN ('citizen', 'staff', 'dept_admin', 'org_admin', 'platform_admin')",
        )
    if "ck_users_org_admin_organization" not in user_checks:
        op.create_check_constraint(
            "ck_users_org_admin_organization",
            "users",
            "role != 'org_admin' OR organization_id IS NOT NULL",
        )

    inspector = sa.inspect(bind)
    membership_checks = {
        item["name"]
        for item in inspector.get_check_constraints("department_memberships")
    }
    if "ck_department_memberships_role" not in membership_checks:
        op.create_check_constraint(
            "ck_department_memberships_role",
            "department_memberships",
            "role_in_dept IN ('staff', 'lead', 'supervisor', 'department_admin', "
            "'admin', 'public_information_officer', 'information_officer')",
        )

    inspector = sa.inspect(bind)
    sla_checks = {
        item["name"] for item in inspector.get_check_constraints("department_slas")
    }
    if "ck_department_slas_resolution_hours" not in sla_checks:
        op.create_check_constraint(
            "ck_department_slas_resolution_hours",
            "department_slas",
            "resolution_hours > 0",
        )

    inspector = sa.inspect(bind)
    complaint_indexes = {item["name"] for item in inspector.get_indexes("complaints")}
    if "ix_complaints_organization_status" not in complaint_indexes:
        op.create_index(
            "ix_complaints_organization_status",
            "complaints",
            ["organization_id", "status"],
        )
    if "ix_complaints_department_status" not in complaint_indexes:
        op.create_index(
            "ix_complaints_department_status",
            "complaints",
            ["department_id", "status"],
        )

    for table, index_name in (
        ("departments", "ix_departments_organization_id"),
        ("department_memberships", "ix_department_memberships_user_id"),
        ("department_slas", "ix_department_slas_department_id"),
    ):
        indexes = {item["name"] for item in sa.inspect(bind).get_indexes(table)}
        if index_name in indexes:
            op.drop_index(index_name, table_name=table)

    inspector = sa.inspect(bind)
    complaint_columns = {
        item["name"] for item in inspector.get_columns("complaints")
    }
    if "resolved_at" not in complaint_columns:
        op.add_column(
            "complaints",
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )
    bind.execute(
        sa.text(
            """
            UPDATE complaints AS c
            SET resolved_at = COALESCE(
                (
                    SELECT max(h.created_at)
                    FROM complaint_status_history AS h
                    WHERE h.complaint_id = c.id
                      AND h.new_status = 'resolved'
                ),
                c.updated_at
            )
            WHERE c.status IN ('resolved', 'closed')
              AND c.resolved_at IS NULL
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "resolved_at" in {
        item["name"] for item in inspector.get_columns("complaints")
    }:
        op.drop_column("complaints", "resolved_at")

    for table, index_name in (
        ("complaints", "ix_complaints_department_status"),
        ("complaints", "ix_complaints_organization_status"),
        ("users", "uq_users_email_lower"),
        ("users", "ix_users_organization_id"),
    ):
        indexes = {item["name"] for item in sa.inspect(bind).get_indexes(table)}
        if index_name in indexes:
            op.drop_index(index_name, table_name=table)

    for table, constraint_name in (
        ("department_slas", "ck_department_slas_resolution_hours"),
        ("department_memberships", "ck_department_memberships_role"),
        ("complaints", "ck_complaints_status"),
        ("complaints", "ck_complaints_priority"),
        ("complaints", "ck_complaints_domain"),
        ("users", "ck_users_org_admin_organization"),
        ("users", "ck_users_role"),
        ("organizations", "ck_organizations_domain"),
    ):
        checks = {
            item["name"] for item in sa.inspect(bind).get_check_constraints(table)
        }
        if constraint_name in checks:
            op.drop_constraint(constraint_name, table, type_="check")

    complaint_fks = sa.inspect(bind).get_foreign_keys("complaints")
    for name in (
        "fk_complaints_department_organization",
        "fk_complaints_organization_domain",
    ):
        if any(item["name"] == name for item in complaint_fks):
            op.drop_constraint(name, "complaints", type_="foreignkey")
    op.alter_column(
        "complaints",
        "organization_id",
        existing_type=sa.String(length=36),
        nullable=True,
    )

    for table, constraint_name in (
        ("departments", "uq_departments_id_organization"),
        ("organizations", "uq_organizations_id_domain"),
    ):
        uniques = {
            item["name"] for item in sa.inspect(bind).get_unique_constraints(table)
        }
        if constraint_name in uniques:
            op.drop_constraint(constraint_name, table, type_="unique")

    user_fks = sa.inspect(bind).get_foreign_keys("users")
    if any(item["name"] == "fk_users_organization_id_organizations" for item in user_fks):
        op.drop_constraint(
            "fk_users_organization_id_organizations", "users", type_="foreignkey"
        )
    op.alter_column(
        "users",
        "organization_id",
        existing_type=sa.String(length=36),
        type_=sa.String(),
        existing_nullable=True,
        postgresql_using="organization_id::varchar",
    )

    for table, index_name in (
        ("department_slas", "ix_department_slas_department_id"),
        ("department_memberships", "ix_department_memberships_user_id"),
        ("departments", "ix_departments_organization_id"),
    ):
        indexes = {item["name"] for item in sa.inspect(bind).get_indexes(table)}
        if index_name not in indexes:
            columns = {
                "ix_department_slas_department_id": ["department_id"],
                "ix_department_memberships_user_id": ["user_id"],
                "ix_departments_organization_id": ["organization_id"],
            }[index_name]
            op.create_index(index_name, table, columns)
