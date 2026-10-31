import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.security import hash_password, verify_password
from app.models import (
    Department,
    DepartmentMembership,
    Organization,
    User,
)
from create_staff import INITIAL_ACCOUNTS, provision_initial_accounts


@pytest.fixture
def provisioning_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    with session_factory() as db:
        for domain, category in (
            ("transport", "bus_delay"),
            ("municipal", "garbage"),
            ("healthcare", "facility_cleanliness"),
        ):
            organization = Organization(name=f"{domain} org", domain=domain)
            db.add(organization)
            db.flush()
            db.add(Department(
                organization_id=organization.id,
                name=f"{domain} department",
                category_key=category,
            ))
        db.commit()
    yield session_factory
    Base.metadata.drop_all(engine)
    engine.dispose()


def _passwords():
    return {
        account["email"]: f"test-only-{index}-password"
        for index, account in enumerate(INITIAL_ACCOUNTS)
    }


def test_provisions_accounts_and_memberships_idempotently(provisioning_db):
    passwords = _passwords()
    first_run = provision_initial_accounts(passwords, provisioning_db)
    second_run = provision_initial_accounts({}, provisioning_db)

    assert len(first_run) == len(INITIAL_ACCOUNTS)
    assert all(account["created"] for account in first_run)
    assert all(not account["created"] for account in second_run)

    with provisioning_db() as db:
        users = db.scalars(select(User)).all()
        assert len(users) == 4
        for account in INITIAL_ACCOUNTS:
            user = db.scalar(select(User).where(User.email == account["email"]))
            assert user is not None
            assert user.role == account["role"]
            assert user.is_active
            assert user.password_hash != passwords[user.email]
            assert verify_password(passwords[user.email], user.password_hash)

        active_memberships = db.scalars(
            select(DepartmentMembership).where(DepartmentMembership.is_active.is_(True))
        ).all()
        assert len(active_memberships) == 3
        for account in INITIAL_ACCOUNTS[:3]:
            user = db.scalar(select(User).where(User.email == account["email"]))
            memberships = db.scalars(
                select(DepartmentMembership).where(
                    DepartmentMembership.user_id == user.id,
                    DepartmentMembership.is_active.is_(True),
                )
            ).all()
            assert len(memberships) == 1
            assert memberships[0].role_in_dept == "staff"
            department = db.get(Department, memberships[0].department_id)
            assert department.category_key == account["category_key"]
            assert department.organization.domain == account["domain"]

        admin = db.scalar(
            select(User).where(User.email == "admin@civicone.in")
        )
        assert admin.role == "platform_admin"
        assert db.scalar(
            select(func.count(DepartmentMembership.id)).where(
                DepartmentMembership.user_id == admin.id
            )
        ) == 0
        assert db.scalar(select(func.count(Department.id))) == 3


def test_conflicting_existing_account_rolls_back_all_changes(provisioning_db):
    with provisioning_db() as db:
        db.add(User(
            email="admin@civicone.in",
            full_name="Existing Citizen",
            role="citizen",
            password_hash=hash_password("existing-password"),
            is_active=True,
        ))
        db.commit()

    with pytest.raises(ValueError, match="conflicting role"):
        provision_initial_accounts(_passwords(), provisioning_db)

    with provisioning_db() as db:
        assert db.scalar(select(func.count(User.id))) == 1
        assert db.scalar(select(User.email)) == "admin@civicone.in"
        assert db.scalar(select(func.count(DepartmentMembership.id))) == 0
