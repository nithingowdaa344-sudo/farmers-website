import torch
from PIL import Image
import open_clip

class EmbeddingExtractor:
    """
    Image Embedding Extractor using CLIP.
    Generates semantic dense vectors (embeddings) for similarity queries and vector DB search.
    """
    def __init__(self, device=None):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        print(f"EmbeddingExtractor: Initializing on device: {self.device}")
        
        try:
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                'ViT-B-32', 
                pretrained='laion2b_s34b_b79k', 
                device=self.device
            )
            self.enabled = True
        except Exception as e:
            print(f"Warning: Failed to load CLIP model for embeddings: {e}")
            self.enabled = False

    @torch.no_grad()
    def extract_embedding(self, image_path: str) -> list:
        if not self.enabled:
            return [0.0] * 512

        try:
            image = Image.open(image_path).convert("RGB")
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

            image_features = self.model.encode_image(image_tensor)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            
            # Convert to list of floats for easy serializability (JSON)
            return image_features[0].cpu().numpy().tolist()
        except Exception as e:
            print(f"Embedding Extraction Error: {e}")
            return [0.0] * 512
