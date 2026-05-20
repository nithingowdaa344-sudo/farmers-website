import os
import uuid
import shutil
import logging
import traceback
from datetime import datetime
from PIL import Image
from pymongo import MongoClient
from dotenv import load_dotenv

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool

# Import the unified pipeline and chat services
from vision_pipeline import VisionPipeline
from utils.ai_services import get_chat_response

load_dotenv()

# Logger setup
logger = logging.getLogger("KrishiNova-API")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

router = APIRouter()

# Global lazy vision pipeline
vision_pipeline = None
LAST_IMAGE_PATH = "last_predict_image.jpg"
last_predicted_plant = "Plant"
last_predicted_disease = "Healthy Foliage"

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client['krishinova_db']
history_collection = db['detection_history']

def validate_image_file(file_path: str):
    """
    Validates if a file is a valid image using PIL.
    """
    try:
        with Image.open(file_path) as img:
            img.verify()
    except Exception as e:
        logger.warning(f"Image validation failed for {file_path}: {e}")
        raise HTTPException(
            status_code=400, 
            detail="Uploaded file is not a valid image. Please upload a PNG, JPEG, or WEBP image."
        )

@router.get("/")
def home():
    return {"message": "KrishiNova AI Multimodal Vision Backend API is active!", "version": "5.0.0"}

@router.get("/health")
def health():
    return {"status": "Backend is running"}

@router.get("/model-status")
async def get_model_status():
    global vision_pipeline
    try:
        status = {
            "vision_pipeline": "Loaded" if vision_pipeline else "Not Loaded (Lazy)"
        }
        return JSONResponse(content=status, status_code=200)
    except Exception as e:
        logger.error(f"Error in GET /model-status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error checking model status")

@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Runs the new Qwen2.5-VL AI pipeline on an uploaded image.
    """
    global vision_pipeline, last_predicted_plant, last_predicted_disease
    
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    temp_path = f"temp_analyze_{uuid.uuid4().hex}.jpg"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        validate_image_file(temp_path)
        shutil.copyfile(temp_path, LAST_IMAGE_PATH)

        if vision_pipeline is None:
            vision_pipeline = VisionPipeline()

        # Run model inference in threadpool
        pipeline_res = await run_in_threadpool(vision_pipeline.run, temp_path)

        if pipeline_res.get("status") == "invalid_input":
            return JSONResponse(content=pipeline_res, status_code=200)

        # Track last predicted state
        last_predicted_plant = pipeline_res.get("crop", "Unknown")
        last_predicted_disease = pipeline_res.get("disease", "Unknown")

        # Save record to MongoDB
        try:
            db_record = pipeline_res.copy()
            db_record["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            history_collection.insert_one(db_record)
            if '_id' in pipeline_res:
                del pipeline_res['_id']
        except Exception as mongo_err:
            logger.error(f"MongoDB save failed in /analyze: {mongo_err}")

        return JSONResponse(content=pipeline_res, status_code=200)

    except Exception as e:
        logger.error(f"POST /analyze error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Redirect to analyze for backward compatibility
    return await analyze(file)

@router.get("/history")
def get_history():
    try:
        scans = list(history_collection.find({}, {'_id': 0}).sort('timestamp', -1).limit(20))
        return JSONResponse(content=scans, status_code=200)
    except Exception as e:
        logger.error(f"Error in GET /history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@router.post("/chat")
async def chat(request: dict):
    user_message = request.get('message', '')
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required")
        
    try:
        ai_response = await run_in_threadpool(get_chat_response, user_message)
        return JSONResponse(content={"response": ai_response}, status_code=200)
    except Exception as e:
        logger.error(f"POST /chat error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Chat processing failed")
