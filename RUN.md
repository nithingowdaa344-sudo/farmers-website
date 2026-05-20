# KrishiNova AI - Deployment Guide

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 5000 --reload
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Access
- Frontend: http://localhost:5173
- API: http://localhost:5000

---

## Docker Deployment

### 1. Build and Run
```bash
# Edit backend/.env with your credentials first
# Then:

docker-compose up --build
```

### 2. Services
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Gemini Vision API key | Yes |
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `OLLAMA_URL` | Ollama server URL (optional) | No |

---

## Features Working

| Feature | Endpoint | Status |
|---------|----------|--------|
| Image Upload & Analysis | `/analyze` | ✅ Gemini Vision |
| Disease Detection | `/analyze` | ✅ Gemini Vision |
| Chat Assistant | `/chat` | ✅ Gemini API |
| Voice Assistant | `/chat` | ✅ Gemini API |
| Detection History | `/history` | ✅ MongoDB |
| Dashboard Stats | `/history` | ✅ MongoDB |
| Live Camera Scan | `/predict` | ✅ Gemini Vision |

---

## Architecture

- **Primary AI**: Gemini 2.0 Flash (Vision + Chat)
- **Fallback**: YOLOv8 + EfficientNet (local ML)
- **Database**: MongoDB Atlas
- **Frontend**: React + Vite + Tailwind