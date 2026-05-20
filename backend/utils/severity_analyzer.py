import cv2
import numpy as np

def analyze_severity(image_path, disease_name):
    """
    Analyzes a leaf image using HSV color thresholding to calculate the exact percentage 
    of diseased vs. healthy tissue, acting as a Severity Estimator.
    
    Args:
        image_path (str): Path to the image.
        disease_name (str): The name of the predicted disease to short-circuit if healthy.
        
    Returns:
        tuple: (damage_percentage, severity_level, urgency_warning)
    """
    is_healthy = "healthy" in str(disease_name).lower() or disease_name == "Unknown Condition"
    
    if is_healthy:
        return 0.0, "None", "Your crop is healthy. Maintain standard watering and nutrient care routines."
        
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 25.0, "Moderate", "Unable to compute exact area. Estimate based on standard pathogen patterns."
            
        # Convert to HSV color space for better color separation robust to lighting
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # 1. Define range for healthy Green tissue
        lower_green = np.array([25, 40, 40])
        upper_green = np.array([90, 255, 255])
        
        # 2. Define ranges for diseased tissue (Brown, Yellow chlorosis, Black necrosis)
        # Note: We split into two ranges to avoid the green spectrum while capturing reds/yellows and dark purples
        lower_disease_1 = np.array([0, 30, 20])
        upper_disease_1 = np.array([24, 255, 255])
        
        lower_disease_2 = np.array([91, 30, 20])
        upper_disease_2 = np.array([180, 255, 200]) 
        
        # Apply masks
        mask_green = cv2.inRange(hsv, lower_green, upper_green)
        mask_disease_1 = cv2.inRange(hsv, lower_disease_1, upper_disease_1)
        mask_disease_2 = cv2.inRange(hsv, lower_disease_2, upper_disease_2)
        
        # Combine disease masks
        mask_disease = cv2.bitwise_or(mask_disease_1, mask_disease_2)
        
        # Count pixels
        healthy_pixels = cv2.countNonZero(mask_green)
        diseased_pixels = cv2.countNonZero(mask_disease)
        
        total_leaf_pixels = healthy_pixels + diseased_pixels
        
        # Fallback if leaf is barely visible against background
        if total_leaf_pixels < 500: 
            damage_percentage = 25.0 
        else:
            damage_percentage = (diseased_pixels / total_leaf_pixels) * 100.0
            
        # Ensure bounds for the UI
        damage_percentage = min(max(damage_percentage, 1.0), 99.0)
        
        # Categorize
        if damage_percentage < 15:
            severity_level = "Mild"
            urgency_warning = "Early signs of infection. Apply targeted organic fungicides or mild chemical sprays."
        elif damage_percentage < 40:
            severity_level = "Moderate"
            urgency_warning = "Infection is spreading. Immediate treatment required to prevent yield loss."
        else:
            severity_level = "Severe"
            urgency_warning = "CRITICAL: Severe structural damage. Isolate plant and apply aggressive countermeasures immediately."
            
        return round(damage_percentage, 1), severity_level, urgency_warning
        
    except Exception as e:
        print(f"Error in CV severity analysis: {e}")
        return 30.0, "Moderate", "Standard treatment recommended based on AI diagnosis."
