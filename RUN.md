# KrishiNova AI - Deployment Guide

## Environment Variables

### Backend (set in Vercel Dashboard or .env)

| Variable | Value | Required |
|----------|-------|----------|
| `GEMINI_API_KEY` | `AIzaSyBx9jfQ7kaZq8NYWfK2K5rPdPVMxlExf-Q` | Yes |
| `MONGO_URI` | `mongodb+srv://nithingowdaa344_db_user:G9iwLpd122xZgX64@cluster0.gnutjqc.mongodb.net/` | Yes |
| `OLLAMA_URL` | `http://localhost:11434` | No (optional fallback) |

### Frontend (set in Vercel Dashboard)

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_URL` | `https://your-backend.vercel.app` | Yes (Production) |

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 5000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000
- API Docs: http://localhost:5000/docs

---

## Deploy to Vercel

### 1. Backend (FastAPI)

**Option A - Vercel Dashboard (Recommended):**
1. Push code to GitHub
2. Go to https://vercel.com → Add New Project
3. Import your repo → Select the `backend` folder as root
4. Framework: **Other**
5. Build Command: `pip install -r requirements.txt`
6. Output Directory: `.`
7. Add Environment Variables:
   - `GEMINI_API_KEY` = your key
   - `MONGO_URI` = your mongo uri
8. Deploy

**Option B - Vercel CLI:**
```bash
cd backend
vercel --prod
```

### 2. Frontend (React)

**Option A - Vercel Dashboard:**
1. Add New Project → Select `frontend` folder as root
2. Framework: **Vite**
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.vercel.app`
4. Deploy

**Option B - Vercel CLI:**
```bash
cd frontend
vercel --prod
```

---

## Docker Deployment

```bash
docker-compose up --build
```

---

## Project Structure
```
agri club/
├── backend/           # FastAPI (primary - Gemini Vision)
│   ├── main.py
│   ├── api/routes.py  # 7 endpoints
│   ├── utils/         # AI services, translations
│   ├── .env           # Backend env vars
│   ├── vercel.json
│   └── requirements.txt
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/     # 5 pages
│   │   ├── components/# 3 components
│   │   └── translations.js
│   └── package.json
├── ml_core/           # Local ML fallback
├── models/            # Pre-trained models
└── docker-compose.yml
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/model-status` | Pipeline status |
| POST | `/analyze` | Upload & detect disease |
| POST | `/predict` | Alias for analyze |
| GET | `/history` | Detection history |
| POST | `/chat` | AI chat (Gemini) |