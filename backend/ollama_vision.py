import os
import sys
import json
import re
import time
import tempfile
from PIL import Image
import ollama

# Force UTF-8 output on Windows to prevent charmap encoding errors
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Use qwen2.5vl for accurate, image-specific plant disease detection
# Can be overridden via VISION_MODEL env var
VISION_MODEL = os.getenv("VISION_MODEL", "qwen2.5vl")

PROMPT = """You are an expert agricultural plant disease detection AI.

Carefully analyze ONLY the specific plant image provided.

STRICT RULES:
- Detect the actual crop visible in this image (e.g., Tomato, Potato, Banana, Rice, Grape, Apple, Corn)
- Detect the actual disease ONLY from visible symptoms (spots, lesions, discoloration, mold, wilting, texture)
- NEVER return the same disease for different images -- each image must be analyzed independently
- If the image is unclear, not a plant, or disease cannot be determined, return "Unknown Disease"
- Do NOT guess or hallucinate -- only report what is actually visible

Return ONLY a valid JSON object (no markdown, no explanation, no code block):

{
  "plant": "Detected plant/crop name",
  "disease": "Detected disease name or 'Healthy' or 'Unknown Disease'",
  "confidence": 85,
  "severity": "Mild or Moderate or Severe or None",
  "symptoms": "Describe specific visible symptoms you see in this image",
  "remedies": "Specific treatment steps for this disease and crop",
  "fertilizer": "Specific fertilizer and nutrient advice for this crop and condition",
  "precautions": "Precautions to prevent spread of this disease",
  "preventions": "Preventive steps for future growing seasons"
}
"""


