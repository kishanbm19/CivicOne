"""
Secure file validation and storage service for CivicOne.

Provides:
- Magic-byte / header inspection to detect genuine file type.
- Strict extension + MIME type validation with whitelist.
- Path traversal defense using secure filename hashing and canonical path verification.
- Safe file size limits.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path
from fastapi import HTTPException, status
from ..core.config import settings

# Allowed file extensions and corresponding MIME types
ALLOWED_DOCUMENT_EXTENSIONS: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
    ".txt": {"text/plain"},
}

ALLOWED_IMAGE_EXTENSIONS: dict[str, set[str]] = {
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
    ".gif": {"image/gif"},
}

# Magic byte signatures
MAGIC_SIGNATURES: list[tuple[bytes, str]] = [
    (b"%PDF-", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"RIFF", "image/webp"),  # WEBP has RIFF....WEBP
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
]


def detect_mime_type(content: bytes, declared_mime: str | None = None) -> str:
    """
    Detect MIME type strictly using file magic bytes, only allowing text/plain
    fallback when explicitly declared and verified to be valid text.
    """
    if not content:
        return "application/octet-stream"

    # Check known binary magic signatures
    for sig, mime in MAGIC_SIGNATURES:
        if content.startswith(sig):
            if sig == b"RIFF":
                if len(content) >= 12 and content[8:12] == b"WEBP":
                    return "image/webp"
            else:
                return mime

    # Only treat as text/plain if declared as text and contains no binary/NULL bytes
    if declared_mime == "text/plain" and b"\x00" not in content[:1024]:
        try:
            content[:1024].decode("utf-8")
            return "text/plain"
        except UnicodeDecodeError:
            pass

    return "application/octet-stream"


def get_canonical_storage_path(filename: str, base_dir: str | None = None) -> str:
    """
    Resolve and verify that the target path remains strictly within base_dir (path traversal guard).
    """
    base = Path(base_dir or settings.UPLOAD_DIRECTORY).resolve()
    base.mkdir(parents=True, exist_ok=True)
    target = (base / filename).resolve()

    if not str(target).startswith(str(base)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path: path traversal detected.",
        )
    return str(target)


def validate_and_save_upload(
    filename: str,
    content: bytes,
    declared_content_type: str | None,
    allowed_types: dict[str, set[str]],
    prefix: str = "doc",
    max_size_mb: int | None = None,
) -> tuple[str, str, int]:
    """
    Validates uploaded file size, extension, magic signature, and writes it securely.

    Returns:
        tuple of (safe_filename, verified_mime_type, file_size_in_bytes)
    """
    limit_mb = max_size_mb or settings.MAX_UPLOAD_SIZE_MB
    max_bytes = limit_mb * 1024 * 1024
    content_len = len(content)

    if content_len == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if content_len > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {limit_mb}MB.",
        )

    # Sanitize and extract extension
    orig_name = os.path.basename(filename or "")
    ext = os.path.splitext(orig_name)[1].lower()

    if ext not in allowed_types:
        allowed_list = ", ".join(sorted(allowed_types.keys()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {allowed_list}",
        )

    # Verify magic signature matches allowed MIME types for this extension
    detected_mime = detect_mime_type(content, declared_content_type)
    expected_mimes = allowed_types[ext]

    if detected_mime not in expected_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content does not match extension '{ext}'. Detected type: {detected_mime}",
        )

    # Generate unguessable safe filename
    random_token = secrets.token_hex(16)
    safe_filename = f"{prefix}_{random_token}{ext}"

    # Verify canonical path and write file
    dest_path = get_canonical_storage_path(safe_filename)
    with open(dest_path, "wb") as f:
        f.write(content)

    return safe_filename, detected_mime, content_len
