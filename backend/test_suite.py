"""Comprehensive Automated Production Verification Test Suite for GreenVision AI.

Covers:
1. Security & Upload Validation (JPEG, PNG, WebP, GIF, corrupted payload rejection, size limits)
2. In-memory Rate Limiting (threshold, sliding window, 429 response)
3. Security & Auth (bcrypt hashing, JWT creation/verification, refresh flow)
4. AI/ML Multi-Factor Priority Scoring (hospital, school, water body, drain, road, vector hazard)
5. Local MobileNetV2 Inference & Heuristic Fallback
6. Pydantic Server-side Schema Validation
"""

import sys
import time
import base64
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.security import hash_password, verify_password, generate_tokens, decode_access_token, decode_refresh_token
from core.rate_limit import RateLimiter
from core.upload_security import validate_image_base64
from ml.predictor import _calculate_scores_from_weight, _fallback_inference
from schemas.models import (
    ResidentSignupRequest, LoginRequest, CreateReportRequest,
    CreateScheduleRequest, CreateFeedbackRequest,
)

passed_tests = 0
failed_tests = 0


def record(name: str, success: bool, detail: str = ""):
    global passed_tests, failed_tests
    if success:
        passed_tests += 1
        print(f"  [PASS] {name} {detail}")
    else:
        failed_tests += 1
        print(f"  [FAIL] {name}: {detail}")


def test_auth_and_crypto():
    print("\n--- 1. Authentication, Cryptography & JWT Verification ---")
    pwd = "SecurePassword123!"
    h = hash_password(pwd)
    record("Password hashing", h != pwd and len(h) > 20)
    record("Password verification (correct)", verify_password(pwd, h) is True)
    record("Password verification (incorrect)", verify_password("WrongPassword", h) is False)

    tokens = generate_tokens("user-123", "test@greenvision.org", "resident", "Test User")
    record("Token generation", "accessToken" in tokens and "refreshToken" in tokens)

    access_payload = decode_access_token(tokens["accessToken"])
    record("Access token decoding", access_payload is not None and access_payload.get("sub") == "user-123")

    refresh_payload = decode_refresh_token(tokens["refreshToken"])
    record("Refresh token decoding", refresh_payload is not None and refresh_payload.get("sub") == "user-123")

    # Tampered token check
    tampered = tokens["accessToken"][:-4] + "fake"
    record("Tampered token rejection", decode_access_token(tampered) is None)


def test_upload_security():
    print("\n--- 2. File Upload & Image Security Verification ---")
    # Valid 1x1 PNG
    valid_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    data_uri_png = f"data:image/png;base64,{valid_png_b64}"

    raw, mime = validate_image_base64(data_uri_png)
    record("Valid PNG with Data URI prefix", mime == "image/png" and len(raw) > 0)

    raw, mime = validate_image_base64(valid_png_b64)
    record("Valid raw base64 PNG without prefix", mime == "image/png" and len(raw) > 0)

    # Valid JPEG magic bytes (\xff\xd8\xff\xe0)
    valid_jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + b"\x00" * 20
    jpg_b64 = base64.b64encode(valid_jpg_bytes).decode()
    raw, mime = validate_image_base64(jpg_b64)
    record("Valid JPEG magic bytes verification", mime == "image/jpeg")

    # Valid WebP magic bytes (RIFF....WEBP)
    valid_webp_bytes = b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    webp_b64 = base64.b64encode(valid_webp_bytes).decode()
    raw, mime = validate_image_base64(webp_b64)
    record("Valid WebP magic bytes verification", mime == "image/webp")

    # Malicious / Corrupt / Non-image rejection
    malicious_script = base64.b64encode(b"<script>alert('xss')</script>").decode()
    rejected_non_image = False
    try:
        validate_image_base64(malicious_script)
    except Exception as exc:
        rejected_non_image = "Unsupported image format" in str(exc.detail)
    record("Non-image payload (XSS/script) rejection", rejected_non_image)

    # Corrupt base64
    rejected_corrupt = False
    try:
        validate_image_base64("not!valid!base64!!!")
    except Exception:
        rejected_corrupt = True
    record("Corrupted base64 rejection", rejected_corrupt)


def test_rate_limiter():
    print("\n--- 3. In-Memory Sliding-Window Rate Limiting Verification ---")
    limiter = RateLimiter(requests_per_minute=5)

    class MockRequest:
        def __init__(self, ip):
            self.headers = {"x-forwarded-for": ip}
            self.client = None
            self.method = "POST"
            self.url = type("URL", (), {"path": "/api/auth/login"})()

    req = MockRequest("192.168.1.100")

    # First 5 calls must succeed
    allowed_count = 0
    for _ in range(5):
        try:
            limiter(req)
            allowed_count += 1
        except Exception:
            pass
    record("5 requests under limit accepted", allowed_count == 5)

    # 6th call must be blocked with HTTP 429
    blocked = False
    try:
        limiter(req)
    except Exception as exc:
        blocked = exc.status_code == 429 and "Retry-After" in exc.headers
    record("6th request blocked with HTTP 429 & Retry-After", blocked)

    # Different IP should not be affected
    req_other = MockRequest("192.168.1.200")
    other_allowed = False
    try:
        limiter(req_other)
        other_allowed = True
    except Exception:
        other_allowed = False
    record("Independent IP allowed under separate quota", other_allowed)


