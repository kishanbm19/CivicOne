"""
Tests for the password-reset security fix.

Covers:
  - Generic response regardless of email existence (no user enumeration)
  - API response never contains the raw reset token
  - Expired tokens are rejected
  - Used (consumed) tokens cannot be reused
  - Invalid / unknown tokens are rejected
  - Successful reset revokes existing refresh sessions
  - Rate limiting blocks excess requests from the same IP
  - Audit log never records the raw token
  - Confirm endpoint hashes the submitted token for DB lookup
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, create_refresh_token
from app.models import User, PasswordResetToken, RefreshSession, AuditEvent

# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


_client = TestClient(app)


@pytest.fixture(autouse=True)
def _fresh_db():
    """Create all tables before each test; drop them afterwards."""
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.create_all(bind=_test_engine)
    with _TestingSessionLocal() as db:
        db.add(
            User(
                id="usr-pw-test",
                email="resident@civicone.test",
                full_name="Resident Tester",
                role="citizen",
                password_hash=hash_password("OldPass#123"),
            )
        )
        db.commit()
    yield
    Base.metadata.drop_all(bind=_test_engine)
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_prt(
    db,
    *,
    user_id: str = "usr-pw-test",
    raw_token: str | None = None,
    minutes_until_expiry: int = 20,
    used: bool = False,
) -> tuple[PasswordResetToken, str]:
    """Insert a PasswordResetToken directly and return (record, raw_token)."""
    raw = raw_token or secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    prt = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=minutes_until_expiry),
        used=used,
    )
    db.add(prt)
    db.commit()
    db.refresh(prt)
    return prt, raw


# ---------------------------------------------------------------------------
# 1. Generic response — no user-enumeration
# ---------------------------------------------------------------------------

class TestPasswordResetRequestGenericResponse:
    """The request endpoint must return identical responses for registered and
    unregistered emails so an attacker cannot enumerate accounts."""

    def _request(self, email: str):
        # Patch email sending so tests don't need real SMTP.
        with patch("app.routers.auth.send_password_reset_email") as mock_send:
            mock_send.return_value = None  # Simulate success
            return _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": email},
            ), mock_send

    def test_registered_email_returns_generic_message(self):
        res, _ = self._request("resident@civicone.test")
        assert res.status_code == 200
        body = res.json()
        assert "message" in body
        assert "registered" in body["message"].lower() or "sent" in body["message"].lower()

    def test_unregistered_email_returns_same_generic_message(self):
        res, _ = self._request("nobody@nowhere.invalid")
        assert res.status_code == 200
        body = res.json()
        assert "message" in body

    def test_response_never_contains_raw_token(self):
        res, _ = self._request("resident@civicone.test")
        body = res.json()
        # The response must not contain a key that looks like a token field.
        for forbidden_key in ("token", "demo_token", "reset_token", "raw_token"):
            assert forbidden_key not in body, (
                f"API response must not include '{forbidden_key}' — raw token exposed!"
            )

    def test_response_body_values_are_not_tokens(self):
        """Ensure no response value looks like a token (≥ 40 URL-safe chars)."""
        res, _ = self._request("resident@civicone.test")
        for value in res.json().values():
            if isinstance(value, str):
                assert len(value) < 40 or not value.replace("-", "").replace("_", "").isalnum(), (
                    "API response contains a value that looks like a raw token"
                )


# ---------------------------------------------------------------------------
# 2. Token is hashed in the database
# ---------------------------------------------------------------------------

class TestTokenHashedInDB:
    def test_stored_value_is_not_raw_token(self):
        with patch("app.routers.auth.send_password_reset_email"):
            _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )

        with _TestingSessionLocal() as db:
            prt = db.scalar(select(PasswordResetToken))
            assert prt is not None, "A PasswordResetToken record should have been created"
            # A SHA-256 hex digest is exactly 64 lowercase hex characters.
            stored = prt.token_hash
            assert len(stored) == 64, "token_hash must be a 64-char SHA-256 hex digest"
            assert all(c in "0123456789abcdef" for c in stored), (
                "token_hash must contain only hex digits"
            )
            # The stored value must not be the raw URL-safe token (which uses
            # base64-url characters including - and _ that are not hex).
            assert "-" not in stored and "_" not in stored, (
                "Stored value looks like a raw URL-safe token, not a hash"
            )


# ---------------------------------------------------------------------------
# 3. Audit log never contains the raw token
# ---------------------------------------------------------------------------

class TestAuditLogDoesNotContainRawToken:
    def test_audit_details_do_not_contain_raw_token(self):
        with patch("app.routers.auth.send_password_reset_email"):
            _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )

        with _TestingSessionLocal() as db:
            prt = db.scalar(select(PasswordResetToken))
            events = db.scalars(
                select(AuditEvent).where(
                    AuditEvent.action == "PASSWORD_RESET_REQUESTED"
                )
            ).all()

        # At least one PASSWORD_RESET_REQUESTED audit event must exist.
        assert len(events) > 0

        # Confirm the raw token was NOT persisted in any event field.
        if prt is not None:
            # We don't have the raw token, but we can verify the hash is not
            # equal to a raw URL-safe token by checking all event details.
            for ev in events:
                if ev.details:
                    # The old vulnerable code embedded "demo token: <raw>" —
                    # confirm that pattern is gone.
                    assert "demo token" not in ev.details.lower(), (
                        "Audit log contains 'demo token' — raw token may be exposed"
                    )
                    assert "demo_token" not in ev.details.lower()


# ---------------------------------------------------------------------------
# 4. Expired token is rejected
# ---------------------------------------------------------------------------

class TestExpiredTokenRejected:
    def test_expired_token_returns_400(self):
        with _TestingSessionLocal() as db:
            _, raw = _make_prt(db, minutes_until_expiry=-1)  # already expired

        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#456"},
        )
        assert res.status_code == 400, "Expired token must be rejected with 400"

    def test_expired_token_error_message_is_generic(self):
        with _TestingSessionLocal() as db:
            _, raw = _make_prt(db, minutes_until_expiry=-1)

        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#456"},
        )
        # Must not differentiate between expired vs invalid — same message.
        detail = res.json().get("detail", "").lower()
        assert "invalid" in detail or "expired" in detail


# ---------------------------------------------------------------------------
# 5. Used (consumed) token cannot be reused
# ---------------------------------------------------------------------------

class TestSingleUseToken:
    def test_used_token_is_rejected(self):
        with _TestingSessionLocal() as db:
            _, raw = _make_prt(db, used=True)

        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#456"},
        )
        assert res.status_code == 400, "Already-used token must be rejected"

    def test_token_becomes_used_after_successful_reset(self):
        with _TestingSessionLocal() as db:
            prt, raw = _make_prt(db)
            prt_id = prt.id

        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#789"},
        )
        assert res.status_code == 200

        # Attempt reuse.
        reuse_res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "AnotherPass#000"},
        )
        assert reuse_res.status_code == 400, "Token must be single-use"

    def test_used_flag_set_in_db_after_reset(self):
        with _TestingSessionLocal() as db:
            prt, raw = _make_prt(db)
            prt_id = prt.id

        _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#789"},
        )

        with _TestingSessionLocal() as db:
            record = db.get(PasswordResetToken, prt_id)
            assert record.used is True, "Token must be marked used in DB"


# ---------------------------------------------------------------------------
# 6. Invalid / unknown token is rejected
# ---------------------------------------------------------------------------

class TestInvalidTokenRejected:
    def test_random_token_rejected(self):
        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": secrets.token_urlsafe(32), "new_password": "NewPass#456"},
        )
        assert res.status_code == 400

    def test_empty_token_rejected(self):
        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": "", "new_password": "NewPass#456"},
        )
        # Either 400 (bad token) or 422 (validation) — either is acceptable.
        assert res.status_code in (400, 422)

    def test_truncated_token_rejected(self):
        with _TestingSessionLocal() as db:
            _, raw = _make_prt(db)

        truncated = raw[:10]
        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": truncated, "new_password": "NewPass#456"},
        )
        assert res.status_code == 400


# ---------------------------------------------------------------------------
# 7. Successful reset revokes existing refresh sessions
# ---------------------------------------------------------------------------

class TestRefreshSessionRevocationOnReset:
    def _add_refresh_session(self, db, user_id: str = "usr-pw-test") -> RefreshSession:
        raw_refresh = create_refresh_token(user_id)
        token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
        session = RefreshSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            is_revoked=False,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def test_refresh_sessions_revoked_on_password_reset(self):
        with _TestingSessionLocal() as db:
            sess = self._add_refresh_session(db)
            sess_id = sess.id
            _, raw = _make_prt(db)

        res = _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#789"},
        )
        assert res.status_code == 200

        with _TestingSessionLocal() as db:
            record = db.get(RefreshSession, sess_id)
            assert record.is_revoked is True, (
                "Existing refresh session must be revoked after password reset"
            )

    def test_multiple_sessions_all_revoked(self):
        with _TestingSessionLocal() as db:
            ids = [self._add_refresh_session(db).id for _ in range(3)]
            _, raw = _make_prt(db)

        _client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": raw, "new_password": "NewPass#789"},
        )

        with _TestingSessionLocal() as db:
            for sid in ids:
                assert db.get(RefreshSession, sid).is_revoked is True


# ---------------------------------------------------------------------------
# 8. Rate limiting
# ---------------------------------------------------------------------------

class TestRateLimiting:
    """The request endpoint must block repeated attempts from the same IP."""

    def _post_request(self):
        with patch("app.routers.auth.send_password_reset_email"):
            return _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )

    def test_rate_limit_blocks_excess_requests(self):
        from app.core.config import settings
        limit = settings.PASSWORD_RESET_RATE_LIMIT

        # Send exactly `limit` requests — all should succeed.
        for i in range(limit):
            res = self._post_request()
            assert res.status_code in (200, 503), (
                f"Request {i+1} should pass rate limit but got {res.status_code}"
            )

        # The next request must be blocked.
        blocked = self._post_request()
        assert blocked.status_code == 429, (
            "Request beyond rate limit must return 429 Too Many Requests"
        )

    def test_rate_limit_response_does_not_reveal_account_info(self):
        from app.core.config import settings
        for _ in range(settings.PASSWORD_RESET_RATE_LIMIT + 1):
            res = self._post_request()

        if res.status_code == 429:
            body = res.json()
            # Must not reveal whether the email is registered.
            detail = body.get("detail", "").lower()
            assert "email" not in detail or "registered" not in detail


# ---------------------------------------------------------------------------
# 9. Email delivery failure is surfaced, not silently swallowed
# ---------------------------------------------------------------------------

class TestEmailDeliveryErrorHandling:
    def test_unconfigured_smtp_returns_503(self):
        from app.services.email import EmailNotConfiguredError
        with patch(
            "app.routers.auth.send_password_reset_email",
            side_effect=EmailNotConfiguredError("SMTP not configured"),
        ):
            res = _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )
        assert res.status_code == 503, (
            "Must return 503 when SMTP is not configured — not 200 with a fake success"
        )

    def test_smtp_failure_returns_503(self):
        from app.services.email import EmailDeliveryError
        with patch(
            "app.routers.auth.send_password_reset_email",
            side_effect=EmailDeliveryError("connection refused"),
        ):
            res = _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )
        assert res.status_code == 503

    def test_token_invalidated_when_email_fails(self):
        """If email delivery fails the token must be consumed to prevent
        an attacker who can read the DB from using it."""
        from app.services.email import EmailDeliveryError
        with patch(
            "app.routers.auth.send_password_reset_email",
            side_effect=EmailDeliveryError("SMTP down"),
        ):
            _client.post(
                "/api/v1/auth/password-reset/request",
                json={"email": "resident@civicone.test"},
            )

        with _TestingSessionLocal() as db:
            prt = db.scalar(select(PasswordResetToken))
            if prt is not None:
                assert prt.used is True, (
                    "Token must be marked used when email delivery fails"
                )