class OllamaVisionAnalyzer:
    def __init__(self):
        self.model = VISION_MODEL
        self.client = ollama.Client(host=OLLAMA_URL, timeout=120)
        self._verify_model()

    def _verify_model(self):
        """Verify qwen2.5vl is available locally."""
        try:
            list_res = self.client.list()
            if hasattr(list_res, "models"):
                local_models = [m.model.split(":")[0] for m in list_res.models]
            else:
                local_models = [m["name"].split(":")[0] for m in list_res.get("models", [])]

            if self.model in local_models:
                print(f"[OllamaVision] OK: {self.model} is available locally.", flush=True)
            else:
                print(f"[OllamaVision] WARN: {self.model} not found locally. Attempting pull...", flush=True)
                self.client.pull(self.model)
                print(f"[OllamaVision] OK: {self.model} pulled successfully.", flush=True)
        except Exception as e:
            print(f"[OllamaVision] Model verification warning: {e}", flush=True)

    def _save_image_temp(self, image_path: str) -> str:
        """
        Save a properly converted JPEG copy of the image to a temp file.
        qwen2.5vl requires a real file path, not base64.
        """
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            # Resize to optimal size for qwen2.5vl
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024), Image.LANCZOS)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
            img.save(tmp.name, format="JPEG", quality=90)
            return tmp.name

    def _extract_json(self, text: str) -> dict:
        """Robustly extract JSON from model output."""
        # Try direct parse first
        try:
            return json.loads(text)
        except Exception:
            pass

        # Strip markdown code blocks
        cleaned = re.sub(r"```(?:json)?", "", text).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Find JSON object in text
        match = re.search(r"\{[\s\S]+\}", text)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass

        return {}

    def _safe_str(self, val) -> str:
        if val is None:
            return ""
        if isinstance(val, list):
            return "; ".join(str(item) for item in val)
        if isinstance(val, dict):
            return json.dumps(val)
        return str(val).strip()

    def analyze(self, image_path: str) -> dict:
        start_time = time.time()
        temp_path = None

        try:
            # Save as clean JPEG temp file so qwen2.5vl gets a valid file path
            temp_path = self._save_image_temp(image_path)
            print(f"[OllamaVision] Analyzing image with {self.model}...", flush=True)
            print(f"[OllamaVision] Temp image path: {temp_path}", flush=True)

            # Send to qwen2.5vl with the actual file path (not base64)
            response = self.client.chat(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": PROMPT,
                        "images": [temp_path],
                    }
                ],
            )

            if not response or "message" not in response:
                raise ValueError("Empty or invalid response from Ollama")

            raw_content = response["message"]["content"].strip()
            duration = time.time() - start_time
            print(f"[OllamaVision] Response received in {duration:.2f}s", flush=True)
            # Encode safely for Windows console
            safe_preview = raw_content[:500].encode('ascii', errors='replace').decode('ascii')
            print(f"[OllamaVision] Raw output: {safe_preview}", flush=True)

            data = self._extract_json(raw_content)
            print(f"[OllamaVision] Parsed JSON keys: {list(data.keys())}", flush=True)

            if not data:
                raise ValueError("Failed to parse JSON from model response")

            # --- Extract fields ---
            plant = self._safe_str(data.get("plant", "")).strip()
            if not plant or plant.lower() in ["...", "unknown", ""]:
                plant = "Unknown Plant"

            disease = self._safe_str(data.get("disease", "")).strip()
            if not disease or disease.lower() in ["...", ""]:
                disease = "Unknown Disease"

            severity = self._safe_str(data.get("severity", "")).strip()
            if severity not in ["None", "Mild", "Moderate", "Severe"]:
                if "healthy" in disease.lower():
                    severity = "None"
                else:
                    severity = "Moderate"

            # Real confidence from model -- no artificial boosting
            try:
                confidence = int(float(str(data.get("confidence", 75)).replace("%", "")))
                confidence = max(10, min(confidence, 99))  # Clamp between 10-99
            except Exception:
                confidence = 75

            symptoms = self._safe_str(data.get("symptoms", ""))
            if not symptoms or symptoms == "...":
                symptoms = "No specific symptoms detected in this image."

            remedies = self._safe_str(data.get("remedies", ""))
            if not remedies or remedies == "...":
                remedies = "Consult a local agronomist for treatment advice."

            fertilizer = self._safe_str(data.get("fertilizer", ""))
            if not fertilizer or fertilizer == "...":
                fertilizer = "Apply balanced NPK fertilizer as per soil test results."

            precautions = self._safe_str(data.get("precautions", ""))
            if not precautions or precautions == "...":
                precautions = "Monitor the plant regularly and maintain clean farming practices."

            preventions = self._safe_str(data.get("preventions", ""))
            if not preventions or preventions == "...":
                preventions = "Practice crop rotation and use certified disease-free seeds."

            # Infection percentage based on severity
            severity_lower = severity.lower()
            if severity_lower == "none" or "healthy" in disease.lower():
                infection_pct = 0
                urgency = "HEALTHY: No active infection detected."
            elif severity_lower == "severe":
                infection_pct = 75
                urgency = "CRITICAL: Immediate action required to prevent total crop loss."
            elif severity_lower == "moderate":
                infection_pct = 40
                urgency = "WARNING: Active infection detected. Apply remedies within 48 hours."
            elif severity_lower == "mild":
                infection_pct = 15
                urgency = "NOTICE: Early infection signs. Monitor daily and apply treatment."
            else:
                infection_pct = 25
                urgency = "WARNING: Infection detected. Monitor and apply remedies."

            return {
                "status": "success",
                "plant": plant,
                "crop": plant,  # alias for backward compatibility
                "disease": disease,
                "severity": severity,
                "confidence": confidence,
                "symptoms": symptoms,
                "reasoning": symptoms,  # alias for frontend
                "remedies": remedies,
                "fertilizer": fertilizer,
                "precautions": precautions,
                "preventions": preventions,
                "infection_percentage": infection_pct,
                "damage_percentage": infection_pct,
                "urgency_warning": urgency,
                "model_used": self.model,
                "timing_s": round(time.time() - start_time, 2),
            }

        except Exception as e:
            duration = time.time() - start_time
            err_msg = str(e).encode('ascii', errors='replace').decode('ascii')
            print(f"[OllamaVision] ERROR after {duration:.2f}s: {err_msg}", flush=True)
            # Return a transparent error -- do NOT silently return a fake result
            return {
                "status": "error",
                "plant": "Unknown Plant",
                "crop": "Unknown Plant",
                "disease": "Unknown Disease",
                "severity": "Unknown",
                "confidence": 0,
                "symptoms": f"Analysis failed: {str(e)}. Please try again with a clearer plant image.",
                "reasoning": f"Analysis failed: {str(e)}",
                "remedies": "Please retry with a clearer plant image.",
                "fertilizer": "Unable to generate advice.",
                "precautions": "Ensure Ollama is running with qwen2.5vl installed.",
                "preventions": "Run: ollama pull qwen2.5vl",
                "infection_percentage": 0,
                "damage_percentage": 0,
                "urgency_warning": "Analysis failed -- please retry.",
                "model_used": self.model,
                "timing_s": round(duration, 2),
            }
        finally:
            # Clean up temp file
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as cleanup_err:
                    print(f"[OllamaVision] Cleanup warning: {cleanup_err}", flush=True)
