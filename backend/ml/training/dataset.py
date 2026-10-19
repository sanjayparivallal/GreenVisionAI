"""GreenVision ML training — dataset loading and transforms."""

import random
import numpy as np
import pandas as pd
from PIL import Image, ImageFile
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset
from torchvision import transforms

from config import (IMAGES_DIR, LABELS_CSV, WASTE_TYPES, FILL_LEVELS,
                    IMG_SIZE, MEAN, STD)

ImageFile.LOAD_TRUNCATED_IMAGES = True
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

train_tf = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.3, 0.3, 0.3, 0.05),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])
eval_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])


def _basename(p) -> str:
    return str(p).replace("\\", "/").split("/")[-1]


def build_dataframe(min_conf, min_relevance, max_per_group, ignore_hazardous, seed):
    """Load labels.csv, remap its Colab paths to local files and filter it."""
    if not LABELS_CSV.exists():
        raise SystemExit(f"Missing {LABELS_CSV}")
    if not IMAGES_DIR.exists():
        raise SystemExit(f"Missing {IMAGES_DIR}")

    # labels.csv stores Colab paths like /content/overflow_hf/xxx.jpg,
    # so match each row to the local image by file name.
    files = {p.name: str(p) for p in IMAGES_DIR.rglob("*") if p.suffix.lower() in IMAGE_EXTS}
    lab = pd.read_csv(LABELS_CSV)
    lab["path"] = lab["path"].map(lambda p: files.get(_basename(p)))
    missing = int(lab["path"].isna().sum())
    lab = lab.dropna(subset=["path"])
    print(f"Matched {len(lab)} images to local files ({missing} not found in {IMAGES_DIR})")
    if lab.empty:
        raise SystemExit("No images matched. Check that overflow_hf is in backend/ml/training/data/")

    if "relevant" in lab.columns:
        lab = lab[lab["relevant"] >= min_relevance]
    else:
        print("labels.csv has no 'relevant' column, skipping the relevance filter")
    lab = lab[(lab["waste_type_conf"] >= min_conf) & (lab["fill_level_conf"] >= min_conf)].copy()

    lab["source"] = lab["fill_level"] + "_" + lab["waste_type"]
    lab = lab[lab.groupby("source")["source"].transform("count") >= 10]
    lab = (lab.sample(frac=1, random_state=seed)
              .groupby("source").head(max_per_group).reset_index(drop=True))

    if ignore_hazardous:       # noisy labels: drop the type supervision, keep the fill label
        lab.loc[lab["waste_type"] == "hazardous", "waste_type"] = np.nan

    return lab[["path", "waste_type", "fill_level", "source"]]


def split(df, seed):
    return train_test_split(df, test_size=0.15, stratify=df["source"], random_state=seed)


def _idx(v, classes):
    return -1 if (v is None or (isinstance(v, float) and np.isnan(v))) else classes.index(v)


class WasteDataset(Dataset):
    def __init__(self, df, tf):
        self.df, self.tf = df.reset_index(drop=True), tf

    def __len__(self):
        return len(self.df)

    def __getitem__(self, i):
        for _ in range(5):                       # skip unreadable images
            r = self.df.iloc[i]
            try:
                img = Image.open(r["path"]).convert("RGB")
                return (self.tf(img),
                        _idx(r["waste_type"], WASTE_TYPES),
                        _idx(r["fill_level"], FILL_LEVELS))
            except Exception:
                i = random.randrange(len(self.df))
        raise RuntimeError("Too many unreadable images")
