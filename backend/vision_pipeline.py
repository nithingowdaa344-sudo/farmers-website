import os
import sys
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

if os.path.exists(PROJECT_ROOT):
    sys.path.insert(0, PROJECT_ROOT)

from utils.ai_services import get_gemini_vision_analysis

class VisionPipeline:
    def __init__(self):
        self.analyzer = None

    def run(self, image_path: str) -> dict:
        print(f"[VisionPipeline] Processing: {image_path}")

        heatmap_id = uuid.uuid4().hex
        outputs_dir = os.path.join(BASE_DIR, "outputs")
        os.makedirs(outputs_dir, exist_ok=True)

        result, error = get_gemini_vision_analysis(image_path)

        if result and not error:
            result["model_used"] = "Gemini Vision"
            result["status"] = "success"
            return self._map_gemini_response(result, heatmap_id, outputs_dir)

        print(f"[VisionPipeline] Gemini failed: {error}. Using local ML...")
        return self._run_local_ml(image_path, heatmap_id, outputs_dir)

    def _map_gemini_response(self, gemini_result: dict, heatmap_id: str, outputs_dir: str) -> dict:
        confidence = gemini_result.get("confidence", 0)

        if "healthy" in gemini_result.get("disease", "").lower():
            severity = "None"
            infection_pct = 0
            urgency = "HEALTHY: No active infection detected."
        elif confidence >= 80:
            severity = "Severe"
            infection_pct = 80
            urgency = "CRITICAL: Immediate action required."
        elif confidence >= 50:
            severity = "Moderate"
            infection_pct = 45
            urgency = "WARNING: Apply remedies within 48 hours."
        else:
            severity = "Mild"
            infection_pct = 15
            urgency = "NOTICE: Early infection signs. Monitor daily."

        return {
            "status": "success",
            "plant": gemini_result.get("plant", "Unknown Plant"),
            "crop": gemini_result.get("plant", "Unknown Plant"),
            "disease": gemini_result.get("disease", "Unknown Disease"),
            "severity": severity,
            "confidence": confidence,
            "top_3": gemini_result.get("top_3", []),
            "symptoms": gemini_result.get("symptoms", "No symptoms data."),
            "reasoning": gemini_result.get("symptoms", ""),
            "remedies": gemini_result.get("advice", "No treatment advice available."),
            "fertilizer": gemini_result.get("fertilizer", "No fertilizer advice available."),
            "precautions": "Follow agricultural best practices.",
            "preventions": "Regular monitoring and preventive measures recommended.",
            "infection_percentage": infection_pct,
            "damage_percentage": infection_pct,
            "urgency_warning": urgency,
            "model_used": "Gemini Vision",
            "heatmap_url": None
        }

    def _run_local_ml(self, image_path: str, heatmap_id: str, outputs_dir: str):
        try:
            from ml_core.yolo_efficientnet_pipeline import YoloEfficientNetPipeline

            yolo_path = os.path.join(PROJECT_ROOT, "models", "yolov8n.pt")
            efficientnet_path = os.path.join(PROJECT_ROOT, "models", "efficientnet_leaf_disease.pth")
            class_map_path = os.path.join(PROJECT_ROOT, "models", "class_indices.json")

            self.analyzer = YoloEfficientNetPipeline(
                yolo_model_path=yolo_path,
                efficientnet_path=efficientnet_path,
                class_map_path=class_map_path
            )

            output_overlay_path = os.path.join(outputs_dir, f"heatmap_{heatmap_id}.png")
            self.analyzer.model = self.analyzer.classifier

            from utils.heatmap_generator import create_heatmap_overlay
            create_heatmap_overlay(image_path, self.analyzer, output_overlay_path)

            result = self.analyzer.analyze(image_path, output_overlay_path=None)

            if os.path.exists(output_overlay_path):
                result["heatmap_url"] = f"/outputs/heatmap_{heatmap_id}.png"

            result["model_used"] = "YOLOv8 + EfficientNet (Fallback)"
            return result

        except Exception as e:
            print(f"[VisionPipeline] Local ML failed: {e}")
            return {
                "status": "error",
                "plant": "Unknown Plant",
                "crop": "Unknown Plant",
                "disease": "Unknown Disease",
                "severity": "Unknown",
                "confidence": 0,
                "symptoms": "Analysis failed. Check Gemini API key.",
                "remedies": "Unable to generate advice.",
                "fertilizer": "Unable to generate advice.",
                "precautions": "Ensure Gemini API key is valid.",
                "preventions": "Check backend logs for errors.",
                "infection_percentage": 0,
                "damage_percentage": 0,
                "urgency_warning": "Analysis failed.",
                "model_used": "None",
                "heatmap_url": None
            }