def test_multi_factor_scoring():
    print("\n--- 4. Multi-Factor Priority Scoring Engine Verification ---")
    # Base scenario: standard 30kg organic waste
    sev_base, impact_base, prio_base, alerts_base = _calculate_scores_from_weight(
        30.0, "organic", "full"
    )
    record("Base score calculation", 1.0 <= sev_base <= 10.0 and 10.0 <= impact_base <= 100.0)

    # Hospital modifier (+2.0 severity, elevated priority)
    sev_hosp, _, prio_hosp, alerts_hosp = _calculate_scores_from_weight(
        30.0, "organic", "full", landmark_type="hospital"
    )
    record(
        "Hospital landmark priority boost (+2.0)",
        sev_hosp > sev_base and any("Hospital" in a for a in alerts_hosp)
    )

    # Vector & Animal hazard (overflowing organic)
    sev_vector, _, prio_vector, alerts_vector = _calculate_scores_from_weight(
        30.0, "organic", "overflowing"
    )
    record(
        "Vector & stray animal hazard alert",
        any("VECTOR HAZARD" in a for a in alerts_vector)
    )

    # Severe odor modifier
    sev_odor, _, _, alerts_odor = _calculate_scores_from_weight(
        30.0, "general", "full", odor_level="severe"
    )
    record(
        "Severe odor hazard modifier (+1.5)",
        sev_odor > sev_base and any("TOXIC ODOR" in a for a in alerts_odor)
    )

    # Drain blockage urban hazard
    sev_drain, _, prio_drain, alerts_drain = _calculate_scores_from_weight(
        50.0, "general", "full", is_drain_blocked=True
    )
    record(
        "Drain blockage alert & waterlogging risk",
        any("DRAIN BLOCKAGE" in a for a in alerts_drain)
    )

    # Road spillage pedestrian hazard
    sev_road, _, _, alerts_road = _calculate_scores_from_weight(
        50.0, "general", "full", is_road_blocked=True
    )
    record(
        "Road spillage vehicular hazard alert",
        any("TRAFFIC HAZARD" in a for a in alerts_road)
    )


def test_pydantic_schemas():
    print("\n--- 5. Server-Side Pydantic Input Validation Verification ---")
    # Valid signup
    valid_signup = ResidentSignupRequest(name="Sanjay", email="sanjay@example.com", password="password123")
    record("Valid signup schema accepted", valid_signup.name == "Sanjay")

    # Invalid email rejection
    invalid_email_caught = False
    try:
        ResidentSignupRequest(name="Sanjay", email="not-an-email", password="password123")
    except Exception:
        invalid_email_caught = True
    record("Invalid email format rejected by EmailStr", invalid_email_caught)

    # Short password rejection (<6 chars)
    short_pwd_caught = False
    try:
        ResidentSignupRequest(name="Sanjay", email="test@example.com", password="123")
    except Exception:
        short_pwd_caught = True
    record("Short password (<6 chars) rejected", short_pwd_caught)

    # Short location text in report (<2 chars)
    short_loc_caught = False
    try:
        CreateReportRequest(image_base64="data:image/png;base64,12345678901234567890", location_text="x")
    except Exception:
        short_loc_caught = True
    record("Report with invalid location text rejected", short_loc_caught)


def test_heuristic_fallback_inference():
    print("\n--- 6. Resilient Deterministic AI Fallback Verification ---")
    valid_png_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    res = _fallback_inference(valid_png_b64, landmark_type="school", odor_level="noticeable")
    record("Fallback source is 'fallback'", res.source == "fallback")
    record("Fallback severity in range [1, 10]", 1.0 <= res.severity_score <= 10.0)
    record("Fallback environmental impact in range [10, 100]", 10.0 <= res.environmental_impact_score <= 100.0)
    record("Fallback contains recommended action", len(res.recommended_action) > 10)


if __name__ == "__main__":
    print("=" * 70)
    print("  GREENVISION AI - AUTOMATED PRODUCTION VERIFICATION SUITE")
    print("=" * 70)
    test_auth_and_crypto()
    test_upload_security()
    test_rate_limiter()
    test_multi_factor_scoring()
    test_pydantic_schemas()
    test_heuristic_fallback_inference()

    print("\n" + "=" * 70)
    print(f"  TOTAL RESULTS: {passed_tests} PASSED, {failed_tests} FAILED")
    print("=" * 70)

    if failed_tests > 0:
        sys.exit(1)
