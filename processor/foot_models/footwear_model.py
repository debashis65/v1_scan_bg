#!/usr/bin/env python3
import random
import numpy as np
import logging
from typing import List, Dict, Any
from .base_model import BaseFootModel

# Setup logging
logger = logging.getLogger('FootwearRecommendationModel')

class FootwearRecommendationModel(BaseFootModel):
    """
    Model for generating footwear recommendations based on foot analysis.
    
    This model analyzes foot structure, pronation, and other factors to recommend
    appropriate footwear types for different activities.
    """
    def __init__(self):
        super().__init__(
            name="Footwear Recommendation", 
            description="Suggests optimal footwear types based on foot structure and biomechanics."
        )
        
        # Define activity types for recommendations
        self.activities = [
            "walking", 
            "running", 
            "hiking", 
            "casual", 
            "formal", 
            "athletic"
        ]
        
        # Define footwear features
        self.features = {
            "arch_support": ["minimal", "moderate", "maximum"],
            "cushioning": ["minimal", "moderate", "maximum"],
            "stability": ["neutral", "moderate", "maximum"],
            "width": ["narrow", "standard", "wide", "extra_wide"],
            "heel_drop": ["zero", "low", "medium", "high"]
        }
        
        # Define recommendation descriptions
        self.recommendation_descriptions = {
            "high_arch_recommendations": 
                "Your high arches require shoes with good cushioning and flexibility. "
                "Look for neutral shoes with extra cushioning in the midsole and heel "
                "for better shock absorption. Avoid rigid or motion control shoes that "
                "could restrict natural movement.",
                
            "flat_feet_recommendations": 
                "Your flat feet would benefit from shoes with good arch support and stability features. "
                "Look for motion control or stability shoes that help prevent overpronation. "
                "Avoid minimalist shoes with little support which may contribute to foot fatigue and pain.",
                
            "overpronation_recommendations": 
                "Your overpronation pattern suggests you would benefit from stability or motion control shoes. "
                "Look for footwear with firm medial support and structured cushioning to help control "
                "excessive inward rolling of the foot during walking or running.",
                
            "underpronation_recommendations": 
                "Your supination (underpronation) pattern suggests you need shoes with enhanced cushioning and flexibility. "
                "Look for neutral shoes with cushioned midsoles to help absorb impact better. "
                "Avoid rigid motion control shoes that could worsen your supination.",
                
            "bunion_recommendations": 
                "Your foot structure indicates bunions or potential for bunion development. "
                "Look for shoes with a wide toe box, flexible materials, and low heels. "
                "Avoid pointed toe shoes or constrictive footwear that puts pressure on the toes.",
                
            "neutral_recommendations": 
                "Your foot shows a neutral structure without significant biomechanical issues. "
                "You have flexibility in footwear choices, but should still choose appropriate shoes "
                "for each activity with proper fit and support for long-term foot health."
        }
    
    def analyze(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate footwear recommendations based on foot characteristics.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with foot measurements
            
        Returns:
            Dictionary with footwear recommendations
        """
        logger.info("Analyzing foot for footwear recommendations")
        
        # In a real implementation, this would analyze the foot characteristics
        # and make personalized recommendations
        
        # For this placeholder, we'll use the arch height to determine the foot type
        # and make simple recommendations based on that
        arch_height = measurements.get("archHeight", 0)
        width = measurements.get("width", 9.0)
        
        # Determine primary foot type
        if arch_height < 1.2:
            primary_type = "flat_feet"
            primary_description = self.recommendation_descriptions["flat_feet_recommendations"]
            pronation_tendency = "overpronation"
        elif arch_height > 2.4:
            primary_type = "high_arch"
            primary_description = self.recommendation_descriptions["high_arch_recommendations"]
            pronation_tendency = "underpronation"
        else:
            primary_type = "neutral"
            primary_description = self.recommendation_descriptions["neutral_recommendations"]
            pronation_tendency = "neutral"
        
        # Determine width category
        if width < 8.5:
            width_category = "narrow"
        elif width > 10.5:
            width_category = "wide"
        else:
            width_category = "standard"
            
        # Generate recommendations for each activity
        activity_recommendations = {}
        for activity in self.activities:
            activity_recommendations[activity] = self._generate_activity_recommendation(
                activity, primary_type, pronation_tendency, width_category
            )
        
        # Create result object
        result = {
            "condition": primary_type,
            "condition_name": self._get_condition_name(primary_type),
            "confidence": 0.85,  # Placeholder
            "description": primary_description,
            "pronation_tendency": pronation_tendency,
            "width_category": width_category,
            "recommendations": activity_recommendations
        }
        
        logger.info(f"Footwear recommendation complete for {self._get_condition_name(primary_type)} foot type")
        return result
    
    def _generate_activity_recommendation(self, activity: str, foot_type: str, 
                                         pronation: str, width: str) -> Dict[str, Any]:
        """
        Generate specific recommendations for a given activity.
        
        Args:
            activity: The activity type
            foot_type: The primary foot type
            pronation: The pronation tendency
            width: The width category
            
        Returns:
            Dictionary with specific recommendations
        """
        # In a real implementation, this would use a more sophisticated algorithm
        # to generate personalized recommendations
        
        result = {
            "features": {}
        }
        
        # Set arch support based on foot type
        if foot_type == "flat_feet":
            result["features"]["arch_support"] = "maximum"
        elif foot_type == "high_arch":
            result["features"]["arch_support"] = "moderate"
        else:
            result["features"]["arch_support"] = "moderate"
            
        # Set cushioning based on arch type and activity
        if foot_type == "high_arch" or activity == "running":
            result["features"]["cushioning"] = "maximum"
        elif activity == "hiking" or activity == "walking":
            result["features"]["cushioning"] = "moderate"
        else:
            result["features"]["cushioning"] = "minimal"
            
        # Set stability based on pronation
        if pronation == "overpronation":
            result["features"]["stability"] = "maximum"
        elif pronation == "underpronation":
            result["features"]["stability"] = "neutral"
        else:
            result["features"]["stability"] = "moderate"
            
        # Set width recommendation
        result["features"]["width"] = width
        
        # Set heel drop based on activity and foot type
        if activity == "running" and foot_type != "high_arch":
            result["features"]["heel_drop"] = "low"
        elif activity == "formal":
            result["features"]["heel_drop"] = "medium"
        elif foot_type == "high_arch":
            result["features"]["heel_drop"] = "medium"
        else:
            result["features"]["heel_drop"] = "low"
            
        # Add example models (would be a database lookup in a real implementation)
        result["example_models"] = self._get_example_models(activity, result["features"])
        
        return result
    
    def _get_example_models(self, activity: str, features: Dict[str, str]) -> List[Dict[str, str]]:
        """
        Get example shoe models matching the recommendation criteria.
        
        Args:
            activity: The activity type
            features: The recommended features
            
        Returns:
            List of example shoe models
        """
        # In a real implementation, this would query a database of shoe models
        # and return matches based on the features
        
        # For this placeholder, we'll generate some realistic-sounding models
        brands = ["Nike", "Asics", "Brooks", "New Balance", "Hoka", "Adidas", "Saucony"]
        
        if activity == "running":
            models = {
                "Nike": ["Pegasus", "Structure", "Vomero", "React Infinity"],
                "Asics": ["Gel-Nimbus", "Gel-Kayano", "GT-2000", "NovaBlast"],
                "Brooks": ["Ghost", "Adrenaline GTS", "Glycerin", "Launch"],
                "New Balance": ["880", "1080", "860", "Fresh Foam More"],
                "Hoka": ["Clifton", "Bondi", "Arahi", "Speedgoat"],
                "Adidas": ["Ultraboost", "Solarboost", "Supernova", "Adizero"],
                "Saucony": ["Ride", "Guide", "Triumph", "Kinvara"]
            }
        elif activity == "hiking":
            models = {
                "Nike": ["Wildhorse", "Terra Kiger", "ACG Mountain Fly", "Pegasus Trail"],
                "Asics": ["Gel-Trabuco", "Gel-Sonoma", "Gel-Venture", "Fujitrabuco"],
                "Brooks": ["Cascadia", "Divide", "Caldera", "Catamount"],
                "New Balance": ["Fresh Foam Hierro", "Summit Unknown", "Trail 510", "Minimus Trail"],
                "Hoka": ["Speedgoat", "Challenger ATR", "Torrent", "Stinson"],
                "Adidas": ["Terrex Swift", "Terrex Agravic", "Response Trail", "Terrex Skychaser"],
                "Saucony": ["Peregrine", "Excursion TR", "Mad River TR", "Switchback"]
            }
        else:
            models = {
                "Nike": ["Air Max", "Free RN", "Daybreak", "Court Vision"],
                "Asics": ["GEL-Contend", "GEL-Cumulus", "Tiger", "Metrolyte"],
                "Brooks": ["Addiction Walker", "Dyad", "Beast", "Revel"],
                "New Balance": ["574", "990", "Fresh Foam Roav", "Arishi"],
                "Hoka": ["Rincon", "Cavu", "Clifton Edge", "Akasa"],
                "Adidas": ["Stan Smith", "Superstar", "Cloudfoam", "Continental"],
                "Saucony": ["Jazz", "Shadow", "Cohesion", "Grid Excursion"]
            }
            
        # Select 2-3 brands randomly
        selected_brands = random.sample(brands, k=min(3, len(brands)))
        examples = []
        
        for brand in selected_brands:
            brand_models = models.get(brand, ["Generic"])
            model = random.choice(brand_models)
            
            # Generate variant based on features
            if "stability" in features and features["stability"] == "maximum":
                model += " Stability"
            elif "arch_support" in features and features["arch_support"] == "maximum":
                model += " Support"
            elif "cushioning" in features and features["cushioning"] == "maximum":
                model += " Cushion"
                
            if "width" in features and features["width"] in ["wide", "extra_wide"]:
                width_code = "4E" if features["width"] == "extra_wide" else "2E"
                model += f" ({width_code})"
                
            examples.append({
                "brand": brand,
                "model": model,
                "price_range": "$" + str(random.randint(8, 20)) + "0-$" + str(random.randint(12, 24)) + "0"
            })
            
        return examples
    
    def get_description(self, condition: str) -> str:
        """
        Get detailed description for the detected condition.
        
        Args:
            condition: The condition identifier
            
        Returns:
            Description of the condition
        """
        if condition == "flat_feet":
            return self.recommendation_descriptions["flat_feet_recommendations"]
        elif condition == "high_arch":
            return self.recommendation_descriptions["high_arch_recommendations"]
        elif condition == "overpronation":
            return self.recommendation_descriptions["overpronation_recommendations"]
        elif condition == "underpronation":
            return self.recommendation_descriptions["underpronation_recommendations"]
        elif condition == "bunion":
            return self.recommendation_descriptions["bunion_recommendations"]
        else:
            return self.recommendation_descriptions["neutral_recommendations"]
    
    def _get_condition_name(self, condition: str) -> str:
        """
        Get user-friendly name for the condition code.
        
        Args:
            condition: The condition identifier
            
        Returns:
            Human-readable condition name
        """
        names = {
            "flat_feet": "Flat Feet",
            "high_arch": "High Arch",
            "neutral": "Neutral Foot Type",
            "overpronation": "Overpronation",
            "underpronation": "Underpronation"
        }
        return names.get(condition, "Unknown Foot Type")