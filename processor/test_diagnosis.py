#!/usr/bin/env python3
import sys
import json
import logging
from pathlib import Path
from ai_diagnosis import FootDiagnosisModel

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger('TestDiagnosis')

def main():
    """
    Test the enhanced FootDiagnosisModel with the modular architecture.
    """
    # Create test image paths
    test_images = []
    
    # Check if any image paths were provided as arguments
    if len(sys.argv) > 1:
        test_images = [arg for arg in sys.argv[1:] if Path(arg).is_file()]
        
    if not test_images:
        logger.info("No valid image paths provided. Using simulated images.")
        # Create dummy image files if none provided
        test_dir = Path("test_images")
        test_dir.mkdir(exist_ok=True)
        
        for i in range(3):
            test_image = test_dir / f"test_foot_{i}.jpg"
            if not test_image.exists():
                # Create a simple test image using OpenCV if possible
                try:
                    import cv2
                    import numpy as np
                    
                    # Create a simple foot outline image
                    img = np.ones((400, 200, 3), dtype=np.uint8) * 255
                    
                    # Draw foot outline (similar to thumbnail creation)
                    cv2.ellipse(img, (100, 350), (50, 40), 0, 0, 180, (120, 120, 120), 2)
                    cv2.line(img, (50, 350), (40, 250), (120, 120, 120), 2)
                    cv2.line(img, (40, 250), (45, 150), (120, 120, 120), 2)
                    cv2.line(img, (45, 150), (60, 80), (120, 120, 120), 2)
                    cv2.line(img, (60, 80), (80, 50), (120, 120, 120), 2)
                    cv2.line(img, (150, 350), (145, 250), (120, 120, 120), 2)
                    cv2.line(img, (145, 250), (135, 180), (120, 120, 120), 2)
                    cv2.line(img, (135, 180), (110, 120), (120, 120, 120), 2)
                    cv2.line(img, (80, 50), (110, 50), (120, 120, 120), 2)
                    cv2.line(img, (110, 50), (110, 120), (120, 120, 120), 2)
                    
                    # Add text
                    cv2.putText(img, f"Test Image {i}", (40, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
                    
                    # Save the image
                    cv2.imwrite(str(test_image), img)
                    logger.info(f"Created test image: {test_image}")
                except Exception as e:
                    logger.error(f"Could not create test image with OpenCV: {e}")
                    # Create an empty file as fallback
                    test_image.touch()
            
            test_images.append(str(test_image))
    
    # Initialize the diagnosis model
    logger.info("Initializing FootDiagnosisModel")
    model = FootDiagnosisModel()
    
    # Get available models
    available_models = model.get_available_models()
    logger.info(f"Available diagnosis models: {json.dumps(available_models, indent=2)}")
    
    # Run diagnosis
    logger.info(f"Running diagnosis on {len(test_images)} images: {test_images}")
    result = model.analyze_foot_images(test_images)
    
    # Print results
    logger.info("Diagnosis Complete")
    print("\n" + "="*80)
    print(f"Primary Diagnosis: {result.get('diagnosis')} (Confidence: {result.get('confidence', 0):.2f})")
    print(f"Description: {result.get('description', '')}")
    print("\nMeasurements:")
    for key, value in result.get('measurements', {}).items():
        print(f"  {key}: {value}")
    
    print("\nDetailed Model Results:")
    print("="*80)
    
    for model_id, model_data in result.get('models', {}).items():
        model_result = model_data.get('result', {})
        print(f"\n{model_data.get('name', model_id)}:")
        print(f"  Condition: {model_result.get('condition_name', 'Unknown')}")
        print(f"  Confidence: {model_result.get('confidence', 0):.2f}")
        
        if 'severity' in model_result:
            print(f"  Severity: {model_result.get('severity', 'none')}")
            
        if 'description' in model_result:
            print(f"  Description: {model_result.get('description', '')[:100]}...")
        
        # Print additional details specific to each model type
        if model_id == 'pressure' and 'pressure_map' in model_result:
            print("\n  Pressure Distribution:")
            for area, value in model_result.get('pressure_map', {}).items():
                print(f"    {area}: {value:.2f}")
        
        if model_id == 'gait' and 'gait_parameters' in model_result:
            print("\n  Gait Parameters:")
            for param, value in model_result.get('gait_parameters', {}).items():
                print(f"    {param}: {value}")
    
    print("\n" + "="*80)
    return 0

if __name__ == "__main__":
    sys.exit(main())