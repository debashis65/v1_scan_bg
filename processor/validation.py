"""
Validation module for Barogrip processor pipeline.

This module provides validation functions for input data, particularly images,
to ensure they meet quality and format requirements before processing.
"""

import os
import cv2
import numpy as np
import logging
from typing import List, Dict, Tuple, Any, Optional, Union

logger = logging.getLogger("Validation")

# Define constants for image validation
MIN_IMAGE_WIDTH = 300
MIN_IMAGE_HEIGHT = 300
MIN_IMAGE_QUALITY = 0.5  # Minimum quality score (0-1)
SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp']

class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass

def validate_image(image: np.ndarray, image_name: str = "Unknown") -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validate a single image for quality and format requirements.
    
    Args:
        image: The image as a numpy array
        image_name: Name or identifier for the image (for logging)
        
    Returns:
        Tuple containing:
            - Boolean indicating if validation passed
            - Message describing the validation result
            - Dictionary with detailed validation metrics
    """
    if image is None:
        return False, f"Image '{image_name}' is None", {"error": "Image is None"}
    
    # Check image dimensions
    height, width = image.shape[:2]
    if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
        return False, f"Image '{image_name}' dimensions too small: {width}x{height}", {
            "error": "Dimensions too small",
            "width": width,
            "height": height,
            "min_width": MIN_IMAGE_WIDTH,
            "min_height": MIN_IMAGE_HEIGHT
        }
    
    # Check if image is grayscale or color
    is_color = len(image.shape) == 3 and image.shape[2] == 3
    
    # Check for extremely dark or bright images
    if is_color:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
        
    mean_brightness = np.mean(gray)
    if mean_brightness < 20:
        return False, f"Image '{image_name}' is too dark (mean brightness: {mean_brightness:.1f})", {
            "error": "Image too dark",
            "mean_brightness": float(mean_brightness),
            "threshold": 20
        }
    elif mean_brightness > 235:
        return False, f"Image '{image_name}' is too bright (mean brightness: {mean_brightness:.1f})", {
            "error": "Image too bright",
            "mean_brightness": float(mean_brightness),
            "threshold": 235
        }
    
    # Check image contrast
    std_dev = np.std(gray)
    if std_dev < 15:
        return False, f"Image '{image_name}' has low contrast (std dev: {std_dev:.1f})", {
            "error": "Low contrast",
            "std_dev": float(std_dev),
            "threshold": 15
        }
    
    # Check for blurry images using Laplacian
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 100:
        return False, f"Image '{image_name}' appears blurry (Laplacian variance: {laplacian_var:.1f})", {
            "error": "Image blurry",
            "laplacian_variance": float(laplacian_var),
            "threshold": 100
        }
    
    # Calculate overall quality score (simplified)
    quality_score = min(1.0, (std_dev / 80) * (laplacian_var / 500))
    
    if quality_score < MIN_IMAGE_QUALITY:
        return False, f"Image '{image_name}' quality score too low: {quality_score:.2f}", {
            "error": "Low quality score",
            "quality_score": float(quality_score),
            "threshold": MIN_IMAGE_QUALITY
        }
    
    # All checks passed
    return True, f"Image '{image_name}' passed validation (quality: {quality_score:.2f})", {
        "quality_score": float(quality_score),
        "mean_brightness": float(mean_brightness),
        "contrast": float(std_dev),
        "sharpness": float(laplacian_var),
        "dimensions": f"{width}x{height}",
        "is_color": is_color
    }

def validate_images(images: List[np.ndarray], image_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Validate a list of images for processing requirements.
    
    Args:
        images: List of images as numpy arrays
        image_names: Optional list of image names/identifiers for better logging
        
    Returns:
        Dictionary with validation results for each image and overall status
    """
    if not images:
        return {
            "status": "error",
            "message": "No images provided",
            "valid_count": 0,
            "total_count": 0,
            "images": []
        }
    
    # Create default image names if not provided
    if image_names is None:
        image_names = [f"Image_{i+1}" for i in range(len(images))]
    elif len(image_names) != len(images):
        # Extend with default names if list lengths don't match
        image_names.extend([f"Image_{i+1+len(image_names)}" for i in range(len(images) - len(image_names))])
    
    # Validate each image
    image_results = []
    valid_count = 0
    
    for i, (image, name) in enumerate(zip(images, image_names)):
        valid, message, details = validate_image(image, name)
        
        if valid:
            valid_count += 1
            logger.info(message)
        else:
            logger.warning(message)
        
        image_results.append({
            "index": i,
            "name": name,
            "valid": valid,
            "message": message,
            "details": details
        })
    
    # Calculate overall status and message
    if valid_count == 0:
        status = "error"
        message = "No valid images found"
    elif valid_count < len(images):
        status = "warning"
        message = f"{valid_count} of {len(images)} images passed validation"
    else:
        status = "success"
        message = f"All {len(images)} images passed validation"
    
    return {
        "status": status,
        "message": message,
        "valid_count": valid_count,
        "total_count": len(images),
        "images": image_results
    }

