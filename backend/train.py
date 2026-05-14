import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
# Replace with your dataset path
DATASET_PATH = 'dataset/PlantVillage' 

def build_model(num_classes):
    """
    Builds a MobileNetV2 transfer learning model.
    """
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # Freeze the base model
    base_model.trainable = False
    
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.2)(x)
    predictions = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def train_model():
    if not os.path.exists(DATASET_PATH):
        print(f"Dataset path {DATASET_PATH} not found. Creating a dummy model for UI testing...")
        # Create a dummy model with 38 classes (standard PlantVillage count)
        model = build_model(38)
        model.save('crop_disease_model.h5')
        print("Dummy model saved as 'crop_disease_model.h5'")
        return

    # Data Augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=0.2
    )

    train_generator = train_datagen.flow_from_directory(
        DATASET_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = train_datagen.flow_from_directory(
        DATASET_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    num_classes = len(train_generator.class_indices)
    model = build_model(num_classes)

    print("Starting training...")
    model.fit(
        train_generator,
        epochs=10,
        validation_data=validation_generator
    )

    model.save('crop_disease_model.h5')
    print("Model saved as 'crop_disease_model.h5'")

    # Save class indices to a text file for mapping
    with open('classes.txt', 'w') as f:
        for class_name in train_generator.class_indices.keys():
            f.write(f"{class_name}\n")

if __name__ == "__main__":
    train_model()
