import os
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

class GradCAM:
    """
    Extracts the gradients and activations from a targeted CNN layer to build a Grad-CAM heatmap.
    """
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Hooks to extract intermediate layer outputs and gradients
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output
        
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
        
    def generate_heatmap(self, input_tensor, class_idx=None):
        # Forward pass
        self.model.zero_grad()
        output = self.model(input_tensor)
        
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
            
        # Backward pass for the predicted class
        score = output[0, class_idx]
        score.backward()
        
        # Global average pooling of gradients
        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        activations = self.activations[0]
        
        # Weight the activations
        for i in range(activations.size(0)):
            activations[i, :, :] *= pooled_gradients[i]
            
        # Generate the heatmap
        heatmap = torch.mean(activations, dim=0).squeeze().cpu().detach().numpy()
        heatmap = np.maximum(heatmap, 0) # ReLU
        if np.max(heatmap) > 0:
            heatmap /= np.max(heatmap) # Normalize between 0 and 1
            
        return heatmap

def create_heatmap_overlay(image_path, model_pipeline, output_path="outputs/heatmap.png"):
    """
    Creates a transparent Grad-CAM heatmap overlay for the given image.
    Highlights infected regions on the leaf visually.
    """
    try:
        if not hasattr(model_pipeline, 'model'):
            print("No underlying PyTorch model found. Falling back to visual approximation.")
            return generate_fallback_heatmap(image_path, output_path)
            
        pt_model = model_pipeline.model
        device = model_pipeline.device
        
        # Dynamically find the last convolutional layer for Grad-CAM
        target_layer = None
        if hasattr(pt_model, 'conv_head'):
            target_layer = pt_model.conv_head # EfficientNet
        elif hasattr(pt_model, 'stages'):
            target_layer = pt_model.stages[-1] # ConvNeXt
        else:
            return generate_fallback_heatmap(image_path, output_path) # Fallback for ViT or others
            
        grad_cam = GradCAM(pt_model, target_layer)
        
        # Prepare the image
        image = Image.open(image_path).convert('RGB')
        input_tensor = model_pipeline.transform(image).unsqueeze(0).to(device)
        
        # Use full precision for Grad-CAM gradients backpropagation
        if device.type == 'cuda' and pt_model.parameters().__next__().dtype == torch.float16:
            input_tensor = input_tensor.half()
            
        heatmap = grad_cam.generate_heatmap(input_tensor)
        
        # Read the original image for overlay
        original_img = cv2.imread(image_path)
        
        # Resize heatmap and apply color map
        heatmap = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Blend the images (Transparent heatmap overlay)
        alpha = 0.5
        superimposed_img = heatmap * alpha + original_img * (1 - alpha)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, superimposed_img)
        
        return output_path
        
    except Exception as e:
        print(f"GradCAM failed: {e}. Falling back to visual proxy.")
        return generate_fallback_heatmap(image_path, output_path)

def generate_fallback_heatmap(image_path, output_path):
    """
    Fallback proxy for models where GradCAM cannot be attached directly (like pure Transformers).
    Uses OpenCV salience/texture variance to highlight potential disease lesions.
    """
    try:
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Use Laplacian variance to find high-texture areas (often indicative of lesions)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        laplacian = cv2.Laplacian(blur, cv2.CV_64F)
        heatmap = np.absolute(laplacian)
        
        # Normalize and apply color map
        heatmap = cv2.normalize(heatmap, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        alpha = 0.4
        overlay = cv2.addWeighted(heatmap, alpha, img, 1 - alpha, 0)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, overlay)
        return output_path
    except Exception as e:
        print(f"Fallback generation failed: {e}")
        return None
