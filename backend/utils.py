import os
import requests
import json
from dotenv import load_dotenv
import numpy as np
from PIL import Image
import chromadb

load_dotenv()

# Initialize ChromaDB
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="agri_knowledge")

# PlantVillage Classes (Standard 38 classes)
CLASS_NAMES = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot', 'Peach___healthy',
    'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 'Potato___Early_blight',
    'Potato___Late_blight', 'Potato___healthy', 'Raspberry___healthy', 'Soybean___healthy',
    'Squash___Powdery_mildew', 'Strawberry___Leaf_scorch', 'Strawberry___healthy',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

def preprocess_image(image_path):
    """
    Load and preprocess the image for MobileNetV2.
    Ensures image is in RGB mode (3 channels).
    """
    img = Image.open(image_path).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0
    return img_array

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
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "AI returned an empty response.")
        return f"AI was unable to generate an explanation. Status Code: {response.status_code}"
    except Exception as e:
        return f"AI Insight Error: {str(e)}"

from deep_translator import GoogleTranslator
from langdetect import detect

def get_chat_response(user_message, chat_history=[]):
    """
    Handles conversational AI for general agriculture questions using Ollama,
    with real-time translation for Indian languages.
    """
    try:
        # 1. Detect Language
        user_message_lower = user_message.lower()
        if "kannada" in user_message_lower:
            detected_lang = 'kn'
        elif "telugu" in user_message_lower:
            detected_lang = 'te'
        elif "hindi" in user_message_lower:
            detected_lang = 'hi'
        elif "tamil" in user_message_lower:
            detected_lang = 'ta'
        elif "marathi" in user_message_lower:
            detected_lang = 'mr'
        else:
            try:
                detected_lang = detect(user_message)
            except:
                detected_lang = 'en'
        
        # 2. Translate to English if needed
        english_message = user_message
        if detected_lang != 'en':
            translator_to_en = GoogleTranslator(source=detected_lang, target='en')
            english_message = translator_to_en.translate(user_message)

        # 3. Retrieve Context from ChromaDB (RAG)
        context_info = ""
        try:
            # Generate embedding for the English query
            embed_payload = {"model": "nomic-embed-text", "prompt": english_message}
            embed_res = requests.post("http://localhost:11434/api/embeddings", json=embed_payload)
            if embed_res.status_code == 200:
                query_embedding = embed_res.json()["embedding"]
                
                # Query local knowledge base
                results = collection.query(query_embeddings=[query_embedding], n_results=2)
                if results['documents'] and len(results['documents'][0]) > 0:
                    context_info = "\n\nUSE THE FOLLOWING CONTEXT TO ANSWER IF RELEVANT:\n" + "\n".join(results['documents'][0])
        except Exception as rag_err:
            print(f"RAG Retrieval Error: {rag_err}")

        # 4. System context for the chatbot (in English)
        system_context = f"You are a helpful and knowledgeable Agriculture Assistant. Your goal is to help farmers with crop disease management, soil health, and general farming advice. Keep your answers practical, easy to follow, and concise.{context_info}"
        
        full_prompt = f"{system_context}\n\nUser asked: {english_message}"
        
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "llama3",
            "prompt": full_prompt,
            "stream": False
        }
        
        # 4. Get response from local LLM
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            ai_english_response = data.get("response", "I could not generate a response.")
            
            # 5. Translate back to user's original language if needed
            if detected_lang != 'en':
                translator_to_user = GoogleTranslator(source='en', target=detected_lang)
                final_response = translator_to_user.translate(ai_english_response)
                return final_response
            else:
                return ai_english_response
                
        return f"Chat Error: Status Code {response.status_code}"
    except Exception as e:
        # Fallback error handling
        return f"Chat Error: {str(e)}"
