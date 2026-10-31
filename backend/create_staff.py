"""CLI tool to create Government Staff and Administrator accounts manually.

Usage:
  Interactive:
    python create_staff.py

  With arguments:
    python create_staff.py --email admin@civicone.gov --password MyPassword123 --name "Admin User" --role platform_admin
    python create_staff.py --email staff@transport.gov --password MyPassword123 --name "Transit Officer" --role staff --domain transport

  Initial CivicOne accounts (passwords are prompted without echo):
    python create_staff.py --provision-initial-accounts
"""
import sys
import argparse
import getpass
from sqlalchemy import select
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import User, Organization, Department, DepartmentMembership

INITIAL_ACCOUNTS = (
    {
        "email": "rohan@transport.in",
        "full_name": "Rohan",
        "role": "staff",
        "domain": "transport",
        "category_key": "bus_delay",
    },
    {
        "email": "kavya@municipal.in",
        "full_name": "Kavya",
        "role": "staff",
        "domain": "municipal",
        "category_key": "garbage",
    },
    {
        "email": "arjun@healthcare.in",
        "full_name": "Arjun",
        "role": "staff",
        "domain": "healthcare",
        "category_key": "facility_cleanliness",
    },
    {
        "email": "admin@civicone.in",
        "full_name": "Main Admin",
        "role": "platform_admin",
        "domain": None,
        "category_key": None,
    },
)

DOMAINS = {
    "transport": {
        "org_name": "Transport Organization",
        "dept_name": "Bus Operations & Fleet",
        "category_key": "bus_delay"
    },
    "municipal": {
        "org_name": "Municipal Organization",
        "dept_name": "Sanitation & Solid Waste",
        "category_key": "garbage"
    },
    "healthcare": {
        "org_name": "Healthcare Organization",
        "dept_name": "Primary Healthcare & Clinics",
        "category_key": "facility_cleanliness"
    }
}

def provision_initial_accounts(passwords: dict[str, str], session_factory=SessionLocal):
    """Provision the four initial accounts atomically without replacing existing credentials."""
    results = []
    with session_factory() as db:
        with db.begin():
            resolved_departments = {}
            for account in INITIAL_ACCOUNTS:
                if account["domain"] is None:
                    continue
                matches = db.scalars(
                    select(Department)
                    .join(Organization, Department.organization_id == Organization.id)
                    .where(
                        Organization.domain == account["domain"],
                        Department.category_key == account["category_key"],
                    )
                ).all()
                if len(matches) != 1:
                    raise ValueError(
                        f"Expected exactly one existing department for {account['domain']}"
                    )
                resolved_departments[account["email"]] = matches[0]

            for account in INITIAL_ACCOUNTS:
                email = account["email"]
                user = db.scalar(select(User).where(User.email == email))
                created = user is None
                if user is None:
                    password = passwords.get(email)
                    if password is None:
                        raise ValueError(f"A password is required to create {email}")
                    if len(password) < 8:
                        raise ValueError("Initial passwords must contain at least 8 characters")
                    user = User(
                        email=email,
                        full_name=account["full_name"],
                        role=account["role"],
                        password_hash=hash_password(password),
                        is_active=True,
                    )
                    db.add(user)
                    db.flush()
                elif user.role != account["role"] or not user.is_active:
                    raise ValueError(
                        f"Existing account {email} has a conflicting role or is inactive"
                    )

                department = resolved_departments.get(email)
                if department is not None:
                    memberships = db.scalars(
                        select(DepartmentMembership).where(
                            DepartmentMembership.user_id == user.id
                        )
                    ).all()
                    target_membership = next(
                        (m for m in memberships if m.department_id == department.id),
                        None,
                    )
                    if target_membership is None:
                        target_membership = DepartmentMembership(
                            user_id=user.id,
                            department_id=department.id,
                            role_in_dept="staff",
                            is_active=True,
                        )
                        db.add(target_membership)
                    else:
                        target_membership.role_in_dept = "staff"
                        target_membership.is_active = True
                    for membership in memberships:
                        if membership.department_id != department.id:
                            membership.is_active = False
                else:
                    existing_membership = db.scalar(
                        select(DepartmentMembership.id).where(
                            DepartmentMembership.user_id == user.id
                        )
                    )
                    if existing_membership is not None:
                        raise ValueError(
                            "The platform administrator must not have department memberships"
                        )

                results.append(
                    {
                        "email": email,
                        "role": user.role,
                        "created": created,
                        "department": department.name if department else None,
                    }
                )
    return results

def _prompt_initial_passwords():
    passwords = {}
    with SessionLocal() as db:
        existing_emails = set(db.scalars(
            select(User.email).where(
                User.email.in_([account["email"] for account in INITIAL_ACCOUNTS])
            )
        ).all())
    for account in INITIAL_ACCOUNTS:
        if account["email"] in existing_emails:
            continue
        password = getpass.getpass(
            f"Initial password for {account['email']} (input hidden): "
        )
        if len(password) < 8:
            raise ValueError("Initial passwords must contain at least 8 characters")
        passwords[account["email"]] = password
    return passwords

def ensure_department(db, domain_key: str):
    info = DOMAINS[domain_key]
    org = db.scalar(select(Organization).where(Organization.domain == domain_key))
    if not org:
        org = Organization(name=info["org_name"], domain=domain_key, description=f"CivicOne {info['org_name']}")
        db.add(org)
        db.flush()

    dept = db.scalar(select(Department).where(Department.organization_id == org.id))
    if not dept:
        dept = Department(
            organization_id=org.id,
            name=info["dept_name"],
            category_key=info["category_key"],
            description=f"Primary department for {info['org_name']}"
        )
        db.add(dept)
        db.flush()
    return dept

