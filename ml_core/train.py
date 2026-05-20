import os
import sys
import argparse
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from tqdm import tqdm

# Import local utilities
from dataset_utils import PlantVillageDataset, get_data_transforms, create_dummy_dataset

def main(args):
    # Determine device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Training] Using device: {device}")

    # Set random seed for reproducibility
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)

    # 1. Setup Dataset
    if args.dummy or not os.path.exists(args.data_dir):
        print(f"[Training] Data directory '{args.data_dir}' not found or --dummy flag active.")
        data_path = create_dummy_dataset(output_dir="dummy_dataset", num_images_per_class=15)
    else:
        data_path = args.data_dir

    train_transform, val_transform = get_data_transforms()

    # Load complete dataset to find classes
    full_dataset = PlantVillageDataset(root_dir=data_path, transform=train_transform)
    classes = full_dataset.classes
    num_classes = len(classes)
    class_to_idx = full_dataset.class_to_idx

    print(f"[Training] Classes detected ({num_classes}): {classes}")

    # Save class mapping to JSON for inference mapping
    os.makedirs("models", exist_ok=True)
    with open(os.path.join("models", "class_indices.json"), "w") as f:
        json.dump({i: c for i, c in enumerate(classes)}, f, indent=4)

    # Split into train & validation (80-20 split)
    val_size = int(len(full_dataset) * 0.2)
    train_size = len(full_dataset) - val_size
    train_subset, val_subset = random_split(full_dataset, [train_size, val_size])

    # Apply validation transform to val subset
    class SubsetWithTransform(torch.utils.data.Dataset):
        def __init__(self, subset, transform):
            self.subset = subset
            self.transform = transform
        def __getitem__(self, index):
            x, y = self.subset[index]
            # subset contains items from parent dataset with train_transform already applied,
            # so we fetch raw image paths/labels directly to apply correct validation transform.
            parent_idx = self.subset.indices[index]
            raw_img_path = self.subset.dataset.image_paths[parent_idx]
            raw_label = self.subset.dataset.labels[parent_idx]
            
            from PIL import Image
            img = Image.open(raw_img_path).convert('RGB')
            if self.transform:
                img = self.transform(img)
            return img, raw_label
        def __len__(self):
            return len(self.subset)

    train_dataset = SubsetWithTransform(train_subset, train_transform)
    val_dataset = SubsetWithTransform(val_subset, val_transform)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)

    print(f"[Training] Dataset size: Train={len(train_dataset)}, Validation={len(val_dataset)}")

    # 2. Build EfficientNet Model
    print("[Training] Initializing EfficientNet-B0 model...")
    try:
        from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
        model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        print("[Training] Loaded pre-trained weights via EfficientNet_B0_Weights")
    except Exception:
        try:
            from torchvision.models import efficientnet_b0
            model = efficientnet_b0(pretrained=True)
            print("[Training] Loaded pre-trained weights via legacy pretrained=True")
        except Exception as e:
            # Fallback to model without pretraining if offline
            print(f"[Training] Model load failed: {e}. Building raw model...")
            from torchvision.models import efficientnet_b0
            model = efficientnet_b0(num_classes=num_classes)

    # Re-build classifier head for our classes
    if hasattr(model, 'classifier') and len(model.classifier) > 1:
        num_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_features, num_classes)
    
    model = model.to(device)

    # 3. Define Optimizer & Loss
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=2, factor=0.5)

    best_acc = 0.0

    # 4. Training Loop
    for epoch in range(args.epochs):
        print(f"\n--- Epoch {epoch+1}/{args.epochs} ---")
        model.train()
        running_loss = 0.0
        
        # Train epoch
        for images, labels in tqdm(train_loader, desc="Training Batches"):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            
        epoch_loss = running_loss / len(train_dataset)
        print(f"Train Loss: {epoch_loss:.4f}")
        
        # Validation epoch
        model.eval()
        val_loss = 0.0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                
                _, preds = torch.max(outputs, 1)
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                
        epoch_val_loss = val_loss / len(val_dataset)
        
        # Calculate Metrics
        accuracy = accuracy_score(all_labels, all_preds)
        precision, recall, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='weighted', zero_division=0)
        
        print(f"Val Loss: {epoch_val_loss:.4f} | Accuracy: {accuracy*100:.2f}%")
        print(f"Precision: {precision:.4f} | Recall: {recall:.4f} | F1-Score: {f1:.4f}")
        
        # Step LR scheduler
        scheduler.step(epoch_val_loss)
        
        # Save best model
        if accuracy > best_acc:
            best_acc = accuracy
            torch.save(model.state_dict(), args.save_path)
            print(f"[Training] Model saved to '{args.save_path}' with Accuracy: {accuracy*100:.2f}%")
            
            # Export report
            report = {
                "epoch": epoch + 1,
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "val_loss": epoch_val_loss,
                "classes": classes
            }
            with open(os.path.join("models", "evaluation_metrics.json"), "w") as rf:
                json.dump(report, rf, indent=4)

    print("\n[Training] Training complete!")
    print(f"[Training] Best validation accuracy: {best_acc*100:.2f}%")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train EfficientNet on PlantVillage Plant Disease Dataset")
    parser.add_argument("--data_dir", type=str, default="dataset/train", help="Path to training images")
    parser.add_argument("--epochs", type=str, default="5", help="Number of training epochs (converted to int internally)")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--dummy", action="store_true", help="Generate and train on dummy dataset for testing compilation")
    parser.add_argument("--save_path", type=str, default="models/efficientnet_leaf_disease.pth", help="Path to save model")
    
    args = parser.parse_args()
    # Safely convert epochs to int
    args.epochs = int(args.epochs)
    main(args)
