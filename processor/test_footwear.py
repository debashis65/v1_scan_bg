#!/usr/bin/env python3
"""
Test script for the FootwearRecommendationModel.
"""
import os
import json
import logging
from pathlib import Path
from foot_models.footwear_model import FootwearRecommendationModel
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO)

def main():
    """
    Test the FootwearRecommendationModel.
    """
    print("Testing FootwearRecommendationModel...")
    
    # Create model instance
    model = FootwearRecommendationModel()
    print(f"Model name: {model.name}")
    print(f"Model description: {model.description}")
    
    # Create mock images and measurements for testing
    mock_images = [np.zeros((224, 224), dtype=np.uint8)]
    
    # Test with different foot types
    test_cases = [
        {"name": "Flat feet", "measurements": {"archHeight": 1.0, "width": 10.0}},
        {"name": "Normal arch", "measurements": {"archHeight": 1.8, "width": 9.5}},
        {"name": "High arch", "measurements": {"archHeight": 2.6, "width": 8.5}},
        {"name": "Wide foot", "measurements": {"archHeight": 1.8, "width": 11.0}},
        {"name": "Narrow foot", "measurements": {"archHeight": 1.8, "width": 8.0}}
    ]
    
    for test_case in test_cases:
        print(f"\n--- Testing {test_case['name']} ---")
        result = model.analyze(mock_images, test_case["measurements"])
        
        print(f"Condition: {result['condition_name']}")
        print(f"Confidence: {result['confidence']}")
        print(f"Width category: {result['width_category']}")
        print(f"Pronation tendency: {result['pronation_tendency']}")
        
        # Show recommendation for one activity
        activity = "running"
        print(f"\nRecommendations for {activity}:")
        activity_rec = result["recommendations"][activity]
        
        print("Features:")
        for feature, value in activity_rec["features"].items():
            print(f"  - {feature}: {value}")
        
        print("\nExample shoe models:")
        for shoe in activity_rec["example_models"]:
            print(f"  - {shoe['brand']} {shoe['model']} ({shoe['price_range']})")

if __name__ == "__main__":
    main()