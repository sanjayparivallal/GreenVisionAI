"""File upload and image security validation.

Protects against:
- Malicious payload injection (non-image files disguised as images)
- Denial of Service (excessively large base64 payloads)
- Unhandled decoding exceptions in ML pipeline
"""

import base64
import re
from typing import Tuple
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

# 15 MB max decoded image size
MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024


def validate_image_base64(image_base64: str) -> Tuple[bytes, str]:
    """
    Validates a base64 encoded image string.
    
    1. Checks presence and basic length.
    2. Strips data URL scheme prefix if present.
    3. Safely decodes base64 bytes and verifies size limit.
    4. Validates image magic bytes to ensure file is JPEG, PNG, WebP, or GIF.
    
    Returns:
        (decoded_bytes, detected_mime_type)
        
    Raises:
        HTTPException(400) if image is invalid, corrupt, or exceeds size limits.
    """
    if not image_base64 or not isinstance(image_base64, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data is required and must be a valid base64 string.",
        )

    # Strip data URL header (e.g., "data:image/jpeg;base64,")
    clean_b64 = re.sub(r"^data:image/[a-zA-Z0-9.+]+;base64,", "", image_base64).strip()

    if len(clean_b64) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image payload is too small to be a valid image.",
        )

    try:
        raw_bytes = base64.b64decode(clean_b64, validate=True)
    except Exception as exc:
        logger.warning("[UploadSecurity] Failed to decode base64: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoding in image payload.",
        )

    if len(raw_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds the maximum allowed limit of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    # Verify image magic bytes
    detected_mime = _detect_image_mime(raw_bytes)
    if not detected_mime:
        logger.warning("[UploadSecurity] Rejected file with unknown magic bytes: %s", raw_bytes[:16])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed formats are JPEG, PNG, WebP, and GIF.",
        )

    return raw_bytes, detected_mime


def _detect_image_mime(header: bytes) -> str | None:
    """Detects image MIME type from binary magic bytes."""
    if len(header) < 12:
        return None

    # JPEG: starts with FF D8 FF
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # WebP: RIFF .... WEBP
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"

    # GIF: GIF87a or GIF89a
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "image/gif"

    return None

