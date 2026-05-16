from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils import get_ai_explanation, get_chat_response, get_ollama_vision_analysis
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# In-memory history
history = []

# In-memory history
history = []

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "Backend is running"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    import uuid
    temp_path = f"temp_{uuid.uuid4().hex}.jpg"
    file.save(temp_path)

    try:
        # 1. Use Local Ollama Vision (Llama 3.2) - 100% Private
        ollama_result, error = get_ollama_vision_analysis(temp_path)
        
        if error:
            return jsonify({"error": error}), 400

        if ollama_result:
            conf_str = str(ollama_result.get('confidence', 0)).replace('%', '')
            conf = int(float(conf_str))
            
            result = {
                "plant": ollama_result.get('plant', 'Unknown'),
                "disease": ollama_result.get('disease', 'Unknown Condition'),
                "confidence": f"{conf}%",
                "top_3": ollama_result.get('top_3', []),
                "symptoms": ollama_result.get('symptoms', 'No symptoms provided.'),
                "advice": ollama_result.get('advice', 'No treatment advice provided.'),
                "fertilizer": ollama_result.get('fertilizer', 'General fertilizer advice not available.'),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            history.append(result)
            return jsonify(result), 200
        
        return jsonify({"error": "Ollama vision analysis failed."}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/history', methods=['GET'])
def get_history():
    return jsonify(history), 200

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
        
    ai_response = get_chat_response(user_message)
    return jsonify({"response": ai_response}), 200

if __name__ == '__main__':
    # Ensure uploads directory exists
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    app.run(debug=True, port=5000)
