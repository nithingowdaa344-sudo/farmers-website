from reasoning.blip_reasoning import BLIPReasoning

if __name__ == "__main__":
    import sys
    
    reasoner = BLIPReasoning()
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        print(reasoner.generate_reasoning(img_path))
    else:
        print("Usage: python blip_reasoning.py <image_path>")
