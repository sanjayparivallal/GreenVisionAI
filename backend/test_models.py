"""Comprehensive model test suite for GreenVision AI.

Tests:
1. USE_LOCAL_MODEL=True (Local MobileNetV2 dual-head classifier)
2. USE_LOCAL_MODEL=False (Cloud Vision API via VISION_KEY)
3. Heuristic fallback when cloud/local are unavailable
4. Response schema validation & mathematical scoring consistency
"""

import os
import sys
import json
import base64
import asyncio
from pathlib import Path

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.config import get_settings
from ml.predictor import analyze_waste_image, AnalysisResult


def get_sample_image_base64() -> str:
    """Find a real sample image from the dataset or fallback to a dummy image."""
    img_candidates = [
        BACKEND_DIR / "ml" / "training" / "data" / "overflow_hf" / "Garbage_Bin_overflow_00001.jpg",
        BACKEND_DIR / "ml" / "training" / "data" / "overflow_hf" / "Garbage_Bin_overflow_00002.jpg",
    ]
    for p in img_candidates:
        if p.exists():
            data = p.read_bytes()
            b64 = base64.b64encode(data).decode("utf-8")
            return f"data:image/jpeg;base64,{b64}"

    # Fallback minimal JPEG
    dummy = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    return dummy


def validate_result(result: AnalysisResult, expected_source: str | None = None):
    """Validate that the AnalysisResult has all required attributes and valid ranges."""
    assert isinstance(result, AnalysisResult), f"Expected AnalysisResult, got {type(result)}"
    assert result.waste_type in ["organic", "recyclable", "general", "hazardous"], f"Invalid waste_type: {result.waste_type}"
    assert result.fill_level in ["empty", "half-full", "full", "overflowing"], f"Invalid fill_level: {result.fill_level}"
    assert isinstance(result.estimated_waste_kg, (int, float)) and result.estimated_waste_kg > 0, f"Invalid estimated_waste_kg: {result.estimated_waste_kg}"
    assert 1.0 <= result.severity_score <= 10.0, f"Severity out of range [1, 10]: {result.severity_score}"
    assert 10.0 <= result.environmental_impact_score <= 100.0, f"Impact score out of range [10, 100]: {result.environmental_impact_score}"
    assert result.priority_level in ["low", "medium", "high", "critical"], f"Invalid priority_level: {result.priority_level}"
    assert isinstance(result.recommended_action, str) and len(result.recommended_action) > 5, "Missing recommended_action"
    assert result.source in ["local", "cloud", "fallback"], f"Invalid source: {result.source}"

    if expected_source:
        assert result.source == expected_source, f"Expected source '{expected_source}', got '{result.source}'"


async def run_tests():
    print("=" * 65)
    print("GreenVision AI Model Verification Test Suite")
    print("=" * 65)

    img_b64 = get_sample_image_base64()
    print(f"Loaded test image payload ({len(img_b64)} chars)")

    settings = get_settings()
    print(f"Configured vision_key present: {bool(settings.vision_key or os.getenv('VISION_KEY'))}")

    # -------------------------------------------------------------
    # TEST 1: USE_LOCAL_MODEL = True
    # -------------------------------------------------------------
    print("\n" + "-" * 65)
    print("TEST 1: USE_LOCAL_MODEL = True (Local MobileNetV2 greenvision.pt)")
    print("-" * 65)
    os.environ["USE_LOCAL_MODEL"] = "true"
    settings.use_local_model = True

    try:
        res_local = await analyze_waste_image(img_b64)
        validate_result(res_local, expected_source="local")
        print("[SUCCESS] Local Model Prediction Response:")
        print(json.dumps(res_local.model_dump(), indent=2))
    except Exception as exc:
        print(f"[FAIL] Local model test threw exception: {exc}")
        raise

    # -------------------------------------------------------------
    # TEST 2: USE_LOCAL_MODEL = False (Cloud Vision API)
    # -------------------------------------------------------------
    print("\n" + "-" * 65)
    print("TEST 2: USE_LOCAL_MODEL = False (Cloud Vision API via VISION_KEY)")
    print("-" * 65)
    os.environ["USE_LOCAL_MODEL"] = "false"
    settings.use_local_model = False

    try:
        res_cloud = await analyze_waste_image(img_b64)
        validate_result(res_cloud, expected_source="cloud")
        print("[SUCCESS] Cloud Vision Prediction Response:")
        print(json.dumps(res_cloud.model_dump(), indent=2))
    except Exception as exc:
        print(f"[FAIL] Cloud vision test threw exception: {exc}")
        raise

    # -------------------------------------------------------------
    # TEST 3: Resilient Fallback (Simulating offline / invalid key)
    # -------------------------------------------------------------
    print("\n" + "-" * 65)
    print("TEST 3: Graceful Heuristic Fallback (Offline / Key missing)")
    print("-" * 65)
    # Temporarily hide key to verify fallback doesn't crash the server
    saved_key = settings.vision_key
    saved_env_key = os.environ.get("VISION_KEY")
    try:
        settings.vision_key = ""
        if "VISION_KEY" in os.environ:
            del os.environ["VISION_KEY"]

        res_fallback = await analyze_waste_image(img_b64)
        validate_result(res_fallback, expected_source="fallback")
        print("[SUCCESS] Fallback Prediction Response (Never crashes):")
        print(json.dumps(res_fallback.model_dump(), indent=2))
    finally:
        settings.vision_key = saved_key
        if saved_env_key:
            os.environ["VISION_KEY"] = saved_env_key

    print("\n" + "=" * 65)
    print("ALL TESTS PASSED PERFECTLY!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_tests())
