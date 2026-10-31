"""
Tests for private document access control and secure file upload validation.
"""
import io
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.models import User, Department, Organization, DepartmentMembership, Document, AuditEvent
from app.core.config import settings

TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    Base.metadata.create_all(engine)
    app.dependency_overrides[get_db] = override_get_db

    test_storage = tmp_path / "storage"
    test_storage.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "UPLOAD_DIRECTORY", str(test_storage))

    with TestingSessionLocal() as db:
        org = Organization(id="org-trans", name="Transport Org", domain="transport")
        dept_bus = Department(id="dept-bus", organization_id="org-trans", name="Bus Ops", category_key="bus")
        dept_roads = Department(id="dept-roads", organization_id="org-trans", name="Roads", category_key="roads")
        db.add_all([org, dept_bus, dept_roads])
        db.flush()

        citizen = User(id="u-cit", email="citizen@test.local", full_name="Test Citizen", role="citizen", password_hash=hash_password("pw"))
        staff_bus = User(id="u-bus-staff", email="bus_staff@test.local", full_name="Bus Staff", role="staff", password_hash=hash_password("pw"))
        staff_other = User(id="u-other-staff", email="other_staff@test.local", full_name="Other Staff", role="staff", password_hash=hash_password("pw"))
        admin = User(id="u-admin", email="admin@test.local", full_name="Platform Admin", role="platform_admin", password_hash=hash_password("pw"))
        db.add_all([citizen, staff_bus, staff_other, admin])
        db.flush()

        db.add(DepartmentMembership(user_id=staff_bus.id, department_id=dept_bus.id, role_in_dept="staff"))
        db.add(DepartmentMembership(user_id=staff_other.id, department_id=dept_roads.id, role_in_dept="staff"))
        db.commit()

    yield

    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(engine)


def auth_headers(user_id: str) -> dict:
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_public_published_document_accessible_without_auth():
    with TestingSessionLocal() as db:
        doc = Document(
            id="doc-pub-1",
            title="Public Transit Schedule",
            service_domain="transport",
            department_id="dept-bus",
            status="published",
            is_public=True,
            author_id="u-bus-staff",
            file_path="/uploads/sample.pdf",
            mime_type="application/pdf",
        )
        db.add(doc)
        db.commit()

    dest_path = os.path.join(settings.UPLOAD_DIRECTORY, "sample.pdf")
    with open(dest_path, "wb") as f:
        f.write(b"%PDF-1.4 test public file content")

    res_details = client.get("/api/v1/documents/doc-pub-1")
    assert res_details.status_code == 200
    assert res_details.json()["title"] == "Public Transit Schedule"

    res_dl = client.get("/api/v1/documents/doc-pub-1/download")
    assert res_dl.status_code == 200
    assert res_dl.content == b"%PDF-1.4 test public file content"
    assert res_dl.headers["content-type"] == "application/pdf"


def test_private_document_rejected_for_anonymous_and_citizen():
    with TestingSessionLocal() as db:
        doc = Document(
            id="doc-priv-1",
            title="Confidential Internal Audit",
            service_domain="transport",
            department_id="dept-bus",
            status="draft",
            is_public=False,
            author_id="u-bus-staff",
            file_path="/uploads/audit.pdf",
            mime_type="application/pdf",
        )
        db.add(doc)
        db.commit()

    res_anon = client.get("/api/v1/documents/doc-priv-1")
    assert res_anon.status_code == 401

    res_anon_dl = client.get("/api/v1/documents/doc-priv-1/download")
    assert res_anon_dl.status_code == 401

    cit_headers = auth_headers("u-cit")
    res_cit = client.get("/api/v1/documents/doc-priv-1", headers=cit_headers)
    assert res_cit.status_code == 403

    res_cit_dl = client.get("/api/v1/documents/doc-priv-1/download", headers=cit_headers)
    assert res_cit_dl.status_code == 403


def test_private_document_authorized_for_author_and_dept_staff():
    with TestingSessionLocal() as db:
        doc = Document(
            id="doc-dept-1",
            title="Bus Operations Internal Manual",
            service_domain="transport",
            department_id="dept-bus",
            status="review",
            is_public=False,
            author_id="u-bus-staff",
            file_path="/uploads/bus_manual.pdf",
            mime_type="application/pdf",
        )
        db.add(doc)
        db.commit()

    dest_path = os.path.join(settings.UPLOAD_DIRECTORY, "bus_manual.pdf")
    with open(dest_path, "wb") as f:
        f.write(b"%PDF-1.4 bus manual bytes")

    staff_headers = auth_headers("u-bus-staff")
    res_meta = client.get("/api/v1/documents/doc-dept-1", headers=staff_headers)
    assert res_meta.status_code == 200

    res_dl = client.get("/api/v1/documents/doc-dept-1/download", headers=staff_headers)
    assert res_dl.status_code == 200
    assert res_dl.content == b"%PDF-1.4 bus manual bytes"

    other_headers = auth_headers("u-other-staff")
    res_denied = client.get("/api/v1/documents/doc-dept-1", headers=other_headers)
    assert res_denied.status_code == 403

    admin_headers = auth_headers("u-admin")
    res_admin = client.get("/api/v1/documents/doc-dept-1", headers=admin_headers)
    assert res_admin.status_code == 403
    assert client.get("/api/v1/documents", headers=admin_headers).json() == []

    exceptional = client.post(
        "/api/v1/documents/doc-dept-1/admin-access",
        headers=admin_headers,
        json={"reason": "Investigating an approved security incident"},
    )
    assert exceptional.status_code == 200
    assert exceptional.json()["id"] == "doc-dept-1"
    with TestingSessionLocal() as db:
        event = db.scalar(
            select(AuditEvent).where(
                AuditEvent.action == "SENSITIVE_DOCUMENT_ACCESSED",
                AuditEvent.resource_id == "doc-dept-1",
            )
        )
        assert event is not None
        assert event.actor_id == "u-admin"
        assert "approved security incident" in event.details


