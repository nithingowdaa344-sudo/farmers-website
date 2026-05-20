import os
import argparse
import json
from yolo_efficientnet_pipeline import YoloEfficientNetPipeline

def main():
    parser = argparse.ArgumentParser(description="KrishiNova Plant Disease Offline Inference Script")
    parser.add_argument("--image", type=str, required=True, help="Path to input plant leaf image")
    parser.add_argument("--output", type=str, default="annotated_output.jpg", help="Path to save annotated bounding box image")
    parser.add_argument("--yolo_model", type=str, default="yolov8n.pt", help="Path to YOLOv8 weights")
    parser.add_argument("--classifier_model", type=str, default="models/efficientnet_leaf_disease.pth", help="Path to EfficientNet weights")
    parser.add_argument("--class_map", type=str, default="models/class_indices.json", help="Path to class mapping JSON")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(f"[Inference] Error: Image path '{args.image}' does not exist.")
        return
        
    print("[Inference] Starting YOLOv8 + EfficientNet diagnostic analysis...")
    pipeline = YoloEfficientNetPipeline(
        yolo_model_path=args.yolo_model,
        efficientnet_path=args.classifier_model,
        class_map_path=args.class_map
    )
    
    results = pipeline.analyze(args.image, output_overlay_path=args.output)
    
    if results.get("status") == "error":
        print(f"[Inference] Failed to analyze: {results.get('message')}")
        return
        
    print("\n================ DIAGNOSTIC REPORT ================")
    print(f"Plant Species:   {results.get('plant')}")
    print(f"Condition/Class: {results.get('disease')}")
    print(f"Confidence:      {results.get('confidence')}%")
    print(f"Severity:        {results.get('severity')}")
    print(f"Estimated Damage:{results.get('infection_percentage')}%")
    print(f"Model Stack:     {results.get('model_used')}")
    print(f"Urgency Status:  {results.get('urgency_warning')}")
    print("\nVisual Symptoms:")
    print(results.get('symptoms'))
    print("\nTreatment & Remedies:")
    print(results.get('remedies'))
    print("\nFertilizer & Nutrients:")
    print(results.get('fertilizer'))
    print("\nPrecautions to Prevent Spread:")
    print(results.get('precautions'))
    print("\nFuture Preventative Steps:")
    print(results.get('preventions'))
    print("====================================================")
    print(f"[Inference] Bounding boxes drawn on image: saved to '{args.output}'")

if __name__ == '__main__':
    main()
