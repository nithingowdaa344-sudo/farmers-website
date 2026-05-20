import os
import requests
import json
from dotenv import load_dotenv
import numpy as np
from PIL import Image
import chromadb
import google.generativeai as genai
import base64
from io import BytesIO
from deep_translator import GoogleTranslator
from langdetect import detect

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Initialize ChromaDB at backend level
CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="agri_knowledge")

def get_ai_explanation(disease_name):
    """
    Fetch explanation, remedies, and prevention from local Ollama API.
    """
    prompt = f"""
    You are an expert plant pathologist. The crop disease detected is '{disease_name}'.
    Provide a response in simple, farmer-friendly language with the following sections:
    1. EXPLANATION: What is this disease and how does it affect the plant?
    2. REMEDIES: Step-by-step treatment or management suggestions.
    3. PREVENTION: How to prevent this in the future?
    
    Make the response encouraging and easy to understand for a farmer.
    """
    
    try:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": "llama3",
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 300,
                "temperature": 0.5,
                "top_k": 20
            }
        }
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "AI returned an empty response.")
        return f"AI was unable to generate an explanation. Status Code: {response.status_code}"
    except Exception as e:
        return f"AI Insight Error: {str(e)}"

def get_gemini_vision_analysis(image_path):
    """
    Use Gemini Vision (Cloud) to identify the plant and disease.
    Highly accurate and works on live deployments.
    """
    if not API_KEY:
        return None, "Gemini API Key missing."

    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        img = Image.open(image_path)
        
        # Optimize image for faster upload
        if max(img.size) > 1024:
            img.thumbnail((1024, 1024))
        
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
        
        response = model.generate_content([prompt, img])
        img.close()
        text = response.text.strip()
        
        # Robust JSON cleaning
        if "{" in text and "}" in text:
            start = text.find("{")
            end = text.rfind("}") + 1
            json_str = text[start:end]
            result = json.loads(json_str)
            return result, None
            
        return None, "AI response was not in a readable format."
    except Exception as e:
        if 'img' in locals() and hasattr(img, 'close'):
            img.close()
        return None, f"Gemini Error: {str(e)}"

def get_ollama_vision_analysis(image_path):
    """
    Use Ollama (Llama 3.2 Vision or similar) to identify the plant and disease from an image.
    Optimized for smaller models (like moondream) to avoid rigid JSON schema hallucinations.
    """
    try:
        # Convert image to base64 for Ollama
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
        
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            analysis_text = data.get("response", "").lower()
            
            # 1. Comprehensive Agricultural Plant and Crop Dictionary
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
                "plant": "Healthy Plant"
            }

            # 2. Comprehensive Agricultural Pathogen and Disease Dictionary
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

            plant, disease, confidence = "Tomato", "Early Blight", 90
            matched_plant = None
            matched_disease = None
            
            # Check for any mention of common disease symptoms
            has_disease_mention = any(k in analysis_text for k in [
                "spot", "blight", "rust", "rot", "scab", "mildew", "mosaic", "curl", 
                "lesion", "damage", "yellow", "disease", "infection", "moth", "pest"
            ])
            
            # Find the best plant match in the description
            for key, val in PLANTS_DICT.items():
                if key in analysis_text:
                    matched_plant = val
                    break
                    
            # Find the best disease match in the description
            for key, val in DISEASES_DICT.items():
                if key in analysis_text:
                    matched_disease = val
                    break
            
            # Heart of the Healthy Leaf Decision Engine:
            # If the description has no mention of disease symptoms, it is perfectly healthy!
            if not has_disease_mention:
                matched_disease = "Healthy Foliage"
                if not matched_plant:
                    # Look for general plant indicators
                    if "leaf" in analysis_text or "plant" in analysis_text or "green" in analysis_text:
                        matched_plant = "Healthy Leaf"
                    else:
                        matched_plant = "Healthy Leaf"
                    
            if matched_plant or matched_disease:
                plant = matched_plant if matched_plant else "Tomato"
                disease = matched_disease if matched_disease else "Healthy Foliage"
                confidence = 94 if matched_plant and matched_disease else 91
                
                # Special cases: non-crop plants are healthy
                if plant in ["Sunflower", "Rose", "Healthy Flower", "Healthy Leaf", "Healthy Plant"]:
                    disease = "Healthy Foliage"
                    confidence = 99
            else:
                # Fall back to PyTorch ensemble predictions if absolutely nothing matches
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
    
    # 1. Unicode range checks (highly accurate for native scripts)
    if any('\u0C80' <= c <= '\u0CFF' for c in text):
        return 'kn' # Kannada
    if any('\u0C00' <= c <= '\u0C7F' for c in text):
        return 'te' # Telugu
    if any('\u0900' <= c <= '\u097F' for c in text):
        return 'hi' # Hindi / Marathi
    if any('\u0B80' <= c <= '\u0BFF' for c in text):
        return 'ta' # Tamil

    # 2. Keyword overrides
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

    # 3. Skip translation for standard short English words/greetings
    common_short_english = {"hi", "hello", "hey", "help", "yes", "no", "ok", "crop", "plant", "soil", "pest", "disease", "farm", "how", "what", "why"}
    words = set(re_split_words := [w.strip('?,.!') for w in text_lower.split()])
    if len(text) < 5 or words.intersection(common_short_english):
        return 'en'

    # 4. Fallback to langdetect but restrict to supported regional languages
    try:
        lang = detect(text)
        if lang in ['kn', 'te', 'hi', 'ta', 'mr']:
            return lang
    except:
        pass
        
    return 'en'

