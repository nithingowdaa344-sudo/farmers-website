from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import os
from utils import preprocess_image, get_ai_explanation, CLASS_NAMES, get_chat_response
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Load the model
MODEL_PATH = 'crop_disease_model.h5'
model = None

if os.path.exists(MODEL_PATH):
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully.")
else:
    print("Warning: Model file not found. Run train.py first.")

# In-memory history for demo purposes
history = []

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "Backend is running"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Please train the model first."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    import uuid
    # Save temp file
    temp_path = f"temp_{uuid.uuid4().hex}.jpg"
    file.save(temp_path)

    try:
        # Preprocess and Predict
        img_array = preprocess_image(temp_path)
        predictions = model.predict(img_array)
        
        # Get result details
        class_idx = tf.argmax(predictions[0]).numpy()
        confidence = float(predictions[0][class_idx])
        disease_name = CLASS_NAMES[class_idx]

        # Get AI Advice from Gemini
        ai_advice = get_ai_explanation(disease_name)

        result = {
            "disease": disease_name.replace("___", " ").replace("_", " "),
            "confidence": f"{confidence * 100:.2f}%",
            "advice": ai_advice,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Add to history
        history.append(result)

        return jsonify(result), 200

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
