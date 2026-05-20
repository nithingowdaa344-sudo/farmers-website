import os
import streamlit as st
from PIL import Image
import tempfile
import numpy as np

# Add local path to import pipeline
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from yolo_efficientnet_pipeline import YoloEfficientNetPipeline

# Set Page Config
st.set_page_config(
    page_title="KrishiNova AI - Crop Disease Detection",
    page_icon="🌾",
    layout="wide"
)

# Custom Premium Styling
st.markdown("""
<style>
    .main {
        background-color: #f8fafc;
    }
    .title-text {
        font-family: 'Outfit', sans-serif;
        background: linear-gradient(135deg, #2e7144, #2dd4bf, #10b981);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
        font-size: 2.8rem;
        margin-bottom: 0.5rem;
    }
    .subtitle-text {
        color: #64748b;
        font-size: 1.1rem;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        border: 1px solid #e2e8f0;
    }
    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        display: inline-block;
    }
    .badge-severe { background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
    .badge-moderate { background-color: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
    .badge-mild { background-color: #fefefe; color: #ca8a04; border: 1px solid #fef9c3; }
    .badge-none { background-color: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
</style>
""", unsafe_style_allowed=True)

# Initialize pipeline session state to lazy load
@st.cache_resource
def load_pipeline():
    # Make sure output dirs exist
    os.makedirs("outputs", exist_ok=True)
    return YoloEfficientNetPipeline()

try:
    pipeline = load_pipeline()
    pipeline_loaded = True
except Exception as e:
    st.error(f"Failed to load pipeline models: {e}")
    pipeline_loaded = False

# Layout
st.markdown("<div class='title-text'>KrishiNova AI 🌾</div>", unsafe_style_allowed=True)
st.markdown("<div class='subtitle-text'>YOLOv8 + EfficientNet Hybrid Plant Disease Diagnostics</div>", unsafe_style_allowed=True)

col_input, col_output = st.columns([1, 1.2], gap="large")

with col_input:
    st.subheader("Optics Input Channel")
    
    # Input Selection Tab
    input_mode = st.radio("Choose Input Method:", ("Upload Image File", "Use Webcam / Live Camera"))
    
    uploaded_file = None
    webcam_image = None
    
    if input_mode == "Upload Image File":
        uploaded_file = st.file_uploader("Upload a clear plant leaf photo...", type=["jpg", "jpeg", "png", "webp"])
    else:
        webcam_image = st.camera_input("Acquire leaf specimen target...")
        
    st.info("💡 Tip: Ensure the leaf is centered, well-lit, and occupying most of the frame for maximum confidence.")

with col_output:
    st.subheader("Neural Diagnostic Output")
    
    target_img_src = None
    
    if uploaded_file is not None:
        target_img_src = uploaded_file
    elif webcam_image is not None:
        target_img_src = webcam_image
        
    if target_img_src is not None and pipeline_loaded:
        with st.spinner("Analyzing image frame..."):
            # Save upload to a temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                # Read bytes and write to temp file
                if hasattr(target_img_src, 'getvalue'):
                    tmp.write(target_img_src.getvalue())
                else:
                    tmp.write(target_img_src.read())
                tmp_path = tmp.name
                
            # Perform diagnosis
            output_overlay_path = os.path.join("outputs", "streamlit_inference.jpg")
            res = pipeline.analyze(tmp_path, output_overlay_path=output_overlay_path)
            
            # Clean up temp file
            try:
                os.remove(tmp_path)
            except:
                pass
                
            if res.get("status") == "success":
                # Display output bounding box image
                st.image(output_overlay_path, caption="YOLOv8 Bounding Box & Class Visualizer", use_container_width=True)
                
                # Badges
                severity = res.get("severity", "Moderate")
                badge_class = "badge-none"
                if severity.lower() == "severe":
                    badge_class = "badge-severe"
                elif severity.lower() == "moderate":
                    badge_class = "badge-moderate"
                elif severity.lower() == "mild":
                    badge_class = "badge-mild"
                    
                # Stat rows
                st.markdown(f"### Diagnosis: **{res.get('disease')}**")
                st.markdown(f"**Host Plant:** {res.get('plant')} | **Severity Level:** <span class='badge {badge_class}'>{severity}</span>", unsafe_style_allowed=True)
                
                # Confidence Meter
                st.metric("Consensus Confidence", f"{res.get('confidence')}%")
                st.metric("Infection Damage Area", f"{res.get('infection_percentage')}%")
                
                st.warning(res.get("urgency_warning"))
                
                # Details Accoridion
                with st.expander("🔬 Visual Symptoms Analyzed", expanded=True):
                    st.write(res.get("symptoms"))
                with st.expander("💊 Recommended Treatment & Remedies", expanded=True):
                    st.write(res.get("remedies"))
                with st.expander("🧪 Fertilizer & Nutrient Adjustments", expanded=False):
                    st.write(res.get("fertilizer"))
                with st.expander("🛡️ Spread Precautions", expanded=False):
                    st.write(res.get("precautions"))
                with st.expander("🎯 Future Prevention Steps", expanded=False):
                    st.write(res.get("preventions"))
            else:
                st.error(f"Analysis failed: {res.get('message')}")
    else:
        st.write("Awaiting image input feed from the optics channel to begin diagnostic analysis...")
