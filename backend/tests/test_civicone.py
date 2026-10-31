import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.services.operations import archive_expired_announcements
from app.models import (
    User,
    Organization,
    Department,
    DepartmentMembership,
    Complaint,
    StatusHistory,
    Document,
    ConsentGrant,
    Notification,
    AuditEvent,
    RefreshSession,
)

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

def test_vite_loopback_origins_are_allowed_for_api_requests():
    response = client.options(
        "/api/v1/complaints",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"

def auth_headers(user_id: str):
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}

def grant_department_membership(user_id: str, department_id: str):
    with TestingSessionLocal() as db:
        db.add(DepartmentMembership(
            user_id=user_id,
            department_id=department_id,
            role_in_dept="admin",
            is_active=True,
        ))
        db.commit()

def test_public_analytics_reports_empty_database_without_demo_values():
    response = client.get("/api/v1/analytics/public")

    assert response.status_code == 200
    assert response.json() == {
        "total_complaints": 0,
        "issues_resolved": 0,
        "in_progress": 0,
        "resolution_rate": None,
        "requests_by_domain": {},
    }

def test_public_analytics_reports_saved_complaints_by_domain():
    with TestingSessionLocal() as db:
        db.add_all([
            Complaint(
                reference=f"DB-PUBLIC-{status}",
                citizen_id="cit-001",
                domain="transport",
                title="Saved public metric fixture",
                description="Used to verify aggregate analytics.",
                category="bus_delay",
                address="Test address",
                status=status,
            )
            for status in ("assigned", "in_progress", "resolved")
        ])
        db.commit()

    response = client.get("/api/v1/analytics/public")

    assert response.status_code == 200
    data = response.json()
    assert data["total_complaints"] == 3
    assert data["issues_resolved"] == 1
    assert data["in_progress"] == 2
    assert data["resolution_rate"] == 33
    assert data["requests_by_domain"]["transport"] == {
        "total": 3,
        "resolved": 1,
        "in_progress": 2,
        "pending": 0,
        "rejected": 0,
    }

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
    grant_department_membership("adm-001", d_res.json()["department_id"])

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

def _create_transport_complaint():
    response = client.post("/api/v1/complaints", headers=auth_headers("cit-001"), json={
        "domain": "transport",
        "title": "Bus delay on Route 45",
        "description": "The scheduled bus did not arrive at the stop.",
        "category": "bus_delay",
        "address": "Central Stand",
        "locality": "Central",
    })
    assert response.status_code == 201
    return response.json()

def test_assignment_requires_supervisor_and_notifies_citizen():
    complaint = _create_transport_complaint()
    headers = auth_headers("stf-001")
    with TestingSessionLocal() as db:
        department = db.scalar(select(Department))
        membership = db.scalar(select(DepartmentMembership).where(
            DepartmentMembership.user_id == "stf-001"
        ))
        department_id = department.id
        membership_id = membership.id

    assignment = {
        "department_id": department_id,
        "assigned_to_user_id": "stf-001",
    }
    denied = client.post(
        f"/api/v1/complaints/{complaint['id']}/assign",
        headers=headers,
        json=assignment,
    )
    assert denied.status_code == 403

    admin_headers = auth_headers("adm-001")
    role_update = client.put(
        f"/api/v1/admin/staff/{membership_id}",
        headers=admin_headers,
        json={"role_in_dept": "supervisor", "is_active": True},
    )
    assert role_update.status_code == 200

    allowed = client.post(
        f"/api/v1/complaints/{complaint['id']}/assign",
        headers=headers,
        json=assignment,
    )
    assert allowed.status_code == 200

    with TestingSessionLocal() as db:
        department = db.get(Department, department_id)
        other_department = Department(
            organization_id=department.organization_id,
            name="Other Operations",
            category_key="roads",
        )
        db.add(other_department)
        db.flush()
        cross_department_complaint = Complaint(
            reference="#M-2026-9901",
            citizen_id="cit-001",
            domain="municipal",
            title="Cross-department record",
            description="This record belongs to a department without staff membership.",
            category="roads",
            address="Main Road",
            department_id=other_department.id,
            assigned_to_user_id="stf-001",
            status="assigned",
        )
        db.add(cross_department_complaint)
        db.commit()
        cross_department_id = cross_department_complaint.id
    hidden = client.get(
        f"/api/v1/complaints/{cross_department_id}",
        headers=headers,
    )
    assert hidden.status_code == 404

    with TestingSessionLocal() as db:
        citizen_notifications = db.scalars(
            select(Notification).where(
                Notification.user_id == "cit-001",
                Notification.notification_type == "complaint_assigned",
            )
        ).all()
    assert citizen_notifications

