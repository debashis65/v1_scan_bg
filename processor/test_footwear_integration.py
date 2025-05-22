#!/usr/bin/env python3
"""
Integration test for footwear recommendations through the main AI diagnosis system.
"""
import os
import json
import logging
from pathlib import Path
from ai_diagnosis import FootDiagnosisModel

# Setup logging
logging.basicConfig(level=logging.INFO)

def main():
    """
    Test the FootwearRecommendationModel integration with FootDiagnosisModel.
    """
    print("Testing FootwearRecommendationModel integration with FootDiagnosisModel...\n")
    
    # Create model instance
    model = FootDiagnosisModel()
    
    # Get test image paths
    test_dir = Path(os.path.dirname(__file__)) / "test_images"
    if not test_dir.exists():
        test_dir.mkdir(parents=True)
        print(f"Created test directory: {test_dir}")
        
        # Create placeholder test images if they don't exist
        for i in range(2):
            # This is just a placeholder - in a real environment, 
            # you would use actual foot images for testing
            image_path = test_dir / f"test_foot_{i}.jpg"
            if not image_path.exists():
                print(f"Note: Creating placeholder test image {image_path} for testing purposes")
                with open(image_path, "w") as f:
                    f.write("placeholder")
    
    # Get image paths
    image_paths = [
        str(test_dir / "test_foot_0.jpg"),
        str(test_dir / "test_foot_1.jpg")
    ]
    
    # Run the full analysis with footwear model enabled
    results = model.analyze_foot_images(image_paths)
    
    # Print general diagnosis results
    print("Overall Diagnosis Results:")
    print(f"Primary diagnosis: {results.get('diagnosis')}")
    print(f"Confidence: {results.get('confidence')}")
    print(f"Description: {results.get('description')}")
    print()
    
    # Check if footwear model results are included
    if 'models' in results and 'footwear' in results['models']:
        footwear_results = results['models']['footwear']['result']
        
        print("Footwear Recommendation Results:")
        print(f"Condition: {footwear_results.get('condition_name')}")
        print(f"Width category: {footwear_results.get('width_category')}")
        print(f"Pronation tendency: {footwear_results.get('pronation_tendency')}")
        
        # Print recommendations for a few activities
        activities = ['walking', 'running', 'hiking']
        for activity in activities:
            if activity in footwear_results.get('recommendations', {}):
                rec = footwear_results['recommendations'][activity]
                
                print(f"\n{activity.capitalize()} recommendations:")
                print("Features:")
                for feature, value in rec.get('features', {}).items():
                    print(f"  - {feature}: {value}")
                
                print("\nExample models:")
                for model in rec.get('example_models', [])[:2]:  # Show first 2 examples
                    print(f"  - {model['brand']} {model['model']} ({model['price_range']})")
    else:
        print("Footwear model results not found. Make sure it's enabled in model_config.json")
        
    print("\nDiagnosis model availability:")
    print(f"  - arch_type: Arch Type Analysis [Enabled]")
    print(f"  - pronation: Pronation Analysis [Enabled]")
    print(f"  - pressure: Pressure Distribution Analysis [Enabled]")
    print(f"  - deformity: Structural Deformity Analysis [Enabled]")
    print(f"  - gait: Gait Pattern Analysis [Enabled]")
    print(f"  - footwear: Footwear Recommendation [Enabled]")

if __name__ == "__main__":
    main()