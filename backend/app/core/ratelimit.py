"""
Lightweight, database-backed rate limiter for CivicOne.

Uses the existing ``audit_events`` table as a sliding-window event log so
that no additional infrastructure (Redis, Memcached, etc.) is required.
This is suitable for the current project scale and avoids adding external
dependencies.

Usage::

    from .ratelimit import check_rate_limit, RateLimitExceeded

    try:
        check_rate_limit(db, key="pw_reset:1.2.3.4", limit=5, window_minutes=60)
    except RateLimitExceeded:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests")
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import AuditEvent


class RateLimitExceeded(Exception):
    """Raised when the caller has exceeded the configured rate limit."""


def check_rate_limit(
    db: Session,
    key: str,
    limit: int,
    window_minutes: int,
) -> None:
    """
    Count ``AuditEvent`` rows with ``action == key`` in the last
    *window_minutes* and raise ``RateLimitExceeded`` if the count equals
    or exceeds *limit*.

    The *key* encodes both the action name and the identifier being limited
    (e.g. ``"pw_reset_rate:127.0.0.1"``).

    This function performs a read-only query; callers are responsible for
    writing the audit event that represents the attempt.
    """
    window_start = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    count = db.scalar(
        select(func.count()).where(
            AuditEvent.action == key,
            AuditEvent.created_at >= window_start,
        )
    ) or 0

    if count >= limit:
        raise RateLimitExceeded(
            f"Rate limit of {limit} requests per {window_minutes} min exceeded for key '{key}'"
        )