def test_sla_configuration_sets_deadlines_on_open_complaints():
    complaint = _create_transport_complaint()
    with TestingSessionLocal() as db:
        department_id = db.scalar(select(Department.id))

    response = client.put(
        "/api/v1/admin/slas",
        headers=auth_headers("adm-001"),
        json={
            "department_id": department_id,
            "category": complaint["category"],
            "resolution_hours": 12,
        },
    )
    assert response.status_code == 200

    detail = client.get(
        f"/api/v1/complaints/{complaint['id']}",
        headers=auth_headers("stf-001"),
    )
    assert detail.status_code == 200
    assert detail.json()["resolution_due_at"] is not None

    metrics = client.get(
        "/api/v1/analytics/department?domain=transport",
        headers=auth_headers("stf-001"),
    )
    assert metrics.status_code == 200
    assert metrics.json()["total"] >= 1
    assert "announcement_stats" in metrics.json()

def test_scheduled_announcement_targets_citizens_and_expires():
    headers_staff = auth_headers("stf-001")
    headers_admin = auth_headers("adm-001")
    future = datetime.now(timezone.utc) + timedelta(days=2)
    expiry = future + timedelta(days=3)
    draft = client.post("/api/v1/documents", headers=headers_staff, json={
        "title": "Scheduled service update",
        "description": "A planned transport service update.",
        "service_domain": "transport",
        "category": "transport_update",
        "is_public": True,
        "target_type": "all",
        "scheduled_at": future.isoformat(),
        "expiry_date": expiry.isoformat(),
    })
    assert draft.status_code == 201
    document_id = draft.json()["id"]
    grant_department_membership("adm-001", draft.json()["department_id"])

    assert client.post(
        f"/api/v1/documents/{document_id}/submit-review",
        headers=headers_staff,
    ).status_code == 200
    assert client.post(
        f"/api/v1/documents/{document_id}/approve",
        headers=headers_admin,
    ).status_code == 200
    assert client.post(
        f"/api/v1/documents/{document_id}/publish",
        headers=headers_admin,
    ).status_code == 200

    future_result = client.get("/api/v1/documents/public?domain=municipal")
    assert future_result.status_code == 200
    assert document_id not in {item["id"] for item in future_result.json()["items"]}

    with TestingSessionLocal() as db:
        document = db.get(Document, document_id)
        document.scheduled_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    public_result = client.get("/api/v1/documents/public?domain=municipal")
    assert document_id in {item["id"] for item in public_result.json()["items"]}
    with TestingSessionLocal() as db:
        assert db.scalar(select(Notification.id).where(
            Notification.user_id == "cit-001",
            Notification.notification_type == "announcement",
        ))
        document = db.get(Document, document_id)
        document.expiry_date = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        assert archive_expired_announcements(db) == 1
        assert document.status == "archived"
    expired_result = client.get("/api/v1/documents/public?domain=municipal")
    assert document_id not in {item["id"] for item in expired_result.json()["items"]}