def test_upload_valid_pdf_success():
    headers = auth_headers("u-bus-staff")
    pdf_content = b"%PDF-1.7 valid document content"
    files = {"file": ("schedule.pdf", io.BytesIO(pdf_content), "application/pdf")}
    data = {
        "title": "New Bus Schedule",
        "service_domain": "transport",
        "category": "announcement",
        "is_public": "true",
    }
    res = client.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
    assert res.status_code == 200
    doc = res.json()
    assert doc["title"] == "New Bus Schedule"
    assert doc["mime_type"] == "application/pdf"
    assert doc["file_size"] == len(pdf_content)

    res_dl = client.get(doc["download_url"], headers=headers)
    assert res_dl.status_code == 200
    assert res_dl.content == pdf_content


def test_upload_rejects_disallowed_extension():
    headers = auth_headers("u-bus-staff")
    files = {"file": ("script.py", io.BytesIO(b"print('hello')"), "text/x-python")}
    data = {"title": "Code Upload", "service_domain": "transport"}
    res = client.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]


def test_upload_rejects_mime_spoofing():
    headers = auth_headers("u-bus-staff")
    invalid_pdf = b"not a real pdf file at all, just plain text"
    files = {"file": ("fake.pdf", io.BytesIO(invalid_pdf), "application/pdf")}
    data = {"title": "Spoofed Document", "service_domain": "transport"}
    res = client.post("/api/v1/documents/upload", headers=headers, data=data, files=files)
    assert res.status_code == 400
    assert "does not match extension" in res.json()["detail"]


def test_complaint_image_upload_magic_byte_validation():
    cit_headers = auth_headers("u-cit")
    complaint = client.post(
        "/api/v1/complaints",
        headers=cit_headers,
        json={
            "domain": "transport",
            "title": "Damaged bus shelter",
            "description": "The shelter glass is broken and unsafe.",
            "category": "bus_stop_damage",
            "address": "Central station road",
        },
    )
    assert complaint.status_code == 201
    complaint_id = complaint.json()["id"]

    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..."
    files = {"file": ("pothole.png", io.BytesIO(valid_png), "image/png")}
    res_ok = client.post(
        f"/api/v1/complaints/{complaint_id}/image",
        headers=cit_headers,
        files=files,
    )
    assert res_ok.status_code == 200
    assert "image_url" in res_ok.json()
    image = client.get(f"/api/v1/complaints/{complaint_id}/image", headers=cit_headers)
    assert image.status_code == 200
    assert image.content == valid_png
    assert client.get("/uploads/complaint_image.png").status_code == 404

    invalid_jpg = b"random binary string that is definitely not a jpeg"
    files_bad = {"file": ("pothole.jpg", io.BytesIO(invalid_jpg), "image/jpeg")}
    res_bad = client.post(
        f"/api/v1/complaints/{complaint_id}/image",
        headers=cit_headers,
        files=files_bad,
    )
    assert res_bad.status_code == 400
    assert "does not match extension" in res_bad.json()["detail"]


def test_platform_admin_requires_audited_reason_for_complaint_image_access():
    citizen_headers = auth_headers("u-cit")
    complaint = client.post(
        "/api/v1/complaints",
        headers=citizen_headers,
        json={
            "domain": "transport",
            "title": "Damaged bus shelter",
            "description": "The shelter glass is broken and unsafe.",
            "category": "bus_stop_damage",
            "address": "Central station road",
        },
    )
    complaint_id = complaint.json()["id"]
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..."
    upload = client.post(
        f"/api/v1/complaints/{complaint_id}/image",
        headers=citizen_headers,
        files={"file": ("shelter.png", io.BytesIO(valid_png), "image/png")},
    )
    assert upload.status_code == 200

    admin_headers = auth_headers("u-admin")
    assert client.get(
        f"/api/v1/complaints/{complaint_id}/image", headers=admin_headers
    ).status_code == 404
    denied = client.post(
        f"/api/v1/complaints/{complaint_id}/admin-image",
        headers=admin_headers,
        json={"reason": " "},
    )
    assert denied.status_code == 422

    response = client.post(
        f"/api/v1/complaints/{complaint_id}/admin-image",
        headers=admin_headers,
        json={"reason": "Investigating a formally reported service safety incident"},
    )
    assert response.status_code == 200
    assert response.content == valid_png
    with TestingSessionLocal() as db:
        event = db.scalar(
            select(AuditEvent).where(
                AuditEvent.action == "SENSITIVE_COMPLAINT_ATTACHMENT_ACCESSED",
                AuditEvent.resource_type == "complaint",
                AuditEvent.resource_id == complaint_id,
            )
        )
        assert event is not None
        assert event.actor_id == "u-admin"
        assert "Investigating a formally reported" in event.details
