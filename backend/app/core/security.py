import secrets
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from .config import settings

_ph = PasswordHasher()

def hash_password(p: str) -> str:
    return _ph.hash(p)

def verify_password(p: str, h: str) -> bool:
    try:
        return _ph.verify(h, p)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False

def create_access_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "type": "access", "exp": exp}, settings.JWT_SECRET_KEY, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    # 7-day refresh token
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "type": "refresh", "exp": exp, "jti": secrets.token_hex(16)}, settings.JWT_SECRET_KEY, algorithm="HS256")

def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") and payload.get("type") != "access":
            return None
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

def decode_refresh_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except jwt.PyJWTError:
        return None