def test_document_review_can_request_changes_and_reject():
    staff_headers = auth_headers("stf-001")
    admin_headers = auth_headers("adm-001")
    draft = client.post("/api/v1/documents", headers=staff_headers, json={
        "title": "Review workflow notice",
        "description": "A draft needing review.",
        "service_domain": "transport",
        "category": "notice",
    })
    assert draft.status_code == 201
    document_id = draft.json()["id"]
    grant_department_membership("adm-001", draft.json()["department_id"])
    assert client.post(
        f"/api/v1/documents/{document_id}/submit-review",
        headers=staff_headers,
    ).status_code == 200

    changes = client.post(
        f"/api/v1/documents/{document_id}/request-changes",
        headers=admin_headers,
        json={"message": "Please include the effective date."},
    )
    assert changes.status_code == 200
    assert changes.json()["status"] == "changes_requested"
    assert changes.json()["review_feedback"] == "Please include the effective date."

    edit = client.patch(
        f"/api/v1/documents/{document_id}",
        headers=staff_headers,
        json={"description": "Updated draft with effective date."},
    )
    assert edit.status_code == 200
    assert edit.json()["status"] == "draft"

    assert client.post(
        f"/api/v1/documents/{document_id}/submit-review",
        headers=staff_headers,
    ).status_code == 200
    rejected = client.post(
        f"/api/v1/documents/{document_id}/reject",
        headers=admin_headers,
        json={"message": "This notice is not appropriate for publication."},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert client.post(
        f"/api/v1/documents/{document_id}/publish",
        headers=admin_headers,
    ).status_code == 400

def test_overdue_sla_escalates_once_to_supervisor():
    complaint = _create_transport_complaint()
    with TestingSessionLocal() as db:
        department_id = db.scalar(select(Department.id))
        membership = db.scalar(select(DepartmentMembership).where(
            DepartmentMembership.user_id == "stf-001"
        ))
        membership.role_in_dept = "supervisor"
        row = db.get(Complaint, complaint["id"])
        row.resolution_due_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

    first = client.get(
        "/api/v1/analytics/department?domain=transport",
        headers=auth_headers("stf-001"),
    )
    assert first.status_code == 200
    with TestingSessionLocal() as db:
        escalations = db.scalars(select(Notification).where(
            Notification.user_id == "stf-001",
            Notification.notification_type == "complaint_escalation",
        )).all()
    assert len(escalations) == 1

    second = client.get(
        "/api/v1/analytics/department?domain=transport",
        headers=auth_headers("stf-001"),
    )
    assert second.status_code == 200
    with TestingSessionLocal() as db:
        escalations = db.scalars(select(Notification).where(
            Notification.user_id == "stf-001",
            Notification.notification_type == "complaint_escalation",
        )).all()
    assert len(escalations) == 1

def test_resolution_remarks_and_high_priority_evidence_are_required():
    complaint = _create_transport_complaint()
    with TestingSessionLocal() as db:
        row = db.get(Complaint, complaint["id"])
        row.priority = "high"
        row.status = "in_progress"
        db.commit()

    headers = auth_headers("stf-001")
    missing_remarks = client.post(
        f"/api/v1/complaints/{complaint['id']}/status",
        headers=headers,
        json={"new_status": "resolved"},
    )
    assert missing_remarks.status_code == 422

    missing_evidence = client.post(
        f"/api/v1/complaints/{complaint['id']}/status",
        headers=headers,
        json={"new_status": "resolved", "reason": "Repair crew replaced the damaged panel."},
    )
    assert missing_evidence.status_code == 422

def test_citizen_and_staff_only_api_boundaries():
    citizen = auth_headers("cit-001")
    staff = auth_headers("stf-001")

    assert client.get("/api/v1/consent", headers=staff).status_code == 403
    assert client.get("/api/v1/services/appointments", headers=staff).status_code == 403
    assert client.get("/api/v1/analytics/citizen", headers=staff).status_code == 403
    assert client.get("/api/v1/documents", headers=citizen).status_code == 403
    assert client.get("/api/v1/complaints/staff-options", headers=citizen).status_code == 403
    assert client.get("/api/v1/analytics/department", headers=citizen).status_code == 403
    assert client.get("/api/v1/complaints").status_code == 401
    assert client.get("/api/v1/services/facilities").status_code == 200
    assert client.get("/api/v1/analytics/public").status_code == 200

def test_staff_and_department_admin_are_scoped_to_active_memberships():
    complaint = _create_transport_complaint()
    with TestingSessionLocal() as db:
        org = db.scalar(select(Organization))
        other_department = Department(
            id="dept-other",
            organization_id=org.id,
            name="Other Operations",
            category_key="other",
        )
        department_admin = User(
            id="dept-admin-1",
            email="dept-admin@test.civicone.test",
            full_name="Department Admin",
            role="dept_admin",
            password_hash=hash_password("Pass#1234"),
        )
        unrelated_complaint = Complaint(
            id="complaint-other",
            reference="OTHER-DEPT-1",
            citizen_id="cit-001",
            domain="transport",
            title="Another department complaint",
            description="A complaint assigned to another department.",
            category="other",
            address="Other department street",
            department_id="dept-other",
        )
        db.add_all([other_department, department_admin, unrelated_complaint])
        db.flush()
        db.add(DepartmentMembership(
            user_id=department_admin.id,
            department_id=db.scalar(select(Department.id).where(Department.id != "dept-other")),
            role_in_dept="staff",
            is_active=True,
        ))
        db.commit()

    staff_headers = auth_headers("stf-001")
    assert client.get(
        "/api/v1/complaints/complaint-other", headers=staff_headers
    ).status_code == 404
    staff_list = client.get("/api/v1/complaints", headers=staff_headers).json()
    assert "complaint-other" not in {item["id"] for item in staff_list["items"]}

    department_admin_headers = auth_headers("dept-admin-1")
    assert client.get(
        f"/api/v1/complaints/{complaint['id']}", headers=department_admin_headers
    ).status_code == 200
    assert client.get(
        "/api/v1/complaints/complaint-other", headers=department_admin_headers
    ).status_code == 404
    department_admin_list = client.get(
        "/api/v1/complaints", headers=department_admin_headers
    ).json()
    assert {item["id"] for item in department_admin_list["items"]} == {complaint["id"]}

    no_membership_admin_id = "dept-admin-no-membership"
    no_membership_admin = User(
        id=no_membership_admin_id,
        email="dept-admin-no-membership@test.civicone.test",
        full_name="Unassigned Department Admin",
        role="dept_admin",
        password_hash=hash_password("Pass#1234"),
    )
    with TestingSessionLocal() as db:
        db.add(no_membership_admin)
        db.commit()
    no_membership_headers = auth_headers(no_membership_admin_id)
    assert client.get(
        f"/api/v1/complaints/{complaint['id']}", headers=no_membership_headers
    ).status_code == 404
    assert client.get(
        "/api/v1/complaints", headers=no_membership_headers
    ).json()["items"] == []

def test_platform_admin_uses_aggregates_and_audited_sensitive_access():
    complaint = _create_transport_complaint()
    admin_headers = auth_headers("adm-001")

    assert client.get("/api/v1/complaints", headers=admin_headers).status_code == 403
    assert client.get(
        f"/api/v1/complaints/{complaint['id']}", headers=admin_headers
    ).status_code == 404
    no_reason = client.post(
        f"/api/v1/complaints/{complaint['id']}/admin-access",
        headers=admin_headers,
        json={"reason": " "},
    )
    assert no_reason.status_code == 422

    analytics = client.get(
        "/api/v1/analytics/department", headers=admin_headers
    )
    assert analytics.status_code == 200
    assert analytics.json()["total"] == 1
    assert analytics.json()["staff_workload"] == []
    assert analytics.json()["recent_activities"] == []

    access = client.post(
        f"/api/v1/complaints/{complaint['id']}/admin-access",
        headers=admin_headers,
        json={"reason": "Investigating a formally reported complaint safety concern"},
    )
    assert access.status_code == 200
    assert access.json()["id"] == complaint["id"]
    with TestingSessionLocal() as db:
        event = db.scalar(select(AuditEvent).where(
            AuditEvent.action == "SENSITIVE_COMPLAINT_ACCESSED",
            AuditEvent.resource_id == complaint["id"],
        ))
        assert event is not None
        assert event.actor_id == "adm-001"
        assert "formally reported complaint safety concern" in event.details

def test_login_validates_portal_and_profile_uses_authenticated_identity():
    invalid_portal = client.post("/api/v1/auth/login", json={
        "email": "citizen@test.civicone.test",
        "password": "Pass#1234",
        "portal": "unexpected",
    })
    assert invalid_portal.status_code == 422
    staff_citizen_login = client.post("/api/v1/auth/login", json={
        "email": "staff@test.civicone.test",
        "password": "Pass#1234",
        "portal": "citizen",
    })
    assert staff_citizen_login.status_code == 403

    headers = auth_headers("cit-001")
    updated = client.patch(
        "/api/v1/auth/profile",
        headers=headers,
        json={"full_name": "Updated Citizen Name", "phone": "555-0101"},
    )
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Updated Citizen Name"
    assert updated.json()["phone"] == "555-0101"
    assert client.patch(
        "/api/v1/auth/profile",
        headers=headers,
        json={"user_id": "adm-001", "email": "new@example.com"},
    ).status_code == 422
    with TestingSessionLocal() as db:
        assert db.get(User, "adm-001").email == "admin@test.civicone.test"
        assert db.get(User, "cit-001").email == "citizen@test.civicone.test"

def test_password_change_verifies_current_password_and_revokes_refresh_sessions():
    login_response = client.post("/api/v1/auth/login", json={
        "email": "citizen@test.civicone.test",
        "password": "Pass#1234",
        "portal": "citizen",
    })
    assert login_response.status_code == 200
    tokens = login_response.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    wrong_current = client.post(
        "/api/v1/auth/password/change",
        headers=headers,
        json={"current_password": "wrong-password", "new_password": "NextPass#1234"},
    )
    assert wrong_current.status_code == 403

    changed = client.post(
        "/api/v1/auth/password/change",
        headers=headers,
        json={"current_password": "Pass#1234", "new_password": "NextPass#1234"},
    )
    assert changed.status_code == 200
    assert client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    ).status_code == 401
    with TestingSessionLocal() as db:
        session = db.scalar(select(RefreshSession).where(
            RefreshSession.user_id == "cit-001",
            RefreshSession.token_hash.is_not(None),
        ))
        assert session is not None
        assert session.is_revoked is True
        assert verify_password("NextPass#1234", db.get(User, "cit-001").password_hash)

    new_login = client.post("/api/v1/auth/login", json={
        "email": "citizen@test.civicone.test",
        "password": "NextPass#1234",
        "portal": "citizen",
    })
    assert new_login.status_code == 200
