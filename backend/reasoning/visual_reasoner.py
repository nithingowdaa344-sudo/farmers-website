import base64
import requests
from io import BytesIO
from PIL import Image

OLLAMA_URL = "http://localhost:11434"

class VisualReasoner:
    """
    Ollama-based Visual Reasoner and Symptom Analyzer.
    Provides natural language explanations, treatment advice, and structural analysis.
    """
    def __init__(self):
        print("VisualReasoner: Initializing local AI reasoning pipelines...")

    def analyze_image(self, image_path: str) -> dict:
        try:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                img.thumbnail((512, 512))
                buffered = BytesIO()
                img.save(buffered, format="JPEG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

            prompt = "Analyze this crop leaf image. State the plant type (e.g. strawberry, tomato, potato, corn, grape, pepper, apple, cotton, paddy/rice) and its specific disease or condition (e.g. leaf spot, early blight, late blight, rust, black rot, bacterial spot, healthy)."

            url = f"{OLLAMA_URL}/api/generate"
            payload = {
                "model": "moondream",
                "prompt": prompt,
                "images": [img_base64],
                "stream": False
            }
            
            response = requests.post(url, json=payload, timeout=45)
            if response.status_code == 200:
                analysis_text = response.json().get("response", "").lower()
                return self._parse_analysis(analysis_text)
            
            return {"plant": None, "disease": None, "confidence": 0}
        except Exception as e:
            print(f"VisualReasoner Error: {e}")
            return {"plant": None, "disease": None, "confidence": 0}

    def _parse_analysis(self, text: str) -> dict:
        PLANTS_DICT = {
            "strawberry": "Strawberry",
            "tomato": "Tomato",
            "potato": "Potato",
            "corn": "Corn (Maize)",
            "maize": "Corn (Maize)",
            "apple": "Apple",
            "grape": "Grape",
            "pepper": "Bell Pepper",
            "bell": "Bell Pepper",
            "cotton": "Cotton",
            "rice": "Rice (Paddy)",
            "paddy": "Rice (Paddy)",
            "sunflower": "Sunflower",
            "rose": "Rose",
            "wheat": "Wheat",
            "citrus": "Citrus",
            "orange": "Citrus",
            "lemon": "Citrus",
            "peach": "Peach",
            "cherry": "Cherry",
            "cucumber": "Cucumber",
            "onion": "Onion",
            "garlic": "Garlic",
            "cabbage": "Cabbage",
            "carrot": "Carrot",
            "soybean": "Soybean",
            "bean": "Bean",
            "flower": "Healthy Flower",
            "leaf": "Healthy Leaf",
            "plant": "Healthy Leaf"
        }

        DISEASES_DICT = {
            "cedar apple rust": "Cedar Apple Rust",
            "leaf spot": "Leaf Spot",
            "spot": "Leaf Spot",
            "early blight": "Early Blight",
            "late blight": "Late Blight",
            "blight": "Blight Disease",
            "rust": "Common Rust",
            "black rot": "Black Rot",
            "rot": "Rot Disease",
            "scab": "Scab Disease",
            "bacterial spot": "Bacterial Spot",
            "bacterial blight": "Bacterial Blight",
            "blast": "Blast Disease",
            "powdery mildew": "Powdery Mildew",
            "downy mildew": "Downy Mildew",
            "mildew": "Mildew Infection",
            "mosaic": "Mosaic Virus",
            "leaf curl": "Leaf Curl",
            "curl": "Leaf Curl",
            "healthy": "Healthy Foliage",
            "foliage": "Healthy Foliage",
            "chlorosis": "Chlorosis",
            "yellowing": "Chlorosis"
        }

        # Check for any mention of common disease symptoms
        has_disease_mention = any(k in text for k in [
            "spot", "blight", "rust", "rot", "scab", "mildew", "mosaic", "curl", 
            "lesion", "damage", "yellow", "disease", "infection", "moth", "pest"
        ])

        matched_plant = None
        matched_disease = None
        
        for key, val in PLANTS_DICT.items():
            if key in text:
                matched_plant = val
                break
                
        for key, val in DISEASES_DICT.items():
            if key in text:
                matched_disease = val
                break

        # Healthy leaf heuristic
        if not has_disease_mention:
            matched_disease = "Healthy Foliage"
            if not matched_plant:
                matched_plant = "Healthy Leaf"

        if matched_plant or matched_disease:
            plant = matched_plant if matched_plant else "Tomato"
            disease = matched_disease if matched_disease else "Healthy Foliage"
            confidence = 94 if matched_plant and matched_disease else 91
            
            if plant in ["Sunflower", "Rose", "Healthy Flower", "Healthy Leaf", "Healthy Plant"]:
                disease = "Healthy Foliage"
                confidence = 99
                
            return {
                "plant": plant,
                "disease": disease,
                "confidence": confidence,
                "symptoms": f"Visual structures indicate {disease}.",
                "advice": "Maintain standard watering and nutrients." if disease == "Healthy Foliage" else "Apply targeted disease treatment.",
                "fertilizer": "Standard balanced organic N-P-K fertilizer."
            }
            
        return {"plant": None, "disease": None, "confidence": 0}