def get_chat_response(user_message, chat_history=None):
    """
    Handles conversational AI for general agriculture questions using Ollama,
    with real-time translation for Indian languages.
    """
    if chat_history is None:
        chat_history = []
        
    try:
        # 1. Detect Language
        detected_lang = detect_user_language(user_message)
        
        # 2. Translate to English if needed
        english_message = user_message
        if detected_lang != 'en':
            translator_to_en = GoogleTranslator(source=detected_lang, target='en')
            english_message = translator_to_en.translate(user_message)

        # 3. Retrieve Context from ChromaDB (RAG)
        context_info = ""
        try:
            embed_payload = {"model": "nomic-embed-text", "prompt": english_message}
            embed_res = requests.post("http://localhost:11434/api/embeddings", json=embed_payload)
            if embed_res.status_code == 200:
                query_embedding = embed_res.json()["embedding"]
                
                results = collection.query(query_embeddings=[query_embedding], n_results=2)
                if results['documents'] and len(results['documents'][0]) > 0:
                    context_info = "\n\nUSE THE FOLLOWING CONTEXT TO ANSWER IF RELEVANT:\n" + "\n".join(results['documents'][0])
        except Exception as rag_err:
            print(f"RAG Retrieval Error: {rag_err}")

        # 4. System context for the chatbot
        system_context = f"You are a helpful and knowledgeable Agriculture Assistant. Your goal is to help farmers with crop disease management, soil health, and general farming advice. Keep your answers practical, easy to follow, and concise.{context_info}"
        
        full_prompt = f"{system_context}\n\nUser asked: {english_message}"
        
        # Use llama3.2 which is much lighter (2GB) and twice as fast on CPU compared to llama3 (4.7GB)
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": "llama3.2",
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "num_predict": 250,
                "temperature": 0.4,
                "top_k": 30,
                "num_ctx": 1024
            }
        }
        
        # 5. Get response
        try:
            # Use a longer timeout to avoid premature errors (35s)
            response = requests.post(url, json=payload, timeout=35)
        except requests.exceptions.Timeout:
            # Model took too long – return a quick fallback
            return "I’m sorry, the AI is taking longer than expected. Please try again shortly."
        except Exception as req_err:
            # Unexpected request error – fallback to a generic reply
            print(f"[Chat] Ollama request error: {req_err}")
            return "Sorry, I couldn’t process your request right now. Please try again later."

        if response.status_code == 200:
            data = response.json()
            ai_english_response = data.get("response", "").strip()
            if not ai_english_response:
                # Empty response – use a safe fallback
                return "I’m unable to generate a reply at this moment. Please try again."
            
            # 6. Translate response back to user's language if needed
            if detected_lang != 'en':
                try:
                    translator_to_lang = GoogleTranslator(source='en', target=detected_lang)
                    ai_response = translator_to_lang.translate(ai_english_response)
                    return ai_response
                except Exception as trans_err:
                    print(f"Translation back error: {trans_err}")
                    return ai_english_response
            return ai_english_response
        else:
            # Non‑200 – fallback message
            return f"Chat Error: Status Code {response.status_code}"
    except Exception as e:
        return f"Chat Error: {str(e)}"
