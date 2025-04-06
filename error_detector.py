# src/error_detection/package_scanner.py

import cv2
import numpy as np
from tensorflow.keras.models import load_model
import logging
from ..database.db_client import OrderDatabase
from ..utils.logger import setup_logger

logger = setup_logger('package_scanner')

class PackageScanner:
    def __init__(self, model_path='models/package_scanner_v3.h5'):
        """Initialize the package scanner with a pre-trained vision model"""
        try:
            self.model = load_model(model_path)
            logger.info(f"Successfully loaded model from {model_path}")
            self.db = OrderDatabase()
        except Exception as e:
            logger.error(f"Failed to initialize PackageScanner: {str(e)}")
            raise

    def scan_image(self, image_path):
        """Process an image and detect items in it"""
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to load image: {image_path}")
                return None
                
            # Preprocess image for model
            image = cv2.resize(image, (224, 224))
            image = image / 255.0  # Normalize
            image = np.expand_dims(image, axis=0)
            
            # Get model prediction
            predictions = self.model.predict(image)
            
            # Decode predictions to item list
            detected_items = self._decode_predictions(predictions)
            
            logger.info(f"Detected {len(detected_items)} items in image {image_path}")
            return detected_items
            
        except Exception as e:
            logger.error(f"Error scanning image {image_path}: {str(e)}")
            return None
            
    def _decode_predictions(self, predictions):
        """Convert model output to item list with attributes"""
        item_labels = self.db.get_product_labels()
        threshold = 0.65
        
        detected_items = []
        for i, conf in enumerate(predictions[0]):
            if conf > threshold:
                item_id = item_labels[i]["id"]
                detected_items.append({
                    "item_id": item_id,
                    "name": item_labels[i]["name"],
                    "confidence": float(conf),
                    "attributes": self.db.get_item_attributes(item_id)
                })
        
        return detected_items