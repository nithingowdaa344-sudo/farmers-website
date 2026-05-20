import torch
import cv2
import numpy as np
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
import torchvision.transforms as transforms
from PIL import Image
import os

def generate_heatmap(image_path, output_path, model):
    """
    Generates a Grad-CAM heatmap using the provided PyTorch model.
    """
    if not model:
        # Fallback if models failed to load
        return False
        
    try:
        img = Image.open(image_path).convert('RGB')
        img_resized = img.resize((224, 224))
        
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        input_tensor = transform(img_resized).unsqueeze(0)
        
        # Try to find target layer for ConvNeXt
        try:
            target_layers = [model.stages[-1][-1]]
        except:
            try:
                target_layers = [model.blocks[-1]] # ViT
            except:
                return False

        cam = GradCAM(model=model, target_layers=target_layers)
        
        grayscale_cam = cam(input_tensor=input_tensor)
        grayscale_cam = grayscale_cam[0, :]
        
        rgb_img = np.float32(img_resized) / 255
        visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
        
        visualization_pil = Image.fromarray(visualization)
        visualization_pil = visualization_pil.resize(img.size, Image.Resampling.LANCZOS)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        visualization_pil.save(output_path)
        return True
    except Exception as e:
        print(f"GradCAM generation error: {e}")
        return False
