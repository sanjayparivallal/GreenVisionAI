"""GreenVision ML training — training loop.

Usage:
    cd backend/ml/training
    python train.py [--warmup-epochs 5] [--finetune-epochs 12] [--batch-size 32]
"""

import argparse, json, os, random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report

from config import OUT_PATH, RUNS_DIR, WASTE_TYPES, FILL_LEVELS
from dataset import build_dataframe, split, WasteDataset, train_tf, eval_tf
from model import GreenVisionNet


def parse_args():
    p = argparse.ArgumentParser(description="Train the GreenVision waste model")
    p.add_argument("--warmup-epochs", type=int, default=5)
    p.add_argument("--finetune-epochs", type=int, default=12)
    p.add_argument("--patience", type=int, default=4, help="early stop after N epochs without improvement")
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--min-conf", type=float, default=0.5)
    p.add_argument("--min-relevance", type=float, default=0.7)
    p.add_argument("--max-per-group", type=int, default=400)
    p.add_argument("--ignore-hazardous", action="store_true",
                   help="do not train the type head on 'hazardous' (labels were noisy)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", type=str, default=str(OUT_PATH))
    return p.parse_args()


def class_weights(series, classes, device):
    c = series.value_counts().reindex(classes).fillna(0).values.astype(float)
    w = np.where(c > 0, 1.0 / np.sqrt(np.maximum(c, 1)), 0.0)
    w = w / w[c > 0].mean()
    return torch.tensor(w, dtype=torch.float32, device=device)


def main():
    args = parse_args()
    random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = device.type == "cuda"
    print("Device:", device)

    df = build_dataframe(args.min_conf, args.min_relevance, args.max_per_group,
                         args.ignore_hazardous, args.seed)
    train_df, val_df = split(df, args.seed)
    print(f"{len(train_df)} train / {len(val_df)} val")
    print(df["waste_type"].value_counts(dropna=False).to_string(), "\n")
    print(df["fill_level"].value_counts().to_string(), "\n")

    workers = 0 if os.name == "nt" else 2         # Windows-safe default
    train_dl = DataLoader(WasteDataset(train_df, train_tf), batch_size=args.batch_size,
                          shuffle=True, num_workers=workers, pin_memory=use_amp)
    val_dl = DataLoader(WasteDataset(val_df, eval_tf), batch_size=args.batch_size,
                        num_workers=workers, pin_memory=use_amp)

    model = GreenVisionNet().to(device)
    ce_type = nn.CrossEntropyLoss(weight=class_weights(train_df["waste_type"], WASTE_TYPES, device), ignore_index=-1)
    ce_fill = nn.CrossEntropyLoss(weight=class_weights(train_df["fill_level"], FILL_LEVELS, device), ignore_index=-1)
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    def loss_fn(ot, of, t, f):
        loss = 0.0
        for out, y, ce in ((ot, t, ce_type), (of, f, ce_fill)):
            if (y != -1).any():                  # avoid NaN when a batch has no labels for a head
                loss = loss + ce(out, y)
        return loss

    def run_epoch(dl, opt=None):
        train = opt is not None
        model.train(train)
        total, n = 0.0, 0
        correct, count = np.zeros(2), np.zeros(2)
        with torch.set_grad_enabled(train):
            for x, t, f in dl:
                x, t, f = x.to(device), t.to(device), f.to(device)
                with torch.autocast(device_type=device.type, enabled=use_amp):
                    ot, of = model(x)
                    loss = loss_fn(ot, of, t, f)
                if train:
                    opt.zero_grad()
                    scaler.scale(loss).backward()
                    scaler.step(opt); scaler.update()
                total += float(loss) * x.size(0); n += x.size(0)
                for k, (o, y) in enumerate(((ot, t), (of, f))):
                    m = y != -1
                    correct[k] += int((o.argmax(1)[m] == y[m]).sum()); count[k] += int(m.sum())
        return total / n, (correct / np.maximum(count, 1)).tolist()

    best, best_state, best_acc = -1.0, None, None
    stages = [("warm-up (heads only)", args.warmup_epochs, 1e-3, True),
              ("fine-tune (all layers)", args.finetune_epochs, 1e-4, False)]
    for name, epochs, lr, freeze in stages:
        print(f"\n=== {name} ===")
        model.freeze_backbone(freeze)
        opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],
                                lr=lr, weight_decay=1e-4)
        stale = 0
        for ep in range(epochs):
            tl, _ = run_epoch(train_dl, opt)
            vl, vacc = run_epoch(val_dl)
            score = float(np.mean(vacc))
            print(f"ep{ep + 1:02d} train={tl:.3f} val={vl:.3f} acc[type,fill]={[round(a, 3) for a in vacc]}")
            if score > best:
                best, best_acc, stale = score, vacc, 0
                best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
                print("   -> new best")
            else:
                stale += 1
                if not freeze and stale >= args.patience:
                    print("   early stop"); break

    # ---- final evaluation with the best weights ----
    model.load_state_dict(best_state); model.eval()
    preds, gts = [[], []], [[], []]
    with torch.no_grad():
        for x, t, f in val_dl:
            outs = model(x.to(device))
            for k, y in enumerate((t, f)):
                m = y != -1
                preds[k] += outs[k].argmax(1).cpu()[m].tolist(); gts[k] += y[m].tolist()
    report = {}
    for k, (nm, cls) in enumerate([("waste_type", WASTE_TYPES), ("fill_level", FILL_LEVELS)]):
        print(f"\n===== {nm.upper()} =====")
        kw = dict(labels=list(range(len(cls))), target_names=cls, zero_division=0)
        print(classification_report(gts[k], preds[k], **kw))
        report[nm] = classification_report(gts[k], preds[k], output_dict=True, **kw)

    # ---- save ----
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    torch.save({"state_dict": best_state, "waste_types": WASTE_TYPES,
                "fill_levels": FILL_LEVELS, "val_acc": best_acc}, out)
    RUNS_DIR.mkdir(exist_ok=True)
    with open(RUNS_DIR / "metrics.json", "w") as fh:
        json.dump({"val_acc": best_acc, "args": vars(args), "report": report}, fh, indent=2, default=float)
    print(f"\nSaved model -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)")
    print(f"Saved metrics -> {RUNS_DIR / 'metrics.json'}")


if __name__ == "__main__":          # required on Windows for DataLoader workers
    main()
