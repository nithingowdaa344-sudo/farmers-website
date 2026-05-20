import os
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import numpy as np

class PlantVillageDataset(Dataset):
    """
    Custom PyTorch Dataset for loading PlantVillage images.
    Supports a root directory structured as:
    root_dir/
      class_1/
        img_1.jpg
        ...
      class_2/
        img_2.jpg
        ...
    """
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.image_paths = []
        self.labels = []
        
        # Identify classes based on folder names
        self.classes = sorted([d for d in os.listdir(root_dir) if os.path.isdir(os.path.join(root_dir, d))])
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        
        for cls_name in self.classes:
            cls_dir = os.path.join(root_dir, cls_name)
            for f in os.listdir(cls_dir):
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    self.image_paths.append(os.path.join(cls_dir, f))
                    self.labels.append(self.class_to_idx[cls_name])
                    
    def __len__(self):
        return len(self.image_paths)
        
    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.labels[idx]
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def get_data_transforms():
    """
    Standard data preprocessing & augmentation for EfficientNet (224x224).
    """
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def create_dummy_dataset(output_dir="dummy_dataset", num_images_per_class=10):
    """
    Creates a dummy dataset with synthetic leaf-like images for local testing & compilation.
    """
    classes = [
        "Apple___Apple_scab", "Apple___healthy",
        "Corn___Common_rust", "Corn___healthy",
        "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
        "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___healthy"
    ]
    
    os.makedirs(output_dir, exist_ok=True)
    for cls in classes:
        cls_path = os.path.join(output_dir, cls)
        os.makedirs(cls_path, exist_ok=True)
        
        for i in range(num_images_per_class):
            # Create synthetic leaf image (mostly green with some random spots)
            img_arr = np.zeros((256, 256, 3), dtype=np.uint8)
            # Base green color representing leaf
            img_arr[:, :, 1] = np.random.randint(120, 200, size=(256, 256)) # Green channel
            img_arr[:, :, 0] = np.random.randint(20, 100, size=(256, 256))  # Red channel
            img_arr[:, :, 2] = np.random.randint(10, 60, size=(256, 256))   # Blue channel
            
            # Add yellow/brown spots if not healthy
            if "healthy" not in cls.lower():
                num_spots = np.random.randint(3, 10)
                for _ in range(num_spots):
                    cx, cy = np.random.randint(50, 200, size=2)
                    r = np.random.randint(5, 25)
                    # Brown/yellow spot: high red/green, low blue
                    img_arr[cy-r:cy+r, cx-r:cx+r, 0] = 139  # Red
                    img_arr[cy-r:cy+r, cx-r:cx+r, 1] = 69   # Green
                    img_arr[cy-r:cy+r, cx-r:cx+r, 2] = 19   # Blue
            
            img = Image.fromarray(img_arr)
            img.save(os.path.join(cls_path, f"leaf_{i}.jpg"))
            
    print(f"[Dataset] Dummy dataset created successfully at '{output_dir}' with {len(classes)} classes.")
    return output_dir
