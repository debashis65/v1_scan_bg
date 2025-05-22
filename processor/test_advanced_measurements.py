#!/usr/bin/env python3
"""
Test script for the AdvancedMeasurementsModel.

This script demonstrates how the AdvancedMeasurementsModel works
and what kind of measurements it provides.
"""
import os
import sys
import json
import logging
import numpy as np
import cv2
from typing import List, Dict, Any
from pathlib import Path

# Add the processor directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import modules for testing
from foot_models.advanced_measurements_model import AdvancedMeasurementsModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestAdvancedMeasurements")

def create_test_image(size=(512, 512, 3)):
    """Create a test foot image for testing."""
    # Create a blank image with the specified size
    img = np.zeros(size, dtype=np.uint8)
    
    # Draw a simplified foot shape
    # This is just a simple oval with some details to simulate a foot
    center = (size[1] // 2, size[0] // 2)
    axes = (size[1] // 3, size[0] // 4 * 3)
    cv2.ellipse(img, center, axes, 0, 0, 360, (200, 200, 200), -1)
    
    # Add some landmarks
    # Heel
    heel_pos = (center[0], center[1] + axes[1] // 2)
    cv2.circle(img, heel_pos, 20, (150, 150, 150), -1)
    
    # Toes
    toe_pos = (center[0], center[1] - axes[1] // 2)
    cv2.ellipse(img, toe_pos, (60, 30), 0, 0, 180, (180, 180, 180), -1)
    
    # Arch
    arch_start = (center[0] - axes[0] // 2, center[1] + axes[1] // 4)
    arch_end = (center[0] - axes[0] // 2, center[1] - axes[1] // 4)
    arch_control = (center[0] - axes[0], center[1])
    pts = np.array([arch_start, arch_control, arch_end], np.int32)
    pts = pts.reshape((-1, 1, 2))
    cv2.polylines(img, [pts], False, (100, 100, 100), 3)
    
    return img

def generate_test_images() -> List[np.ndarray]:
    """Generate a set of test images for advanced measurements."""
    # Create a directory for test images if it doesn't exist
    output_dir = Path("test_images")
    output_dir.mkdir(exist_ok=True)
    
    # Generate test images from different views
    images = []
    
    # Generate lateral view
    lateral_img = create_test_image()
    lateral_path = output_dir / "lateral.jpg"
    cv2.imwrite(str(lateral_path), lateral_img)
    images.append(lateral_img)
    
    # Generate medial view
    medial_img = create_test_image()
    # Flip to simulate medial view
    medial_img = cv2.flip(medial_img, 1)
    medial_path = output_dir / "medial.jpg"
    cv2.imwrite(str(medial_path), medial_img)
    images.append(medial_img)
    
    # Generate plantar view (view from below)
    plantar_img = create_test_image((512, 256, 3))
    # Draw a footprint-like shape
    center = (plantar_img.shape[1] // 2, plantar_img.shape[0] // 2)
    axes = (plantar_img.shape[1] // 3, plantar_img.shape[0] // 2)
    cv2.ellipse(plantar_img, center, axes, 0, 0, 360, (200, 200, 200), -1)
    # Add toe imprints
    toe_center = (center[0], int(center[1] - axes[1] // 1.2))
    for i in range(5):
        offset = (i - 2) * 15
        toe_pos = (toe_center[0] + offset, toe_center[1])
        toe_size = 10 if i != 0 else 12  # Big toe is larger
        cv2.circle(plantar_img, (int(toe_pos[0]), int(toe_pos[1])), toe_size, (180, 180, 180), -1)
    plantar_path = output_dir / "plantar.jpg"
    cv2.imwrite(str(plantar_path), plantar_img)
    images.append(plantar_img)
    
    logger.info(f"Generated {len(images)} test images in {output_dir}")
    return images

def main():
    """Test the AdvancedMeasurementsModel."""
    # Generate test images
    images = generate_test_images()
    
    # Create basic measurements that would normally be extracted
    basic_measurements = {
        "length": 27.5,
        "width": 10.2,
        "arch_height": 2.1,
        "instep_height": 2.8
    }
    
    # Initialize the advanced measurements model
    model = AdvancedMeasurementsModel()
    
    # Run the analysis
    results = model.analyze(images, basic_measurements)
    
    # Print the results in a nicely formatted way
    print("\n===== ADVANCED FOOT MEASUREMENTS =====\n")
    
    for measure_name, measure_data in results.get("measurements", {}).items():
        print(f"--- {measure_name.replace('_', ' ').title()} ---")
        if isinstance(measure_data, dict):
            for key, value in measure_data.items():
                if key not in ["clinical_use", "treatment_implications"]:
                    if isinstance(value, (int, float)):
                        print(f"  {key.replace('_', ' ').title()}: {value}")
                    else:
                        print(f"  {key.replace('_', ' ').title()}: {value}")
            
            # Print clinical information if available
            if "clinical_use" in measure_data:
                print(f"\n  Clinical use: {measure_data['clinical_use']}")
            if "treatment_implications" in measure_data:
                print(f"  Treatment implications: {measure_data['treatment_implications']}")
        else:
            print(f"  Value: {measure_data}")
        print()
    
    # Save results to JSON file
    with open("advanced_measurements_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"Results saved to advanced_measurements_results.json")

if __name__ == "__main__":
    main()