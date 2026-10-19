"""Local GreenVision model inference — loads greenvision.pt and predicts
waste_type + fill_level without calling any external API.

Used when USE_LOCAL_MODEL=true in .env.  The model is a MobileNetV2
dual-head classifier trained in backend/ml/training/.
"""

import os
import re
import io
import base64
import logging
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants — must match backend/ml/training/config.py
# ---------------------------------------------------------------------------
WASTE_TYPES = ["organic", "recyclable", "general", "hazardous"]
FILL_LEVELS = ["empty", "half-full", "full", "overflowing"]
IMG_SIZE = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

# Nominal weight per fill level (not a measurement, just fills the DB column)
NOMINAL_KG = {"empty": 2.0, "half-full": 12.0, "full": 40.0, "overflowing": 120.0}

# Weight file lives alongside this module
WEIGHTS_PATH = Path(__file__).resolve().parent / "weights" / "greenvision.pt"

# ---------------------------------------------------------------------------
# Model architecture — layer names MUST match backend/ml/training/model.py exactly
# ---------------------------------------------------------------------------

class GreenVisionNet(nn.Module):
    def __init__(self):
        super().__init__()
        bb = models.mobilenet_v2(weights=None)
        self.features = bb.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        d = bb.last_channel  # 1280
        head = lambda n: nn.Sequential(nn.Dropout(0.3), nn.Linear(d, n))
        self.type_head = head(len(WASTE_TYPES))
        self.fill_head = head(len(FILL_LEVELS))

    def forward(self, x):
        f = self.pool(self.features(x)).flatten(1)
        return self.type_head(f), self.fill_head(f)


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------
_eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])


# ---------------------------------------------------------------------------
# Singleton model loader
# ---------------------------------------------------------------------------
_model: GreenVisionNet | None = None
_device: torch.device | None = None


def _load_model() -> GreenVisionNet:
    """Lazy-load model weights on first call. Thread-safe enough for
    single-worker uvicorn (the default dev setup)."""
    global _model, _device

    if _model is not None:
        return _model

    if not WEIGHTS_PATH.exists():
        raise FileNotFoundError(
            f"Local model weights not found at {WEIGHTS_PATH}. "
            f"Train with `cd ml_training && python train.py` or copy greenvision.pt there."
        )

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = torch.load(WEIGHTS_PATH, map_location=_device, weights_only=False)

    net = GreenVisionNet()
    net.load_state_dict(checkpoint["state_dict"])
    net.to(_device).eval()

    _model = net
    logger.info(
        "[LocalModel] Loaded greenvision.pt (%.1f MB) on %s",
        WEIGHTS_PATH.stat().st_size / 1e6, _device,
    )
    return _model


# ---------------------------------------------------------------------------
# Scoring — deterministic, based on fill_level + waste_type (NOT weight-based)
# ---------------------------------------------------------------------------

def _scores_from_fill(waste_type: str, fill_level: str) -> tuple[float, float, str]:
    """Compute severity_score (1–10), environmental_impact_score (10–100),
    and priority_level from the predicted fill_level and waste_type."""

    fill_base = {"empty": 1.5, "half-full": 3.5, "full": 6.0, "overflowing": 8.0}
    base = fill_base.get(fill_level, 4.0)

    # Type modifier
    if waste_type == "hazardous":
        base += 1.5
    elif waste_type == "organic" and fill_level in ("full", "overflowing"):
        base += 0.5

    severity = round(max(1.0, min(10.0, base)), 1)

    # Impact score: 10–100
    impact_base = severity * 9.5 + (12.0 if waste_type == "hazardous" else 0.0)
    env_impact = round(max(10.0, min(100.0, impact_base)), 1)

    # Priority
    if severity >= 8.5 or (waste_type == "hazardous" and severity >= 6.0):
        priority = "critical"
    elif severity >= 6.5:
        priority = "high"
    elif severity >= 4.0:
        priority = "medium"
    else:
        priority = "low"

    return severity, env_impact, priority


def _recommended_action(waste_type: str, fill_level: str, priority: str) -> str:
    """Generate a template-based recommended action string."""
    urgency = {
        "low": "Schedule routine collection at next available slot.",
        "medium": "Prioritise collection within the current shift.",
        "high": "Dispatch crew immediately to prevent further accumulation.",
        "critical": "Emergency dispatch required — potential health hazard.",
    }
    templates = {
        "organic": f"Deploy composting-equipped truck for {fill_level} organic waste bin.",
        "recyclable": f"Schedule recycling recovery vehicle for {fill_level} recyclable bin.",
        "hazardous": f"Alert specialised hazmat team for {fill_level} hazardous waste container. Full PPE required.",
        "general": f"Route standard municipal sanitation truck to {fill_level} general waste bin.",
    }
    action = templates.get(waste_type, f"Dispatch municipal team for {fill_level} waste bin.")
    return f"{action} {urgency.get(priority, urgency['medium'])}"


# ---------------------------------------------------------------------------
# Public inference function
# ---------------------------------------------------------------------------

def predict_from_base64(image_base64: str) -> dict:
    """Run the local GreenVision model on a base64-encoded image.

    Returns a dict with keys matching AnalysisResult:
        waste_type, fill_level, estimated_waste_kg,
        severity_score, environmental_impact_score,
        priority_level, recommended_action, source
    """
    model = _load_model()

    # Decode base64 → PIL Image
    clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_base64).strip()
    clean_b64 = re.sub(r"\s+", "", clean_b64)
    img_bytes = base64.b64decode(clean_b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # Preprocess and predict
    tensor = _eval_transform(img).unsqueeze(0).to(_device)
    with torch.no_grad():
        type_logits, fill_logits = model(tensor)

    type_idx = int(type_logits.argmax(1).item())
    fill_idx = int(fill_logits.argmax(1).item())

    waste_type = WASTE_TYPES[type_idx]
    fill_level = FILL_LEVELS[fill_idx]

    # Local model's "hazardous" prediction is not trusted — remap to "general"
    if waste_type == "hazardous":
        logger.info("[LocalModel] Remapping untrusted 'hazardous' prediction to 'general'")
        waste_type = "general"

    estimated_kg = NOMINAL_KG.get(fill_level, 12.0)
    severity, env_impact, priority = _scores_from_fill(waste_type, fill_level)
    action = _recommended_action(waste_type, fill_level, priority)

    logger.info(
        "[LocalModel] Prediction: waste_type=%s, fill_level=%s, severity=%.1f",
        waste_type, fill_level, severity,
    )

    return {
        "waste_type": waste_type,
        "fill_level": fill_level,
        "estimated_waste_kg": estimated_kg,
        "severity_score": severity,
        "environmental_impact_score": env_impact,
        "priority_level": priority,
        "recommended_action": action,
        "source": "local",
    }
