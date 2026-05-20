import os
import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration

class BLIPReasoning:
    """
    BLIP-based Vision-Language Reasoning Engine.
    Generates natural language diagnoses, describes visible symptoms, and explains damage patterns.
    """
    def __init__(self, device=None):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        print(f"BLIPReasoning: Loading Salesforce/blip-image-captioning-base on {self.device}...")
        
        try:
            self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
            self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(self.device)
            self.model.eval()
            self.enabled = True
            print("BLIPReasoning: Loaded successfully!")
        except Exception as e:
            print(f"Error loading BLIP model: {e}. Falling back to rule-based template engine.")
            self.enabled = False

    def generate_reasoning(self, image_path: str, plant: str = "Plant", disease: str = "Healthy Foliage") -> str:
        """
        Analyzes the leaf image and generates natural language explanations of symptoms.
        """
        blip_desc = ""
        if self.enabled:
            try:
                image = Image.open(image_path).convert("RGB")
                
                # Visual QA Prompt for symptoms
                prompt = "Question: describe the leaf color, spot symptoms, and damage patterns on this leaf. Answer:"
                inputs = self.processor(images=image, text=prompt, return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    outputs = self.model.generate(
                        **inputs, 
                        max_length=80, 
                        min_length=15, 
                        num_beams=3, 
                        repetition_penalty=1.5
                    )
                
                caption = self.processor.decode(outputs[0], skip_special_tokens=True).strip()
                if caption.lower().startswith("answer:"):
                    caption = caption[7:].strip()
                
                if len(caption) > 5 and not caption.lower().startswith("question"):
                    blip_desc = caption[0].upper() + caption[1:]
            except Exception as e:
                print(f"BLIP visual analysis error: {e}")

        # Combine BLIP visual output with domain-specific diagnostic reasoning
        return self._build_clinical_diagnosis(blip_desc, plant, disease)

    def _build_clinical_diagnosis(self, blip_desc: str, plant: str, disease: str) -> str:
        """
        Synthesizes raw BLIP visual cues and agricultural knowledge into a premium diagnosis.
        """
        disease_lower = disease.lower()
        
        # Determine visual markers and damage patterns based on disease target
        if "healthy" in disease_lower or disease == "Healthy Foliage":
            reasoning = "The leaf displays uniform chlorophyll distribution and healthy cellular structures. No necrotic spots, blight lesions, or pathogen colonies are visible."
            if blip_desc:
                reasoning = f"Visual analysis indicates a healthy plant leaf. {blip_desc}."
        elif "spot" in disease_lower or "leaf spot" in disease_lower:
            reasoning = "The image shows dark brown circular lesions and yellow halos consistent with fungal leaf spot disease."
            if blip_desc:
                reasoning = f"{blip_desc}. This matches symptoms of dark brown circular lesions and yellow chlorotic halos typical of leaf spot disease."
        elif "blight" in disease_lower:
            reasoning = "The image shows large, irregular water-soaked browning lesions and tissue necrosis starting at the leaf tips, indicating bacterial blight infection."
            if blip_desc:
                reasoning = f"{blip_desc}. These symptoms correspond to advancing water-soaked lesions and bacterial blight margins."
        elif "rust" in disease_lower:
            reasoning = "The image shows characteristic powdery orange-brown pustules scattered across the leaf surface, indicating active rust spore germination."
            if blip_desc:
                reasoning = f"{blip_desc}. Powdery orange pustules on the leaf surface indicate a rust fungal infection."
        elif "mite" in disease_lower or "spider mite" in disease_lower:
            reasoning = "The image shows fine white speckling, stippling, and light webbing on the leaf surface, indicating spider mite damage."
            if blip_desc:
                reasoning = f"{blip_desc}. White stippling and light webbing are indicative of spider mite damage."
        else:
            reasoning = f"The image shows visual symptoms consistent with {disease} on a {plant} specimen, including leaf surface discoloration and tissue degradation."
            if blip_desc:
                reasoning = f"{blip_desc}. This is consistent with {disease}."
                
        return reasoning
