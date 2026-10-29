import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models import User, Organization, Department, DepartmentMembership, Complaint, StatusHistory, Document, ConsentGrant

# Shared StaticPool in-memory SQLite database
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        # Seed test org and dept
        org = Organization(name="Test Transport Org", domain="transport")
        db.add(org)
        db.flush()
        dept = Department(organization_id=org.id, name="Test Bus Ops", category_key="bus_delay")
        db.add(dept)
        db.flush()

        # Seed citizen
        citizen = User(
            id="cit-001",
            email="citizen@test.civicone.test",
            full_name="Citizen Tester",
            role="citizen",
            password_hash=hash_password("Pass#1234")
        )
        # Seed staff
        staff = User(
            id="stf-001",
            email="staff@test.civicone.test",
            full_name="Staff Tester",
            role="staff",
            password_hash=hash_password("Pass#1234")
        )
        # Seed admin
        admin = User(
            id="adm-001",
            email="admin@test.civicone.test",
            full_name="Admin Tester",
            role="platform_admin",
            password_hash=hash_password("Pass#1234")
        )
        db.add_all([citizen, staff, admin])
        db.flush()

        # Add staff membership
        db.add(DepartmentMembership(user_id=staff.id, department_id=dept.id, role_in_dept="staff"))
        db.commit()

    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def auth_headers(user_id: str):
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}

def test_registration_and_portal_isolation():
    # 1. Register new citizen
    res = client.post("/api/v1/auth/register", json={
        "full_name": "New Citizen",
        "email": "newcitizen@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "citizen"

    # 2. Citizen trying to log in through government portal must be rejected
    gov_login = client.post("/api/v1/auth/login", json={
        "email": "newcitizen@example.com",
        "password": "Password123!",
        "portal": "government"
    })
    assert gov_login.status_code == 403

    # 3. Citizen logging in through citizen portal succeeds
    cit_login = client.post("/api/v1/auth/login", json={
        "email": "newcitizen@example.com",
        "password": "Password123!",
        "portal": "citizen"
    })
    assert cit_login.status_code == 200
    assert "access_token" in cit_login.json()

def test_complaint_creation_and_routing():
    headers = auth_headers("cit-001")
    res = client.post("/api/v1/complaints", headers=headers, json={
        "domain": "transport",
        "title": "Severe bus delay on Route 45",
        "description": "The bus on route 45 was late by 50 minutes at Kuvempunagar shelter.",
        "category": "bus_delay",
        "address": "Kuvempunagar Bus Stand, Main Road",
        "locality": "Kuvempunagar"
    })
    assert res.status_code == 201
    comp = res.json()
    assert comp["reference"].startswith("#T-2024-")
    assert comp["domain"] == "transport"
    assert comp["status"] in ("assigned", "submitted")

def test_complaint_ownership_isolation():
    headers_citizen = auth_headers("cit-001")
    # File a complaint
    c_res = client.post("/api/v1/complaints", headers=headers_citizen, json={
        "domain": "transport",
        "title": "Bus stop glass broken",
        "description": "Shattered panel near shelter.",
        "category": "bus_stop_damage",
        "address": "Jayanagar 4th Block",
        "locality": "Jayanagar"
    })
    assert c_res.status_code == 201
    cid = c_res.json()["id"]

    # Another citizen should NOT be able to view it
    with TestingSessionLocal() as db:
        other_cit = User(
            id="cit-002",
            email="other@test.civicone.test",
            full_name="Other Citizen",
            role="citizen",
            password_hash=hash_password("Pass#1234")
        )
        db.add(other_cit)
        db.commit()

    headers_other = auth_headers("cit-002")
    get_res = client.get(f"/api/v1/complaints/{cid}", headers=headers_other)
    assert get_res.status_code == 404  # Not found prevents ID enumeration

def test_complaint_status_transition_and_internal_notes():
    headers_citizen = auth_headers("cit-001")
    c_res = client.post("/api/v1/complaints", headers=headers_citizen, json={
        "domain": "transport",
        "title": "Delay reported",
        "description": "Morning transit delay.",
        "category": "bus_delay",
        "address": "Central Stand",
        "locality": "Central"
    })
    cid = c_res.json()["id"]

    # Staff updates status
    headers_staff = auth_headers("stf-001")
    st_res = client.post(f"/api/v1/complaints/{cid}/status", headers=headers_staff, json={
        "new_status": "in_progress",
        "reason": "Depot manager dispatched relief bus",
        "citizen_visible": True
    })
    assert st_res.status_code == 200
    assert st_res.json()["status"] == "in_progress"

    # Staff adds internal note
    note_res = client.post(f"/api/v1/complaints/{cid}/notes", headers=headers_staff, json={
        "note": "Internal: Depot 2 reported mechanical breakdown on vehicle 408"
    })
    assert note_res.status_code == 200

    # Citizen viewing details should see the status history but NOT internal notes
    detail_cit = client.get(f"/api/v1/complaints/{cid}", headers=headers_citizen).json()
    assert len(detail_cit["history"]) > 0
    assert "internal_notes" not in detail_cit or len(detail_cit["internal_notes"]) == 0

def test_document_publication_workflow():
    headers_staff = auth_headers("stf-001")
    headers_admin = auth_headers("adm-001")

    # Staff creates draft document
    d_res = client.post("/api/v1/documents", headers=headers_staff, json={
        "title": "New Timetable Notice",
        "description": "Effective next Monday",
        "service_domain": "transport",
        "category": "announcement",
        "is_public": True
    })
    assert d_res.status_code == 201
    doc_id = d_res.json()["id"]
    assert d_res.json()["status"] == "draft"

    # Submit for review
    sub_res = client.post(f"/api/v1/documents/{doc_id}/submit-review", headers=headers_staff)
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "review"

    # Admin approves and publishes
    appr_res = client.post(f"/api/v1/documents/{doc_id}/approve", headers=headers_admin)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "approved"

    pub_res = client.post(f"/api/v1/documents/{doc_id}/publish", headers=headers_admin)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"

    # Public notices endpoint can now see it
    public_res = client.get("/api/v1/documents/public?domain=transport")
    assert public_res.status_code == 200
    items = public_res.json()["items"]
    assert any(i["id"] == doc_id for i in items)

def test_consent_grant_and_revocation():
    headers = auth_headers("cit-001")
    with TestingSessionLocal() as db:
        org = db.scalar(select(Organization))
        org_id = org.id

    # Grant consent
    g_res = client.post("/api/v1/consent", headers=headers, json={
        "recipient_organization_id": org_id,
        "data_scope": "profile,commute_alerts",
        "purpose": "Public transit notifications",
        "validity_days": 180
    })
    assert g_res.status_code == 201
    grant_id = g_res.json()["id"]
    assert g_res.json()["status"] == "active"

    # Revoke consent
    rev_res = client.post(f"/api/v1/consent/{grant_id}/revoke", headers=headers)
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "revoked"
