# Barogrip Foot Analysis Models

This directory contains specialized models for analyzing foot scans and providing diagnostic insights. The system uses a modular architecture that allows for easy expansion with new analysis capabilities.

## Architecture

The analysis system uses a modular approach:

1. **Base Model** (`base_model.py`): Defines the abstract interface that all specialized models must implement.
2. **Specialized Models**: Implement specific analysis capabilities (arch type, pronation, etc.).
3. **Configuration System**: Models can be enabled/disabled via the `model_config.json` file.

## Available Models

The system currently includes the following specialized diagnostic models:

| Model ID | Name | Description |
|----------|------|-------------|
| `arch_type` | Arch Type Analysis | Evaluates foot arch height and structure |
| `pronation` | Pronation Analysis | Analyzes pronation/supination patterns |
| `pressure` | Pressure Distribution | Maps pressure distribution across the foot |
| `deformity` | Structural Deformity | Detects common foot deformities |
| `gait` | Gait Pattern Analysis | Evaluates walking/running biomechanics |
| `footwear` | Footwear Recommendation | Suggests optimal footwear based on foot characteristics |

## Adding a New Model

To add a new specialized analysis model:

1. Create a new Python file in this directory (e.g., `my_new_model.py`).
2. Implement a class that inherits from `BaseFootModel`.
3. Implement the required `analyze()` method.
4. Add your model to `__init__.py`.
5. Register the model in `ai_diagnosis.py`'s `FootDiagnosisModel.__init__` method.
6. Add the model ID to `model_config.json` to enable it.

## Example: Implementing a New Model

```python
from .base_model import BaseFootModel
import logging
import numpy as np
from typing import List, Dict, Any

# Setup logging
logger = logging.getLogger('MyNewModel')

class MyNewModel(BaseFootModel):
    """My specialized foot analysis model"""
    
    def __init__(self):
        super().__init__(
            name="My Analysis Model", 
            description="Performs specialized analysis of foot characteristics."
        )
    
    def analyze(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze the foot images and measurements.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with foot measurements
            
        Returns:
            Dictionary with analysis results
        """
        logger.info("Running my specialized analysis")
        
        # Implement your analysis logic here
        
        return {
            "condition": "my_condition",
            "condition_name": "My Detected Condition",
            "confidence": 0.85,
            "severity": "moderate",
            "description": "Detailed description of the analysis results"
        }
```

Then in `__init__.py`:

```python
from .my_new_model import MyNewModel

__all__ = [
    # existing models
    'MyNewModel'
]
```

And in `ai_diagnosis.py`:

```python
from foot_models.my_new_model import MyNewModel

# In FootDiagnosisModel.__init__
self.models = {
    # existing models
    "my_model": MyNewModel(),
}
```

Finally, update `model_config.json`:

```json
{
  "enabled_models": [..., "my_model"],
  "confidence_thresholds": {
    // existing models
    "my_model": 0.7
  }
}
```

## Results Format

All models should return a dictionary with at least the following keys:

- `condition`: A code/identifier for the detected condition
- `condition_name`: Human-readable name of the condition
- `confidence`: Confidence score (0.0-1.0) 
- `severity`: Optional severity rating ("mild", "moderate", "severe", or "none")
- `description`: Detailed description of the finding

## Configuration

Models can be enabled/disabled in the `model_config.json` file at the project root. You can also set confidence thresholds for each model to adjust sensitivity.