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

import base64
from io import BytesIO

def get_ollama_vision_analysis(image_path):
    """
    Use Ollama (Llama 3.2 Vision) to identify the plant and disease from an image.
    100% Local processing as requested.
    """
    try:
        # Convert image to base64 for Ollama
        with Image.open(image_path) as img:
            # Ensure image is in RGB mode (fixes RGBA as JPEG error)
            img = img.convert('RGB')
            # Resize for efficiency
            img.thumbnail((512, 512))
            buffered = BytesIO()
            img.save(buffered, format="JPEG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

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

        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "moondream",
            "prompt": prompt,
            "images": [img_base64],
            "stream": False,
            "format": "json"
        }
        
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            result = json.loads(data.get("response", "{}"))
            
            # Confidence check (Handle float strings like '95.0')
            conf_str = str(result.get('confidence', 0)).replace('%', '')
            conf = int(float(conf_str))
            if conf < 70:
                return None, "Unable to confidently identify disease. Please upload a clearer image."
                
            return result, None
            
        return None, f"Ollama Error: Status {response.status_code}"
    except Exception as e:
        return None, f"Ollama Vision Error: {str(e)}"

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
            "stream": False,
            "options": {
                "num_predict": 250,
                "temperature": 0.4,
                "top_k": 30,
                "num_ctx": 1024
            }
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
