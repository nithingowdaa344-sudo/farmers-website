# Smart Crop Disease Assistant 🌿🤖

A state-of-the-art, AI-powered agricultural application designed to help farmers identify crop diseases instantly using deep learning and receive treatment advice via Generative AI.

## ✨ Features
- **Disease Detection**: Uses MobileNetV2 (TensorFlow/Keras) trained on the PlantVillage dataset.
- **AI Explanations**: Powered by Google Gemini API to provide farmer-friendly remedies, causes, and prevention tips.
- **Modern UI**: Premium glassmorphism dashboard built with React and Tailwind CSS.
- **Voice Output**: Integrated text-to-speech for disease explanations.
- **Mobile Responsive**: Fully optimized for smartphones and tablets.
- **Dashboard Analytics**: Visualize crop health statistics and recent activity.

---

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS, Framer Motion, Axios.
- **Backend**: Flask API, TensorFlow, Keras, PIL.
- **AI Engines**: 
  - Image Classification: MobileNetV2 (Transfer Learning).
  - Reasoning: Google Gemini API.

---

## 🚀 Setup & Installation

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   - Create a `.env` file in the `backend/` folder.
   - Add your Ollama Public URL (if using ngrok for live site): `OLLAMA_URL=https://your-ngrok-url.ngrok-free.app`.
   - If testing locally, keep it as: `OLLAMA_URL=http://localhost:11434`.
   - Add your Gemini API Key: `GEMINI_API_KEY=your_actual_key_here`.

### 🚨 Live Deployment (Ollama on Vercel)
Since Ollama is local, you must expose it for the live Vercel site to work:
1. Run `npx ngrok http 11434` in your terminal.
2. Copy the `https://...` URL provided by ngrok.
3. Update your `.env` file or Vercel Environment Variables with `OLLAMA_URL=your_ngrok_url`.
4. Ensure your Ollama host is set to listen externally: `$env:OLLAMA_HOST="0.0.0.0"; ollama serve`.

5. Train the model (or generate dummy for UI testing):
   ```bash
   python train.py
   ```
6. Start the Flask server:
   ```bash
   python app.py
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📸 Example API Response (`/predict`)
```json
{
  "disease": "Potato Late Blight",
  "confidence": "98.42%",
  "advice": {
    "explanation": "Late blight is a serious disease caused by a fungus-like organism. It causes dark spots and fuzzy growth on leaves.",
    "remedies": [
      "Remove and destroy infected leaves immediately.",
      "Apply copper-based fungicides."
    ],
    "prevention": [
      "Plant resistant varieties.",
      "Ensure proper spacing for air circulation."
    ]
  },
  "timestamp": "2024-05-13 15:30:00"
}
```

---

## 📂 Folder Structure
```text
agri-club/
├── backend/
│   ├── app.py            # Flask API
│   ├── train.py          # Model Training logic
│   ├── utils.py          # Gemini & Preprocessing
│   ├── requirements.txt  # Backend dependencies
│   └── .env              # Environment secrets
├── frontend/
│   ├── src/
│   │   ├── components/   # UI Components
│   │   ├── pages/        # Main Pages
│   │   ├── App.jsx       # Root Component
│   │   └── index.css     # Tailwind & Styles
│   ├── package.json      # Frontend dependencies
│   └── tailwind.config.js
└── README.md
```

## 📝 License
Distributed under the MIT License.
