import logging
import time
import traceback
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np

class ModelError(Exception):
    """Custom exception for model-specific errors."""
    pass

class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass

class BaseFootModel:
    """
    Base class for all foot analysis models.
    
    This class provides common functionality and interface requirements
    for all models that analyze foot images.
    """
    def __init__(self, name: str, description: str):
        """
        Initialize the foot model.
        
        Args:
            name: Name of the model
            description: Description of what the model does
        """
        self.name = name
        self.description = description
        self.logger = logging.getLogger(f"FootModels.{name}")
        self.last_execution_time = 0.0
        self.last_error = None
        
    def analyze(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze foot images and measurements with enhanced error handling.
        Must be implemented by subclasses.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with basic foot measurements
            
        Returns:
            Dictionary with analysis results
        """
        # Reset error state
        self.last_error = None
        
        # Record start time for performance monitoring
        start_time = time.time()
        
        try:
            # Validate inputs before processing
            self._validate_inputs(images, measurements)
            
            # Call the specific implementation in the subclass
            results = self._analyze_implementation(images, measurements)
            
            # Post-process results
            results = self._post_process_results(results)
            
            # Execution metrics
            self.last_execution_time = time.time() - start_time
            
            # Add execution metadata
            results["execution_metadata"] = {
                "execution_time": self.last_execution_time,
                "timestamp": time.time(),
                "model_name": self.name,
                "model_version": self.get_version()
            }
            
            return results
            
        except ValidationError as e:
            self.last_error = str(e)
            self.logger.error(f"Validation error: {str(e)}")
            return self._create_error_response(
                "validation_error", 
                str(e), 
                execution_time=time.time() - start_time
            )
            
        except ModelError as e:
            self.last_error = str(e)
            self.logger.error(f"Model error: {str(e)}")
            return self._create_error_response(
                "model_error", 
                str(e), 
                execution_time=time.time() - start_time
            )
            
        except Exception as e:
            self.last_error = str(e)
            self.logger.error(f"Unexpected error: {str(e)}")
            self.logger.error(traceback.format_exc())
            return self._create_error_response(
                "unexpected_error", 
                str(e), 
                execution_time=time.time() - start_time,
                traceback=traceback.format_exc()
            )
    
    def _analyze_implementation(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Implementation of the analysis logic. Must be implemented by subclasses.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with basic foot measurements
            
        Returns:
            Dictionary with analysis results
        """
        raise NotImplementedError("Subclasses must implement _analyze_implementation method")
    
    def _validate_inputs(self, images: List[np.ndarray], measurements: Dict[str, float]) -> None:
        """
        Validate inputs before processing.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with basic foot measurements
            
        Raises:
            ValidationError: If validation fails
        """
        # Check if images is None or empty
        if images is None or len(images) == 0:
            raise ValidationError("No images provided")
        
        # Check if measurements is None
        if measurements is None:
            raise ValidationError("No measurements provided")
        
        # Validate image formats
        for i, img in enumerate(images):
            if img is None:
                raise ValidationError(f"Image at index {i} is None")
            
            if not isinstance(img, np.ndarray):
                raise ValidationError(f"Image at index {i} is not a numpy array")
            
            if len(img.shape) < 2:
                raise ValidationError(f"Image at index {i} has invalid dimensions: {img.shape}")
    
    def _post_process_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post-process results to ensure they meet expected format.
        
        Args:
            results: Dictionary with analysis results
            
        Returns:
            Processed results
        """
        # If results is None, return an empty dictionary
        if results is None:
            self.logger.warning("Analysis returned None, converting to empty dict")
            return {}
        
        # Make a copy to avoid modifying the original
        processed = results.copy()
        
        # Ensure 'model_name' is set
        if 'model_name' not in processed:
            processed['model_name'] = self.name
            
        # Ensure 'model_version' is set
        if 'model_version' not in processed:
            processed['model_version'] = self.get_version()
            
        # Ensure 'confidence' is set if not already present
        if 'confidence' not in processed:
            processed['confidence'] = 0.8  # Default confidence
        
        return processed
    
    def _create_error_response(self, error_type: str, error_message: str, 
                              execution_time: float = 0.0, traceback: str = None) -> Dict[str, Any]:
        """
        Create a standardized error response.
        
        Args:
            error_type: Type of error
            error_message: Error message
            execution_time: Execution time until error
            traceback: Optional stack trace
            
        Returns:
            Error response dictionary
        """
        response = {
            "error": {
                "type": error_type,
                "message": error_message,
                "model_name": self.name,
                "execution_time": execution_time,
                "timestamp": time.time()
            },
            "model_name": self.name,
            "model_version": self.get_version(),
            "success": False
        }
        
        if traceback is not None:
            response["error"]["traceback"] = traceback
            
        return response
        
    def _get_condition_name(self, condition_code: str) -> str:
        """
        Get a human-readable name for a condition code.
        
        Args:
            condition_code: Internal condition code
            
        Returns:
            Human-readable condition name
        """
        # Default mapping of condition codes to readable names
        condition_names = {
            # General conditions
            "normal": "Normal",
            "normal_arch": "Normal Arch",
            "normal_pressure": "Normal Pressure Distribution",
            
            # Arch types
            "flat_feet": "Flat Feet (Pes Planus)",
            "high_arch": "High Arch (Pes Cavus)",
            
            # Pressure distributions
            "forefoot_pressure": "Increased Forefoot Pressure",
            "heel_pressure": "Increased Heel Pressure",
            "medial_pressure": "Increased Medial Pressure",
            "lateral_pressure": "Increased Lateral Pressure",
            
            # Foot alignments
            "overpronation": "Overpronation",
            "supination": "Supination (Underpronation)",
            "neutral_alignment": "Neutral Alignment"
        }
        
        # Return the mapped name or the original code if not found
        return condition_names.get(condition_code, condition_code.replace("_", " ").title())
    
    def get_version(self) -> str:
        """
        Get the model version.
        
        Returns:
            Version string
        """
        return "1.0.0"  # Base version, can be overridden
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the model.
        
        Returns:
            Dictionary with model information
        """
        return {
            "name": self.name,
            "description": self.description,
            "version": self.get_version()
        }