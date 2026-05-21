import os
import json
import requests
import base64
from io import BytesIO

from dotenv import load_dotenv
from PIL import Image
from deep_translator import GoogleTranslator
from langdetect import detect
from groq import Groq

load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

_groq_client = None

def _get_client():
    global _groq_client
    if _groq_client is None and API_KEY:
        _groq_client = Groq(api_key=API_KEY)
    return _groq_client

def get_ai_explanation(disease_name):
    try:
        payload = {
            "model": "llama3",
            "prompt": f"You are an expert plant pathologist. The crop disease detected is '{disease_name}'. Provide a response in simple, farmer-friendly language with sections: EXPLANATION, REMEDIES, PREVENTION.",
            "stream": False,
            "options": {"num_predict": 300, "temperature": 0.5, "top_k": 20}
        }
        response = requests.post(f"{OLLAMA_URL}/api/generate", json=payload)
        if response.status_code == 200:
            return response.json().get("response", "AI returned an empty response.")
        return f"AI was unable to generate an explanation. Status Code: {response.status_code}"
    except Exception as e:
        return f"AI Insight Error: {str(e)}"

def get_gemini_vision_analysis(image_path):
    if not API_KEY:
        return None, "Groq API key is missing. Set GROQ_API_KEY environment variable."
    client = _get_client()
    if not client:
        return None, "Groq client initialization failed."

    try:
        with Image.open(image_path) as img:
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024))
            buffered = BytesIO()
            img.save(buffered, format="JPEG")
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        prompt = """
        You are an expert agriculture disease detection AI.

        INSTRUCTIONS:
        1. Identify the crop type (e.g., strawberry, tomato, potato, corn, grape, pepper, apple, mango, coffee, ragi, paddy).
        2. Identify the specific disease. NEVER predict tomato diseases for strawberry.
        3. Provide detailed symptoms, treatment advice, and fertilizer recommendations.

        STRICT REQUIREMENT: You MUST return a JSON object with ALL of these keys:
        {
          "plant": "Plant Name",
          "disease": "Disease Name",
          "confidence": 95,
          "top_3": [
            {"name": "Prediction 1", "prob": 95},
            {"name": "Prediction 2", "prob": 4},
            {"name": "Prediction 3", "prob": 1}
          ],
          "symptoms": "Detailed visual symptoms...",
          "advice": "Step-by-step remedies...",
          "fertilizer": "Specific fertilizer and nutrient advice"
        }
        """

        response = client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                    ]
                }
            ],
            temperature=0.2,
            max_tokens=1024
        )

        text = response.choices[0].message.content.strip()

        if "{" in text and "}" in text:
            start = text.find("{")
            end = text.rfind("}") + 1
            json_str = text[start:end]
            result = json.loads(json_str)
            return result, None

        return None, "AI response was not in a readable format."
    except Exception as e:
        return None, f"Groq Vision Error: {str(e)}"

