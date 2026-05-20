import os
import uuid
import shutil
import logging
import traceback
import asyncio
from datetime import datetime
from PIL import Image
from pymongo import MongoClient
from dotenv import load_dotenv

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse

from vision_pipeline import VisionPipeline
from utils.ai_services import get_chat_response

load_dotenv()

logger = logging.getLogger("KrishiNova-API")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

router = APIRouter()

vision_pipeline = None

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    mongo_client.server_info()
    db = mongo_client["krishinova_db"]
    history_collection = db["detection_history"]
    MONGO_AVAILABLE = True
    logger.info("MongoDB connected.")
except Exception as e:
    logger.warning(f"MongoDB not available: {e}")
    MONGO_AVAILABLE = False
    history_collection = None


def validate_image_file(file_path: str):
    try:
        with Image.open(file_path) as img:
            img.verify()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image file")


@router.get("/")
def home():
    return {"message": "KrishiNova AI Vision Backend", "version": "2.0.0"}


@router.get("/health")
def health():
    return {"status": "Backend is running", "model": "Gemini Vision"}


@router.get("/model-status")
async def get_model_status():
    global vision_pipeline
    return JSONResponse(content={"vision_pipeline": "Ready" if vision_pipeline else "Lazy"})


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    global vision_pipeline

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    temp_path = f"temp_analyze_{uuid.uuid4().hex}.jpg"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        validate_image_file(temp_path)

        if vision_pipeline is None:
            vision_pipeline = VisionPipeline()

        pipeline_res = await asyncio.to_thread(vision_pipeline.run, temp_path)

        if MONGO_AVAILABLE and history_collection:
            try:
                db_record = pipeline_res.copy()
                db_record["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                db_record["original_filename"] = file.filename
                history_collection.insert_one(db_record)
                if "_id" in pipeline_res:
                    del pipeline_res["_id"]
            except Exception as e:
                logger.warning(f"MongoDB save failed: {e}")

        response = JSONResponse(content=pipeline_res, status_code=200)
        response.headers["Cache-Control"] = "no-store"
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST /analyze error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    return await analyze(file)


@router.get("/history")
def get_history():
    if not MONGO_AVAILABLE or history_collection is None:
        return JSONResponse(content=[])
    try:
        scans = list(history_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(20))
        return JSONResponse(content=scans)
    except Exception as e:
        logger.error(f"GET /history error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")


@router.post("/chat")
async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    user_message = body.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message required")

    try:
        ai_response = await asyncio.to_thread(get_chat_response, user_message)
        return JSONResponse(content={"response": ai_response})
    except Exception as e:
        logger.error(f"POST /chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")