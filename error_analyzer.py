# src/error_detection/error_analyzer.py

from transformers import pipeline
import json
from ..utils.logger import setup_logger
from ..database.db_client import OrderDatabase
from ..utils.notification import NotificationSystem

logger = setup_logger('error_analyzer')

class ErrorAnalyzer:
    def __init__(self):
        """Initialize the error analyzer with GenAI capabilities"""
        try:
            self.text_generator = pipeline('text-generation', model='gpt-j-6B')
            self.db = OrderDatabase()
            self.notifier = NotificationSystem()
            logger.info("Error analyzer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ErrorAnalyzer: {str(e)}")
            raise

    def compare_with_order(self, order_id, detected_items):
        """Compare detected items with expected order items"""
        # Get order details
        order_details = self.db.get_order(order_id)
        if not order_details:
            logger.error(f"Order {order_id} not found in database")
            return {"error": "Order not found"}
            
        expected_items = order_details["items"]
        
        # Find discrepancies
        mismatches = self._find_mismatches(detected_items, expected_items)
        
        if mismatches:
            logger.info(f"Found {len(mismatches)} mismatches in order {order_id}")
            result = self._handle_error(order_id, mismatches, order_details)
        else:
            logger.info(f"Order {order_id} verified successfully")
            result = {
                "status": "success",
                "message": "Package contents match order",
                "order_id": order_id,
                "savings": 10.00  # $10 saved per incident
            }
            
        # Record verification in database
        self.db.record_verification(order_id, result)
        return result
        
    def _find_mismatches(self, detected_items, expected_items):
        """Compare detected items with expected order items"""
        mismatches = []
        
        # Check for missing items
        detected_ids = {item["item_id"] for item in detected_items}
        expected_ids = {item["item_id"] for item in expected_items}
        
        missing_ids = expected_ids - detected_ids
        extra_ids = detected_ids - expected_ids
        
        # Check for attribute mismatches (e.g., wrong color)
        common_ids = expected_ids.intersection(detected_ids)
        for item_id in common_ids:
            detected = next(item for item in detected_items if item["item_id"] == item_id)
            expected = next(item for item in expected_items if item["item_id"] == item_id)
            
            for attr in ["color", "size", "model"]:
                if attr in detected["attributes"] and attr in expected["attributes"]:
                    if detected["attributes"][attr] != expected["attributes"][attr]:
                        mismatches.append({
                            "type": "attribute_mismatch",
                            "item_id": item_id,
                            "item_name": expected["name"],
                            "attribute": attr,
                            "expected": expected["attributes"][attr],
                            "detected": detected["attributes"][attr]
                        })
        
        # Add missing items to mismatches
        for item_id in missing_ids:
            item = next(item for item in expected_items if item["item_id"] == item_id)
            mismatches.append({
                "type": "missing_item",
                "item_id": item_id,
                "item_name": item["name"]
            })
        
        # Add extra items to mismatches
        for item_id in extra_ids:
            item = next(item for item in detected_items if item["item_id"] == item_id)
            mismatches.append({
                "type": "extra_item",
                "item_id": item_id,
                "item_name": item["name"]
            })
            
        return mismatches
        
    def _handle_error(self, order_id, mismatches, order_details):
        """Generate response for detected errors using GenAI"""
        # Create prompt for GenAI
        prompt = f"Generate a clear, concise description of the following order error: Order #{order_id} has the following issues: {json.dumps(mismatches)}. The customer's name is {order_details['customer_name']}."
        
        # Generate error description
        error_description = self.text_generator(prompt, max_length=100)[0]['generated_text']
        
        # Send notification to packing staff
        self.notifier.notify_staff(order_id, error_description, mismatches)
        
        # Record error in database
        self.db.record_error(order_id, mismatches)
        
        return {
            "status": "error",
            "message": "Package contents do not match order",
            "order_id": order_id,
            "mismatches": mismatches,
            "description": error_description,
            "action_required": True
        }