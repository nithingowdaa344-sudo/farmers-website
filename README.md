# KrishiNova AI: Plant Leaf Disease Detection System 🌿🤖

A production-grade, AI-powered agricultural diagnostic application designed to identify crop diseases instantly. This system uses a hybrid model pipeline: **YOLOv8** for detecting leaves in images (with real-time webcam bounding box overlays) and **EfficientNet-B0** for classifying plant diseases.

---

## ✨ Features
- **YOLOv8 Leaf Detection**: Identifies plant leaves and targets diseased regions inside bounding boxes.
- **EfficientNet Classifier**: Pre-trained `efficientnet_b0` fine-tuned on the PlantVillage dataset for high-accuracy disease diagnosis.
- **Optics Overlay**: Real-time bounding box annotations with severity color codes (Mild: Yellow, Moderate: Orange, Severe: Red, Healthy: Green).
- **Comprehensive Remedies**: Structured advice including Symptoms, remedies, fertilizers/nutrients, precautions, and preventative measures.
- **Dual Interfaces**:
  - **Standalone Streamlit App**: Simple web application supporting image file upload and browser-based webcam captures.
  - **Premium React Dashboard**: Complete dashboard with statistics, scan history, translation/i18n support, and voice assistant.
- **Low-End GPU Friendly**: Uses lightweight architectures optimized to run quickly on CPU or low-end GPUs.

---

## 🛠️ Tech Stack
- **AI/ML Core**: Python, PyTorch, YOLOv8 (Ultralytics), EfficientNet, OpenCV, NumPy, Scikit-Learn.
- **Streamlit Frontend**: Single-page Python web application.
- **Web App Frontend**: React.js, Vite, Tailwind CSS, Framer Motion.
- **Web App Backend**: FastAPI, Uvicorn, MongoDB (history logging).

---

## 📂 Project Structure
```text
agri-club/
├── ml_core/
│   ├── dataset_utils.py    # Preprocessing, augmentations, & synthetic data generator
│   ├── train.py            # Complete PyTorch training pipeline with evaluation metrics
│   ├── yolo_efficientnet_pipeline.py  # Core YOLOv8 + EfficientNet inference pipeline
│   ├── inference.py        # Command line diagnostic inference interface
│   └── app_streamlit.py    # Standalone Streamlit application
├── backend/
│   ├── main.py             # FastAPI entrypoint
│   ├── api/routes.py       # API endpoints (including history)
│   ├── vision_pipeline.py  # FastAPI integration wrapper for ml_core
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, History, Scanner Pages
│   │   └── App.jsx         # React routing & core layout
│   └── package.json        # Node.js dependencies
└── models/                 # Stored model weights (yolov8n.pt & efficientnet_leaf_disease.pth)
```

---

## 🚀 Setup & Running Guide

### 1. Backend & ML Setup
Activate your python environment and install all packages in `backend/requirements.txt`:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run Standalone Streamlit Application
Launch the clean, standalone web application:
```bash
cd ml_core
streamlit run app_streamlit.py
```

### 3. CLI Diagnostic Inference
To run a diagnostic check on an image directly from the terminal:
```bash
cd ml_core
python inference.py --image path/to/leaf_image.jpg --output output_annotated.jpg
```

### 4. Training the Classifier Model
To train the EfficientNet-B0 classifier on your dataset (structured with folders as classes under `dataset/train/`):
```bash
cd ml_core
python train.py --data_dir path/to/dataset --epochs 10 --batch_size 16
```
*Note: If no custom dataset is available, you can append the `--dummy` flag to auto-generate a synthetic dataset for testing/compilation verification.*

### 5. Running the Complete Stack (React + FastAPI + MongoDB)
Ensure your MongoDB service is running locally, then:

1. **Start FastAPI Backend**:
   ```bash
   cd backend
   python -m uvicorn main:app --port 5000
   ```
2. **Start React Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 📊 Model Evaluation Metrics
At the end of training, the pipeline evaluates performance on validation splits and saves metrics to `models/evaluation_metrics.json`:
- **Accuracy**
- **Precision (Weighted)**
- **Recall (Weighted)**
- **F1-score (Weighted)**
