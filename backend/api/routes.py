import os
import uuid
import shutil
import logging
import traceback
from datetime import datetime
from PIL import Image
from pymongo import MongoClient
from dotenv import load_dotenv

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool

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

# Lazy-loaded vision pipeline (initialized on first request)
vision_pipeline = None

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    mongo_client.server_info()  # Test connection
    db = mongo_client["krishinova_db"]
    history_collection = db["detection_history"]
    MONGO_AVAILABLE = True
    logger.info("MongoDB connected successfully.")
except Exception as mongo_init_err:
    logger.warning(f"MongoDB not available: {mongo_init_err}. History will be skipped.")
    MONGO_AVAILABLE = False
    history_collection = None


def validate_image_file(file_path: str):
    """Validates if the file is a real image using PIL."""
    try:
        with Image.open(file_path) as img:
            img.verify()
    except Exception as e:
        logger.warning(f"Image validation failed for {file_path}: {e}")
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image. Please upload a PNG, JPEG, or WEBP image.",
        )


@router.get("/")
def home():
    return {"message": "KrishiNova AI Vision Backend is active!", "version": "6.0.0"}


@router.get("/health")
def health():
    return {"status": "Backend is running", "model": "qwen2.5vl"}


@router.get("/model-status")
async def get_model_status():
    global vision_pipeline
    return JSONResponse(
        content={
            "vision_pipeline": "Loaded" if vision_pipeline else "Not Loaded (Lazy)",
            "model": "qwen2.5vl",
        },
        status_code=200,
    )


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Upload a plant image → AI analyzes it with qwen2.5vl → returns real diagnosis.
    Each image is processed independently — no caching, no hardcoded results.
    """
    global vision_pipeline

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Please upload an image file.",
        )

    # Save uploaded file to a unique temp path
    temp_path = f"temp_analyze_{uuid.uuid4().hex}.jpg"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Received image: {file.filename} ({file.content_type}) → saved to {temp_path}")

        # Validate it's a real image
        validate_image_file(temp_path)

        # Initialize pipeline lazily
        if vision_pipeline is None:
            logger.info("Initializing VisionPipeline for first request...")
            vision_pipeline = VisionPipeline()

        # Run model inference in thread pool (non-blocking)
        pipeline_res = await run_in_threadpool(vision_pipeline.run, temp_path)

        logger.info(
            f"Analysis complete → Plant: {pipeline_res.get('plant')} | "
            f"Disease: {pipeline_res.get('disease')} | "
            f"Confidence: {pipeline_res.get('confidence')}% | "
            f"Model: {pipeline_res.get('model_used')}"
        )

        # Save to MongoDB (non-critical — don't fail if Mongo is down)
        if MONGO_AVAILABLE and history_collection is not None:
            try:
                db_record = pipeline_res.copy()
                db_record["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                db_record["original_filename"] = file.filename
                history_collection.insert_one(db_record)
                # Remove MongoDB _id before returning
                if "_id" in pipeline_res:
                    del pipeline_res["_id"]
            except Exception as mongo_err:
                logger.warning(f"MongoDB save failed (non-critical): {mongo_err}")

        # Add no-cache headers so every request is fresh
        response = JSONResponse(content=pipeline_res, status_code=200)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST /analyze error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        # Always clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                logger.info(f"Cleaned up temp file: {temp_path}")
            except Exception as cleanup_err:
                logger.warning(f"Could not remove temp file {temp_path}: {cleanup_err}")


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Alias for /analyze for backward compatibility."""
    return await analyze(file)


@router.get("/history")
def get_history():
    if not MONGO_AVAILABLE or history_collection is None:
        return JSONResponse(content=[], status_code=200)
    try:
        scans = list(
            history_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(20)
        )
        return JSONResponse(content=scans, status_code=200)
    except Exception as e:
        logger.error(f"Error in GET /history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")


@router.post("/chat")
async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    user_message = body.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")

    try:
        ai_response = await run_in_threadpool(get_chat_response, user_message)
        return JSONResponse(content={"response": ai_response}, status_code=200)
    except Exception as e:
        logger.error(f"POST /chat error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Chat processing failed")