def create_staff(email: str, password: str, full_name: str, role: str = "staff", domain: str = "transport"):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        email = email.strip().lower()
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"[!] A user with email '{email}' already exists (Current role: {existing.role}).")
            choice = input("Do you want to update their password and role? [y/N]: ").strip().lower()
            if choice == "y":
                existing.password_hash = hash_password(password)
                existing.role = role
                existing.full_name = full_name
                db.commit()
                print(f"[✓] User '{email}' successfully updated.")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        db.add(user)
        db.flush()

        # If staff or dept_admin, attach department membership
        if role in ("staff", "dept_admin"):
            if domain not in DOMAINS:
                domain = "transport"
            dept = ensure_department(db, domain)
            membership = DepartmentMembership(
                user_id=user.id,
                department_id=dept.id,
                role_in_dept="lead" if role == "dept_admin" else "staff",
                is_active=True
            )
            db.add(membership)
            print(f"[✓] Assigned to Department: '{dept.name}' ({DOMAINS[domain]['org_name']})")

        db.commit()
        print(f"\n[✓] Successfully created government account:")
        print(f"    - Full Name: {full_name}")
        print(f"    - Email:     {email}")
        print(f"    - Role:      {role}")
        if role in ("staff", "dept_admin"):
            print(f"    - Domain:    {domain}")
        print(f"    - Portal:    http://localhost:5173/government/login\n")

def delete_user(email: str):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        email = email.strip().lower()
        existing = db.scalar(select(User).where(User.email == email))
        if not existing:
            print(f"[!] No user found with email '{email}'.")
            return
        db.delete(existing)
        db.commit()
        print(f"[✓] Successfully deleted user '{email}'.")

def list_users():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        users = db.scalars(select(User)).all()
        if not users:
            print("No users found in database.")
            return
        print("\n=== Existing Accounts ===")
        for u in users:
            print(f"  - {u.email:<30} | Name: {u.full_name:<20} | Role: {u.role}")
        print()

def main():
    parser = argparse.ArgumentParser(description="Create, list, or delete government staff or admin accounts in CivicOne.")
    parser.add_argument(
        "--provision-initial-accounts",
        action="store_true",
        help="Create the three initial staff accounts and platform administrator in one transaction",
    )
    parser.add_argument("--email", help="Account email address")
    parser.add_argument("--password", help="Account password (min 8 characters)")
    parser.add_argument("--name", help="Full name of staff member / admin")
    parser.add_argument("--role", choices=["staff", "dept_admin", "platform_admin"], default="staff", help="Role type")
    parser.add_argument("--domain", choices=["transport", "municipal", "healthcare"], default="transport", help="Department domain")
    parser.add_argument("--delete", help="Delete an account by email address")
    parser.add_argument("--list", action="store_true", help="List all accounts in the database")

    args = parser.parse_args()

    if args.provision_initial_accounts:
        if args.list or args.delete or args.email or args.password or args.name:
            parser.error("--provision-initial-accounts cannot be combined with other actions")
        try:
            results = provision_initial_accounts(_prompt_initial_passwords())
        except ValueError as exc:
            print(f"[!] Initial account provisioning failed: {exc}. No changes were committed.")
            raise SystemExit(1) from None
        for result in results:
            state = "created" if result["created"] else "already existed"
            department = f" | Department: {result['department']}" if result["department"] else ""
            print(f"[✓] {result['email']} | Role: {result['role']}{department} | {state}")
        return

    if args.list:
        list_users()
        return

    if args.delete:
        delete_user(args.delete)
        return

    # Interactive mode if arguments are missing
    if not args.email or not args.password:
        print("\n=== CivicOne Government Staff & Admin Creator ===")
        print("Create your own custom staff credentials manually.\n")
        
        email = input("Enter email address: ").strip()
        while not email or "@" not in email:
            print("Please enter a valid email address.")
            email = input("Enter email address: ").strip()

        password = input("Enter password (min 8 chars): ").strip()
        while len(password) < 8:
            print("Password must be at least 8 characters.")
            password = input("Enter password: ").strip()

        full_name = input("Enter full name: ").strip()
        if not full_name:
            full_name = "Government Staff"

        print("\nSelect Role:")
        print("  1. Department Staff (handles complaints for a specific department)")
        print("  2. Department Administrator (manages departmental notices and staff)")
        print("  3. Platform Administrator (full system access)")
        role_choice = input("Choice [1/2/3, default: 1]: ").strip()
        role_map = {"1": "staff", "2": "dept_admin", "3": "platform_admin"}
        role = role_map.get(role_choice, "staff")

        domain = "transport"
        if role in ("staff", "dept_admin"):
            print("\nSelect Department Domain:")
            print("  1. Transport Services (Bus operations, delays, shelters)")
            print("  2. Municipal Services (Sanitation, waste, potholes, streetlights)")
            print("  3. Healthcare Services (Clinics, facilities, appointments)")
            domain_choice = input("Choice [1/2/3, default: 1]: ").strip()
            domain_map = {"1": "transport", "2": "municipal", "3": "healthcare"}
            domain = domain_map.get(domain_choice, "transport")

        create_staff(email=email, password=password, full_name=full_name, role=role, domain=domain)
    else:
        name = args.name or "Government Staff"
        create_staff(email=args.email, password=args.password, full_name=name, role=args.role, domain=args.domain)

if __name__ == "__main__":
    main()
