"""CLI tool to create Government Staff and Administrator accounts manually.

Usage:
  Interactive:
    python create_staff.py

  With arguments:
    python create_staff.py --email admin@civicone.gov --password MyPassword123 --name "Admin User" --role platform_admin
    python create_staff.py --email staff@transport.gov --password MyPassword123 --name "Transit Officer" --role staff --domain transport
"""
import sys
import argparse
from sqlalchemy import select
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import User, Organization, Department, DepartmentMembership

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

def main():
    parser = argparse.ArgumentParser(description="Create government staff or admin accounts in CivicOne.")
    parser.add_argument("--email", help="Account email address")
    parser.add_argument("--password", help="Account password (min 8 characters)")
    parser.add_argument("--name", help="Full name of staff member / admin")
    parser.add_argument("--role", choices=["staff", "dept_admin", "platform_admin"], default="staff", help="Role type")
    parser.add_argument("--domain", choices=["transport", "municipal", "healthcare"], default="transport", help="Department domain")

    args = parser.parse_args()

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
