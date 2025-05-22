#!/usr/bin/env python3
import random
import numpy as np
import logging
from typing import List, Dict, Any
from .base_model import BaseFootModel

# Setup logging
logger = logging.getLogger('GaitAnalysisModel')

class GaitAnalysisModel(BaseFootModel):
    """
    Model for analyzing gait patterns and detecting gait abnormalities.
    """
    def __init__(self):
        super().__init__(
            name="Gait Pattern Analysis", 
            description="Analyzes walking patterns to detect gait abnormalities and suggest improvements."
        )
        self.condition_descriptions = {
            "normal_gait": 
                "Your gait analysis shows a balanced and efficient walking pattern. Your foot strikes, rolls through, and "
                "pushes off in a biomechanically sound sequence, distributing forces appropriately and minimizing stress "
                "on joints and tissues.",
                
            "overpronation_gait": 
                "Your gait shows excessive inward rolling (overpronation) during the walking cycle. This can place "
                "additional stress on the inner foot, ankle, and knee, potentially leading to issues like shin splints, "
                "plantar fasciitis, and IT band syndrome. Motion control footwear and proper orthotics may help.",
                
            "supination_gait": 
                "Your gait shows insufficient inward rolling (supination or underpronation) during the walking cycle. "
                "This reduces your foot's natural shock absorption capacity and may increase stress on the outer foot "
                "and ankle. Cushioned, flexible footwear may help improve comfort and reduce injury risk.",
                
            "short_stride": 
                "Your gait shows a shorter-than-optimal stride length, which may reduce walking efficiency and "
                "potentially indicate tightness in hip flexors or other muscle groups. Stretching and gait training "
                "exercises may help improve stride length and walking economy.",
                
            "asymmetric_gait": 
                "Your gait exhibits asymmetry between your left and right sides, with different timing, pressure patterns, "
                "or movement mechanics. This imbalance may indicate muscle imbalances, previous injury, or other "
                "underlying issues that may benefit from targeted physical therapy."
        }
    
    def analyze(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze foot data to evaluate gait patterns.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with foot measurements
            
        Returns:
            Dictionary with gait analysis results
        """
        logger.info("Analyzing gait patterns")
        
        # In a real implementation, this would analyze temporal gait data from
        # pressure mats, motion capture, or inferred from 3D scans
        
        # Use foot arch and other measurements to infer gait patterns
        arch_height = measurements.get("archHeight", 0)
        gait_parameters = self._extract_gait_parameters(images, measurements)
        
        # Analyze gait parameters
        pronation_degree = gait_parameters.get('pronation_degree', 0)
        stride_length = gait_parameters.get('stride_length', 0.6)
        asymmetry_index = gait_parameters.get('asymmetry_index', 0.1)
        
        # Determine condition based on gait parameters
        if asymmetry_index > 0.2:
            condition = "asymmetric_gait"
            confidence = round(random.uniform(0.65, 0.9), 2)
            severity = "mild" if asymmetry_index < 0.3 else "moderate"
        elif pronation_degree > 0.6:
            condition = "overpronation_gait"
            confidence = round(random.uniform(0.7, 0.9), 2)
            severity = "mild" if pronation_degree < 0.75 else "moderate"
        elif pronation_degree < 0.3:
            condition = "supination_gait"
            confidence = round(random.uniform(0.65, 0.85), 2)
            severity = "mild" if pronation_degree > 0.2 else "moderate"
        elif stride_length < 0.5:
            condition = "short_stride"
            confidence = round(random.uniform(0.6, 0.85), 2)
            severity = "mild" if stride_length > 0.4 else "moderate"
        else:
            condition = "normal_gait"
            confidence = round(random.uniform(0.75, 0.95), 2)
            severity = "none"
        
        logger.info(f"Gait analysis complete: {self._get_condition_name(condition)} (Confidence: {confidence:.2f})")
            
        return {
            "condition": condition,
            "condition_name": self._get_condition_name(condition),
            "confidence": confidence,
            "severity": severity,
            "description": self.get_description(condition),
            "gait_parameters": gait_parameters
        }
    
    def _extract_gait_parameters(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, float]:
        """
        Extract gait parameters from images and measurements.
        
        In a real implementation, this would use temporal data from multiple steps
        or video gait analysis.
        
        Args:
            images: List of preprocessed images
            measurements: Dictionary with foot measurements
            
        Returns:
            Dictionary with extracted gait parameters
        """
        arch_height = measurements.get("archHeight", 0)
        foot_length = measurements.get("length", 26.5)
        
        # Generate plausible gait parameters that correlate with arch type
        pronation_degree = 0.5  # 0-1 scale: low values = supination, high values = overpronation
        
        if arch_height < 1.2:  # Low arch / flat foot
            pronation_degree = round(random.uniform(0.6, 0.8), 2)
        elif arch_height > 2.4:  # High arch
            pronation_degree = round(random.uniform(0.2, 0.4), 2)
        else:  # Normal arch
            pronation_degree = round(random.uniform(0.4, 0.6), 2)
        
        # Other gait parameters
        stride_length = round(foot_length / 45 + random.uniform(-0.1, 0.1), 2)  # In meters
        cadence = round(random.uniform(100, 120), 1)  # Steps per minute
        stance_percentage = round(random.uniform(58, 62), 1)  # % of gait cycle in stance phase
        asymmetry_index = round(random.uniform(0.05, 0.25), 2)  # 0-1 scale
        
        return {
            'pronation_degree': pronation_degree,
            'stride_length': stride_length,
            'cadence': cadence,
            'stance_percentage': stance_percentage,
            'asymmetry_index': asymmetry_index
        }
    
    def get_description(self, condition: str) -> str:
        """
        Get detailed description for the detected gait condition.
        
        Args:
            condition: The gait condition identifier
            
        Returns:
            Description of the condition
        """
        return self.condition_descriptions.get(condition, "No description available for this condition.")
    
    def _get_condition_name(self, condition: str) -> str:
        """
        Get user-friendly name for the condition code.
        
        Args:
            condition: The condition identifier
            
        Returns:
            Human-readable condition name
        """
        names = {
            "normal_gait": "Normal Gait Pattern",
            "overpronation_gait": "Overpronation Gait",
            "supination_gait": "Supination Gait",
            "short_stride": "Shortened Stride Length",
            "asymmetric_gait": "Asymmetric Gait Pattern"
        }
        return names.get(condition, "Unknown Condition")