def get_ollama_vision_analysis(image_path):
    try:
        with Image.open(image_path) as img:
            img = img.convert('RGB')
            img.thumbnail((512, 512))
            buffered = BytesIO()
            img.save(buffered, format="JPEG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        prompt = "Analyze this crop leaf image. State the plant type (e.g. strawberry, tomato, potato, corn, grape, pepper, apple, cotton, paddy/rice) and its specific disease or condition (e.g. leaf spot, early blight, late blight, rust, black rot, bacterial spot, healthy)."

        payload = {
            "model": "moondream",
            "prompt": prompt,
            "images": [img_base64],
            "stream": False
        }

        response = requests.post(f"{OLLAMA_URL}/api/generate", json=payload)
        if response.status_code == 200:
            data = response.json()
            analysis_text = data.get("response", "").lower()

            PLANTS_DICT = {
                "strawberry": "Strawberry", "tomato": "Tomato", "potato": "Potato",
                "corn": "Corn (Maize)", "maize": "Corn (Maize)", "apple": "Apple",
                "grape": "Grape", "pepper": "Bell Pepper", "bell": "Bell Pepper",
                "cotton": "Cotton", "rice": "Rice (Paddy)", "paddy": "Rice (Paddy)",
                "sunflower": "Sunflower", "rose": "Rose", "wheat": "Wheat",
                "citrus": "Citrus", "orange": "Citrus", "lemon": "Citrus",
                "peach": "Peach", "cherry": "Cherry", "cucumber": "Cucumber",
                "onion": "Onion", "garlic": "Garlic", "cabbage": "Cabbage",
                "carrot": "Carrot", "soybean": "Soybean", "bean": "Bean",
                "flower": "Healthy Flower", "leaf": "Healthy Leaf", "plant": "Healthy Plant"
            }

            DISEASES_DICT = {
                "cedar apple rust": "Cedar Apple Rust", "leaf spot": "Leaf Spot",
                "spot": "Leaf Spot", "early blight": "Early Blight",
                "late blight": "Late Blight", "blight": "Blight Disease",
                "rust": "Common Rust", "black rot": "Black Rot", "rot": "Rot Disease",
                "scab": "Scab Disease", "bacterial spot": "Bacterial Spot",
                "bacterial blight": "Bacterial Blight", "blast": "Blast Disease",
                "powdery mildew": "Powdery Mildew", "downy mildew": "Downy Mildew",
                "mildew": "Mildew Infection", "mosaic": "Mosaic Virus",
                "leaf curl": "Leaf Curl", "curl": "Leaf Curl",
                "healthy": "Healthy Foliage", "foliage": "Healthy Foliage",
                "chlorosis": "Chlorosis", "yellowing": "Chlorosis"
            }

            plant, disease, confidence = "Tomato", "Early Blight", 90
            matched_plant = None
            matched_disease = None

            has_disease_mention = any(k in analysis_text for k in [
                "spot", "blight", "rust", "rot", "scab", "mildew", "mosaic",
                "curl", "lesion", "damage", "yellow", "disease", "infection",
                "moth", "pest"
            ])

            for key, val in PLANTS_DICT.items():
                if key in analysis_text:
                    matched_plant = val
                    break

            for key, val in DISEASES_DICT.items():
                if key in analysis_text:
                    matched_disease = val
                    break

            if not has_disease_mention:
                matched_disease = "Healthy Foliage"
                if not matched_plant:
                    if "leaf" in analysis_text or "plant" in analysis_text or "green" in analysis_text:
                        matched_plant = "Healthy Leaf"
                    else:
                        matched_plant = "Healthy Leaf"

            if matched_plant or matched_disease:
                plant = matched_plant if matched_plant else "Tomato"
                disease = matched_disease if matched_disease else "Healthy Foliage"
                confidence = 94 if matched_plant and matched_disease else 91

                if plant in ["Sunflower", "Rose", "Healthy Flower", "Healthy Leaf", "Healthy Plant"]:
                    disease = "Healthy Foliage"
                    confidence = 99
            else:
                return {"plant": None, "disease": None, "confidence": 0}, None

            result = {
                "plant": plant,
                "disease": disease,
                "confidence": confidence,
                "top_3": [
                    {"name": f"{plant} - {disease}", "prob": confidence},
                    {"name": "Healthy Foliage", "prob": 100 - confidence if disease != "Healthy Foliage" else 100},
                    {"name": "Other Stresses", "prob": 0}
                ],
                "symptoms": f"Visible characteristics identified as {disease}.",
                "advice": "Apply standard care." if disease == "Healthy Foliage" else "Apply targeted treatment.",
                "fertilizer": "Maintain balanced care."
            }
            return result, None

        return None, f"Ollama Error: Status {response.status_code}"
    except Exception as e:
        return None, f"Ollama Vision Error: {str(e)}"

def detect_user_language(text):
    text_lower = text.lower()

    if any('\u0C80' <= c <= '\u0CFF' for c in text):
        return 'kn'
    if any('\u0C00' <= c <= '\u0C7F' for c in text):
        return 'te'
    if any('\u0900' <= c <= '\u097F' for c in text):
        return 'hi'
    if any('\u0B80' <= c <= '\u0BFF' for c in text):
        return 'ta'

    if "kannada" in text_lower:
        return 'kn'
    if "telugu" in text_lower:
        return 'te'
    if "hindi" in text_lower:
        return 'hi'
    if "tamil" in text_lower:
        return 'ta'
    if "marathi" in text_lower:
        return 'mr'

    common_short_english = {"hi", "hello", "hey", "help", "yes", "no", "ok", "crop", "plant", "soil", "pest", "disease", "farm", "how", "what", "why"}
    words = set(w.strip('?,.!') for w in text_lower.split())
    if len(text) < 5 or words.intersection(common_short_english):
        return 'en'

    try:
        lang = detect(text)
        if lang in ['kn', 'te', 'hi', 'ta', 'mr']:
            return lang
    except Exception:
        pass

    return 'en'

def get_chat_response(user_message, chat_history=None):
    if chat_history is None:
        chat_history = []

    try:
        detected_lang = detect_user_language(user_message)

        english_message = user_message
        if detected_lang != 'en':
            try:
                translator_to_en = GoogleTranslator(source=detected_lang, target='en')
                english_message = translator_to_en.translate(user_message)
            except Exception:
                pass

        system_context = (
            "You are a helpful and knowledgeable Agriculture Assistant. "
            "Your goal is to help farmers with crop disease management, soil health, "
            "and general farming advice. Keep your answers practical, easy to follow, and concise."
        )

        client = _get_client()
        if client:
            try:
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_context},
                        {"role": "user", "content": english_message}
                    ],
                    temperature=0.3,
                    max_tokens=512
                )
                ai_response = response.choices[0].message.content.strip()
                if ai_response:
                    if detected_lang != 'en':
                        try:
                            translator_to_lang = GoogleTranslator(source='en', target=detected_lang)
                            return translator_to_lang.translate(ai_response)
                        except Exception:
                            pass
                    return ai_response
            except Exception as groq_err:
                print(f"[Chat] Groq error: {groq_err}")
                err_str = str(groq_err).lower()
                if "quota" in err_str or "rate_limit" in err_str or "429" in err_str:
                    return "The AI service is currently over quota. Please try again later or upgrade your API plan."
                if "api key" in err_str or "unauthorized" in err_str or "401" in err_str:
                    return "The Groq API key is invalid. Check your GROQ_API_KEY environment variable."

        if not API_KEY:
            return "The Groq API key is missing. Set the GROQ_API_KEY environment variable and redeploy."

        try:
            url = f"{OLLAMA_URL}/api/generate"
            payload = {
                "model": "llama3.2",
                "prompt": f"{system_context}\n\nUser asked: {english_message}",
                "stream": False,
                "options": {"num_predict": 250, "temperature": 0.4, "top_k": 30, "num_ctx": 1024}
            }
            ollama_resp = requests.post(url, json=payload, timeout=10)
            if ollama_resp.status_code == 200:
                data = ollama_resp.json()
                ai_text = data.get("response", "").strip()
                if ai_text:
                    if detected_lang != 'en':
                        try:
                            translator_to_lang = GoogleTranslator(source='en', target=detected_lang)
                            return translator_to_lang.translate(ai_text)
                        except Exception:
                            pass
                    return ai_text
        except Exception:
            pass

        return "Sorry, the AI assistant is unavailable. Ensure GROQ_API_KEY is set in your environment variables."

    except Exception as e:
        return f"Chat Error: {str(e)}"
