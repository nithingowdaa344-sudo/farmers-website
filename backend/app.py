from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils import get_ai_explanation, get_chat_response, get_ollama_vision_analysis, get_gemini_vision_analysis
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

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
        # 1. Try Gemini Vision (Best for live deployment)
        ai_result, error = get_gemini_vision_analysis(temp_path)
        
        # 2. Fallback to Ollama if Gemini fails or is missing
        if error or not ai_result:
            print(f"Gemini skipped/failed: {error}. Trying Ollama...")
            ai_result, error = get_ollama_vision_analysis(temp_path)

        if error:
            return jsonify({"error": error}), 400

        if ai_result:
            conf_str = str(ai_result.get('confidence', 0)).replace('%', '')
            conf = int(float(conf_str))
            
            result = {
                "plant": ai_result.get('plant', 'Unknown'),
                "disease": ai_result.get('disease', 'Unknown Condition'),
                "confidence": f"{conf}%",
                "top_3": ai_result.get('top_3', []),
                "symptoms": ai_result.get('symptoms', 'No symptoms provided.'),
                "advice": ai_result.get('advice', 'No treatment advice provided.'),
                "fertilizer": ai_result.get('fertilizer', 'General fertilizer advice not available.'),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            history.append(result)
            return jsonify(result), 200
        
        return jsonify({"error": "All AI models failed to process the image."}), 500

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
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
