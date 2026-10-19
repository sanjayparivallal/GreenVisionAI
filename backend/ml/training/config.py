"""GreenVision ML training — configuration constants."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
IMAGES_DIR = DATA_DIR / "overflow_hf"
LABELS_CSV = DATA_DIR / "labels.csv"
RUNS_DIR = ROOT / "runs"
OUT_PATH = ROOT.parent / "weights" / "greenvision.pt"

WASTE_TYPES = ["organic", "recyclable", "general", "hazardous"]
FILL_LEVELS = ["empty", "half-full", "full", "overflowing"]

IMG_SIZE = 224
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]
