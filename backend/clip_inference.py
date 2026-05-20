from vision_models.clip_inference import CLIPInference

if __name__ == "__main__":
    import sys
    import json
    
    inference = CLIPInference()
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        print(json.dumps(inference.predict_disease(img_path), indent=2))
    else:
        print("Usage: python clip_inference.py <image_path>")
