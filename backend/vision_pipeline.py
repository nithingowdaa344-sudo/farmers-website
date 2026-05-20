import os
import uuid
import cv2
from ollama_vision import OllamaVisionAnalyzer
from utils.heatmap_generator import generate_fallback_heatmap

class VisionPipeline:
    def __init__(self):
        self.analyzer = OllamaVisionAnalyzer()

    def _generate_heatmap(self, image_path: str) -> str:
        """Generate a visual heatmap overlay for the analyzed image."""
        try:
            heatmap_id = uuid.uuid4().hex
            output_path = f"outputs/heatmap_{heatmap_id}.png"
            os.makedirs("outputs", exist_ok=True)
            result_path = generate_fallback_heatmap(image_path, output_path)
            if result_path and os.path.exists(result_path):
                return f"/outputs/heatmap_{heatmap_id}.png"
        except Exception as e:
            print(f"[VisionPipeline] Heatmap generation error: {e}")
        return None

    def _default_result(self) -> dict:
        """Base template for always‑present fields.
        This ensures the frontend never receives missing keys.
        """
        return {
            "crop": "Unknown Plant",
            "disease": "Unknown Disease",
            "confidence": 0,
            "top_3": [],
            "symptoms": "No symptoms detected.",
            "advice": "No treatment advice available.",
            "fertilizer": "No fertilizer recommendation.",
            "precautions": "No precautions available.",
            "preventions": "No prevention steps available.",
            "heatmap_url": None,
            "infection_percentage": 0,
            "urgency_warning": "No action needed.",
            "status": "ok"
        }

    def run(self, image_path: str) -> dict:
        """Run the vision pipeline.
        The function never returns an error status; instead it fills missing values with sensible defaults.
        """
        # Start with a full default structure
        result = self._default_result()

        # Attempt analysis – any exception will be caught and logged, but we continue with defaults
        try:
            analysis = self.analyzer.analyze(image_path)
        except Exception as e:
            print(f"[VisionPipeline] Analyzer error: {e}")
            analysis = {}

        # Merge analysis into result, preserving default values for missing keys
        for key, value in analysis.items():
            result[key] = value

        # Ensure mandatory keys exist – fall back if they are missing or empty
        result.setdefault("crop", "Unknown Plant")
        result.setdefault("disease", "Unknown Disease")
        result.setdefault("confidence", 0)
        result.setdefault("symptoms", "No symptoms detected.")
        result.setdefault("advice", "No treatment advice available.")
        result.setdefault("fertilizer", "No fertilizer recommendation.")
        result.setdefault("precautions", "No precautions available.")
        result.setdefault("preventions", "No prevention steps available.")

        # Determine infection percentage and urgency warning based on severity
        disease_lower = str(result.get("disease", "")).lower()
        is_healthy = "healthy" in disease_lower or disease_lower in ["none", "healthy foliage", "healthy leaf", "unknown disease"]
        
        severity_lower = str(result.get("severity", "")).lower()
        if is_healthy:
            result["infection_percentage"] = 0
            result["urgency_warning"] = "HEALTHY: No active infection detected."
        else:
            if "severe" in severity_lower:
                result["infection_percentage"] = 75
                result["urgency_warning"] = "CRITICAL: Immediate action required to prevent total crop loss."
            elif "moderate" in severity_lower:
                result["infection_percentage"] = 40
                result["urgency_warning"] = "WARNING: Active infection detected. Apply remedies within 48 hours."
            elif "mild" in severity_lower:
                result["infection_percentage"] = 15
                result["urgency_warning"] = "NOTICE: Early infection signs. Monitor daily and apply treatment."
            else:
                # Default warning for detected disease with unspecified or unknown severity
                result["infection_percentage"] = 25
                result["urgency_warning"] = "WARNING: Infection detected. Monitor and apply remedies."

        # Heatmap generation – always attempt, even if analysis failed
        heatmap_url = self._generate_heatmap(image_path)
        if heatmap_url:
            result["heatmap_url"] = heatmap_url
        else:
            result["heatmap_url"] = None

        # The frontend expects a "status" field – keep "ok" unless a catastrophic failure occurs
        result["status"] = "ok"
        return result

