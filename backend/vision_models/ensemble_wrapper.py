import sys
import os

# Add parent directory to path to support legacy imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.ensemble_predictor import EnsemblePredictor

class LegacyEnsembleWrapper:
    """
    Wrapper for the legacy CNN ensemble models (ViT, EfficientNet, ConvNeXt)
    to keep it neatly under the vision_models/ directory.
    """
    def __init__(self, device=None):
        self.predictor = EnsemblePredictor(device=device)

    def predict(self, image_path: str) -> dict:
        return self.predictor.predict(image_path)
