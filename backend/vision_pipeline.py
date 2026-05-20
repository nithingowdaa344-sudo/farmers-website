import os
import sys
import uuid

# Add parent directory to sys.path to access ml_core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml_core.yolo_efficientnet_pipeline import YoloEfficientNetPipeline

class VisionPipeline:
    def __init__(self):
        # Initialize the hybrid YOLOv8 + EfficientNet pipeline
        # YOLOv8 weights are stored in the models folder in parent, or root
        parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        yolo_path = os.path.join(parent_dir, "models", "yolov8n.pt")
        efficientnet_path = os.path.join(parent_dir, "models", "efficientnet_leaf_disease.pth")
        class_map_path = os.path.join(parent_dir, "models", "class_indices.json")
        
        self.analyzer = YoloEfficientNetPipeline(
            yolo_model_path=yolo_path,
            efficientnet_path=efficientnet_path,
            class_map_path=class_map_path
        )

    def run(self, image_path: str) -> dict:
        """
        Run the hybrid YOLOv8 + EfficientNet vision pipeline on a given image path.
        Saves the OpenCV annotated bounding box image to the outputs directory.
        """
        print(f"[VisionPipeline] Running YOLOv8 + EfficientNet analysis on: {image_path}")

        # Unique filename for the annotated overlay
        heatmap_id = uuid.uuid4().hex
        os.makedirs("outputs", exist_ok=True)
        output_overlay_path = f"outputs/heatmap_{heatmap_id}.png"

        try:
            # Set model attribute for Grad-CAM compatibility
            self.analyzer.model = self.analyzer.classifier
            
            # Generate actual Grad-CAM heatmap overlay
            from utils.heatmap_generator import create_heatmap_overlay
            create_heatmap_overlay(image_path, self.analyzer, output_overlay_path)
            
            # Run YOLO + EfficientNet classification analysis
            result = self.analyzer.analyze(image_path, output_overlay_path=None)
            
            # Hook the heatmap overlay to heatmap_url
            if os.path.exists(output_overlay_path):
                result["heatmap_url"] = f"/outputs/heatmap_{heatmap_id}.png"
            else:
                result["heatmap_url"] = None

        except Exception as e:
            print(f"[VisionPipeline] Analyzer exception: {e}")
            result = {
                "status": "error",
                "plant": "Unknown Plant",
                "crop": "Unknown Plant",
                "disease": "Unknown Disease",
                "severity": "Unknown",
                "confidence": 0,
                "symptoms": f"Analysis failed: {str(e)}",
                "reasoning": f"Analysis failed: {str(e)}",
                "remedies": "Please retry with a clearer plant image.",
                "fertilizer": "Unable to generate advice.",
                "precautions": "Ensure deep learning dependencies are fully installed.",
                "preventions": "Make sure models are saved in the models directory.",
                "infection_percentage": 0,
                "damage_percentage": 0,
                "urgency_warning": "Analysis failed — please retry.",
                "model_used": "YOLOv8 + EfficientNet",
                "heatmap_url": None
            }

        # Double check fallback keys
        result.setdefault("plant", result.get("crop", "Unknown Plant"))
        result.setdefault("crop", result.get("plant", "Unknown Plant"))
        result.setdefault("disease", "Unknown Disease")
        result.setdefault("severity", "Unknown")
        result.setdefault("confidence", 0)
        result.setdefault("symptoms", "No symptoms data available.")
        result.setdefault("reasoning", result.get("symptoms", ""))
        result.setdefault("remedies", "No treatment advice available.")
        result.setdefault("fertilizer", "No fertilizer advice available.")
        result.setdefault("precautions", "No precautions available.")
        result.setdefault("preventions", "No prevention steps available.")
        result.setdefault("infection_percentage", 0)
        result.setdefault("damage_percentage", result.get("infection_percentage", 0))
        result.setdefault("urgency_warning", "")
        result.setdefault("status", "success")

        return result