def validate_foot_view_coverage(image_names: List[str]) -> Dict[str, Any]:
    """
    Validate that the set of images covers the necessary foot views.
    
    Args:
        image_names: List of image filenames
        
    Returns:
        Dictionary with validation results
    """
    # Expected views for complete foot analysis
    expected_views = {
        "dorsal": False,   # Top view
        "plantar": False,  # Bottom view
        "medial": False,   # Inside view
        "lateral": False,  # Outside view
        "posterior": False # Back view
    }
    
    # Check for view indicators in filenames
    for name in image_names:
        name_lower = name.lower()
        
        if "dorsal" in name_lower or "top" in name_lower:
            expected_views["dorsal"] = True
        
        if "plantar" in name_lower or "bottom" in name_lower:
            expected_views["plantar"] = True
        
        if "medial" in name_lower or "inside" in name_lower:
            expected_views["medial"] = True
        
        if "lateral" in name_lower or "outside" in name_lower:
            expected_views["lateral"] = True
        
        if "posterior" in name_lower or "back" in name_lower or "rear" in name_lower:
            expected_views["posterior"] = True
    
    # Count covered views
    covered_views = sum(expected_views.values())
    total_views = len(expected_views)
    
    # Determine missing views
    missing_views = [view for view, covered in expected_views.items() if not covered]
    
    # Calculate coverage percentage
    coverage_pct = (covered_views / total_views) * 100
    
    # Determine status
    if covered_views == total_views:
        status = "success"
        message = "All required foot views are present"
    elif covered_views >= 3:
        status = "warning"
        message = f"Some foot views are missing ({covered_views}/{total_views})"
    else:
        status = "error"
        message = f"Insufficient foot views ({covered_views}/{total_views})"
    
    return {
        "status": status,
        "message": message,
        "coverage_percent": coverage_pct,
        "covered_views": covered_views,
        "total_views": total_views,
        "missing_views": missing_views,
        "view_status": expected_views
    }

def validate_measurements(measurements: Dict[str, float]) -> Dict[str, Any]:
    """
    Validate foot measurements for completeness and plausibility.
    
    Args:
        measurements: Dictionary with foot measurements
        
    Returns:
        Dictionary with validation results
    """
    # Required measurements
    required_measurements = {
        "footLength": (200, 350),  # mm, typical adult range
        "footWidth": (70, 130),    # mm, typical adult range
        "archHeight": (0, 40)      # mm, typical range
    }
    
    # Optional but useful measurements
    optional_measurements = {
        "archHeightIndex": (0.1, 0.4),      # Dimensionless
        "archRigidityIndex": (0.5, 1.0),    # Dimensionless
        "medialArchAngle": (120, 180),      # Degrees
        "navicularDrop": (0, 20),           # mm
        "heelWidth": (40, 90),              # mm
        "midfootWidth": (40, 90),           # mm
        "forefootWidth": (70, 130)          # mm
    }
    
    # Check for missing required measurements
    missing = [key for key in required_measurements if key not in measurements]
    
    # Check for out-of-range values
    out_of_range = []
    for key, (min_value, max_value) in required_measurements.items():
        if key in measurements and (measurements[key] < min_value or measurements[key] > max_value):
            out_of_range.append({
                "key": key, 
                "value": measurements[key],
                "expected_range": [min_value, max_value]
            })
    
    # Check optional measurements if present
    for key, (min_value, max_value) in optional_measurements.items():
        if key in measurements and (measurements[key] < min_value or measurements[key] > max_value):
            out_of_range.append({
                "key": key, 
                "value": measurements[key],
                "expected_range": [min_value, max_value]
            })
    
    # Determine status
    if missing:
        status = "error"
        message = f"Missing required measurements: {', '.join(missing)}"
    elif out_of_range:
        status = "warning"
        message = f"{len(out_of_range)} measurements out of expected ranges"
    else:
        status = "success"
        message = "All measurements valid"
    
    return {
        "status": status,
        "message": message,
        "missing": missing,
        "out_of_range": out_of_range,
        "available_measurements": list(measurements.keys())
    }

def verify_processor_prerequisites() -> Dict[str, Any]:
    """
    Verify that all required libraries and dependencies are available.
    
    Returns:
        Dictionary with verification results
    """
    required_packages = ["numpy", "cv2", "logging"]
    optional_packages = ["scikit-image", "scipy"]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    missing_optional = []
    for package in optional_packages:
        try:
            __import__(package)
        except ImportError:
            missing_optional.append(package)
    
    # Check OpenCV version
    cv2_version = cv2.__version__
    
    if missing:
        status = "error"
        message = f"Missing required packages: {', '.join(missing)}"
    else:
        status = "success"
        message = "All required packages available"
        if missing_optional:
            message += f" (optional missing: {', '.join(missing_optional)})"
    
    return {
        "status": status,
        "message": message,
        "missing_required": missing,
        "missing_optional": missing_optional,
        "opencv_version": cv2_version,
        "numpy_version": np.__version__
    }