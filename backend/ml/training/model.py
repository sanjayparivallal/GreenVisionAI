"""GreenVision ML training — model architecture.

Layer names must match backend/ml/local_model.py exactly,
otherwise the saved weights will not load there.
"""

import torch.nn as nn
from torchvision import models
from config import WASTE_TYPES, FILL_LEVELS


class GreenVisionNet(nn.Module):
    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = models.MobileNet_V2_Weights.DEFAULT if pretrained else None
        bb = models.mobilenet_v2(weights=weights)
        self.features = bb.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        d = bb.last_channel                      # 1280
        head = lambda n: nn.Sequential(nn.Dropout(0.3), nn.Linear(d, n))
        self.type_head = head(len(WASTE_TYPES))
        self.fill_head = head(len(FILL_LEVELS))

    def freeze_backbone(self, freeze: bool = True):
        for p in self.features.parameters():
            p.requires_grad = not freeze

    def forward(self, x):
        f = self.pool(self.features(x)).flatten(1)
        return self.type_head(f), self.fill_head(f)
