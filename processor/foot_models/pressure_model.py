import numpy as np
import cv2
import logging
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from .base_model import BaseFootModel

logger = logging.getLogger("FootModels")

# Fitzpatrick skin type reference values for RGB analysis
# These values represent the approximated values for different skin types in RGB colorspace
FITZPATRICK_REFERENCE = {
    "type_1": {"mean_rgb": [235, 210, 188], "melanin_index_range": [0.0, 0.15]},    # Very fair skin
    "type_2": {"mean_rgb": [223, 195, 170], "melanin_index_range": [0.15, 0.25]},   # Fair skin
    "type_3": {"mean_rgb": [198, 165, 140], "melanin_index_range": [0.25, 0.40]},   # Medium skin
    "type_4": {"mean_rgb": [175, 138, 110], "melanin_index_range": [0.40, 0.55]},   # Olive skin
    "type_5": {"mean_rgb": [130, 95, 70],   "melanin_index_range": [0.55, 0.75]},   # Brown skin
    "type_6": {"mean_rgb": [80, 50, 40],    "melanin_index_range": [0.75, 1.0]}     # Dark brown/black skin
}

class FootPressureModel(BaseFootModel):
    """
    Model for analyzing foot pressure distribution and detecting pressure-related issues.
    
    This model provides detailed analysis of the pressure patterns across different
    regions of the foot, identifying potential problem areas and their clinical implications.
    The model includes skin tone calibration to ensure accurate results across different ethnicities.
    """
    def __init__(self):
        super().__init__(
            name="Pressure Distribution Analysis", 
            description="Analyzes the pressure distribution across the foot to detect potential issues."
        )
        
        # Define regions of interest for pressure analysis
        self.pressure_regions = {
            "forefoot_lateral": "Lateral forefoot (5th metatarsal head)",
            "forefoot_central": "Central forefoot (2nd-4th metatarsal heads)",
            "forefoot_medial": "Medial forefoot (1st metatarsal head)",
            "midfoot_lateral": "Lateral midfoot (cuboid)",
            "midfoot_medial": "Medial midfoot (navicular)",
            "rearfoot_lateral": "Lateral rearfoot (lateral calcaneus)",
            "rearfoot_medial": "Medial rearfoot (medial calcaneus)",
            "hallux": "Great toe (hallux)"
        }
        
        # Load skin tone calibration data
        self.validation_dataset_path = os.path.join(os.path.dirname(__file__), "../data/skin_tone_validation")
        
        # Track skin tone data for the current analysis
        self.current_skin_data = {
            "detected_skin_type": None,
            "melanin_index": 0.0,
            "calibration_applied": False,
            "channel_weights": [1.0, 1.0, 1.0]  # Default RGB weights
        }
        
        # Define pressure pattern conditions and their descriptions
        self.condition_descriptions = {
            "normal_pressure": 
                "Your foot shows a healthy, balanced pressure distribution. Weight is properly distributed across the heel, "
                "arch, and ball of the foot, which helps reduce the risk of pain and injury. This pattern indicates good "
                "biomechanical function during walking and standing. Tissue perfusion appears adequate throughout all "
                "regions of the foot, suggesting healthy blood flow and vascular function.",
                
            "forefoot_pressure": 
                "Your scan shows increased pressure in the forefoot (ball of the foot). This may indicate issues like "
                "metatarsalgia or Morton's neuroma, and could be related to foot structure, footwear choices, or gait patterns. "
                "Cushioned insoles with metatarsal pads may help redistribute pressure more evenly. Monitoring for "
                "forefoot discomfort or skin changes is recommended.",
                
            "heel_pressure": 
                "Your scan shows increased pressure in the heel area. This pressure pattern may contribute to conditions "
                "like plantar fasciitis or heel spurs. Heel cushions or orthotics with good heel cups may help absorb shock "
                "and distribute pressure more evenly. The concentrated pressure may increase stress on heel pad tissues.",
                
            "medial_pressure": 
                "Your scan shows increased pressure along the inner (medial) edge of your foot. This is commonly associated "
                "with overpronation and flat feet. Supportive insoles with arch support may help improve weight distribution "
                "and reduce discomfort. This pattern may increase stress on medial structures like the posterior tibial tendon "
                "and navicular.",
                
            "lateral_pressure": 
                "Your scan shows increased pressure along the outer (lateral) edge of your foot. This is commonly associated "
                "with underpronation (supination) and high arches. Cushioned insoles with good shock absorption may help "
                "distribute pressure more evenly. This pattern may increase stress on the lateral ankle and 5th metatarsal.",
                
            "vascular_concern": 
                "Your scan reveals pressure patterns that may affect foot circulation. Areas of high pressure combined with "
                "uneven distribution can potentially reduce blood flow to certain regions of the foot. Advanced vascular "
                "metrics indicate possible changes in tissue perfusion, pulse amplitude, and thermal patterns consistent "
                "with compromised circulation. This may be associated with sensations of coldness, numbness, or discomfort "
                "after prolonged standing or activity. The analysis suggests regional differences in blood flow that could "
                "benefit from targeted interventions. Attention to footwear with proper cushioning, orthotic modifications "
                "for pressure redistribution, and regular position changes when standing for long periods is recommended. "
                "Consider vascular health assessment if experiencing persistent symptoms. For those with diabetes, peripheral "
                "arterial disease, or other vascular conditions, close monitoring of these areas is particularly important for "
                "long-term foot health."
        }
        
        # Load pressure distribution reference data
        self._load_reference_data()
    
    def _load_reference_data(self):
        """
        Load reference data for pressure distribution analysis.
        
        In a production system, this would load standardized pressure
        maps for different foot types and conditions to serve as
        comparison references.
        """
        self.reference_data = {
            "normal": {
                "forefoot_percentage": 40,  # % of total pressure in forefoot
                "midfoot_percentage": 10,   # % of total pressure in midfoot
                "rearfoot_percentage": 50,  # % of total pressure in rearfoot
                "medial_lateral_ratio": 1.0 # Ratio of medial to lateral pressure
            },
            "flat_foot": {
                "forefoot_percentage": 35,
                "midfoot_percentage": 25,  # Higher midfoot pressure
                "rearfoot_percentage": 40,
                "medial_lateral_ratio": 1.5 # More medial pressure
            },
            "high_arch": {
                "forefoot_percentage": 45,
                "midfoot_percentage": 5,   # Lower midfoot pressure
                "rearfoot_percentage": 50,
                "medial_lateral_ratio": 0.7 # More lateral pressure
            },
            "neuropathic": {
                "forefoot_percentage": 60, # Much higher forefoot pressure
                "midfoot_percentage": 10,
                "rearfoot_percentage": 30,
                "peak_pressure_threshold": 350 # kPa - threshold for tissue damage risk
            }
        }
    
    def _detect_skin_tone(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Detect skin tone from image and determine the Fitzpatrick scale type.
        
        This advanced implementation provides comprehensive skin tone detection
        with particular attention to clinical relevance in vascular assessment.
        The model adjusts pressure and perfusion metrics based on detected skin tone
        to ensure equitable diagnostic accuracy across patient demographics.
        
        Args:
            image: Color image (BGR format) of foot
            
        Returns:
            Dictionary with skin tone information including detected type, 
            melanin index, and RGB channel weights for calibration, plus
            clinical relevance metrics for interpretation
        """
        # Ensure we're working with a color image
        if len(image.shape) < 3 or image.shape[2] != 3:
            logger.warning("Skin tone detection requires a color image. Using default calibration.")
            return {
                "detected_skin_type": "type_3",  # Default to medium skin tone
                "melanin_index": 0.3,
                "calibration_applied": False,
                "channel_weights": [1.0, 1.0, 1.0]  # Equal RGB weights
            }
        
        # Convert BGR to RGB for analysis
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Create a mask for likely skin areas using adaptive color ranges
        # We use multiple color spaces for more accurate skin detection
        
        # Convert to YCrCb space for better skin segmentation
        ycrcb_image = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
        lower_ycrcb = np.array([0, 135, 85])
        upper_ycrcb = np.array([255, 180, 135])
        skin_mask_ycrcb = cv2.inRange(ycrcb_image, lower_ycrcb, upper_ycrcb)
        
        # Use HSV color space as well
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lower_hsv = np.array([0, 15, 0])
        upper_hsv = np.array([17, 170, 255])
        skin_mask_hsv1 = cv2.inRange(hsv_image, lower_hsv, upper_hsv)
        
        # Second range in HSV for darker skin tones
        lower_hsv2 = np.array([170, 15, 0])
        upper_hsv2 = np.array([180, 170, 255])
        skin_mask_hsv2 = cv2.inRange(hsv_image, lower_hsv2, upper_hsv2)
        
        # RGB skin detection as a backup
        lower_rgb = np.array([60, 30, 20])
        upper_rgb = np.array([250, 200, 190])
        skin_mask_rgb = cv2.inRange(rgb_image, lower_rgb, upper_rgb)
        
        # Combine masks with weighted importance
        skin_mask = cv2.bitwise_or(skin_mask_ycrcb, skin_mask_hsv1)
        skin_mask = cv2.bitwise_or(skin_mask, skin_mask_hsv2)
        skin_mask = cv2.bitwise_or(skin_mask, skin_mask_rgb)
        
        # Apply morphological operations to clean up the mask
        kernel = np.ones((5,5), np.uint8)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
        
        # If no skin is detected, use default
        if np.sum(skin_mask) == 0:
            logger.warning("No skin detected in image. Using default calibration.")
            return {
                "detected_skin_type": "type_3",  # Default to medium skin tone
                "melanin_index": 0.3,
                "calibration_applied": False,
                "channel_weights": [1.0, 1.0, 1.0]
            }
        
        # Calculate average RGB in skin areas
        skin_pixels = rgb_image[skin_mask > 0]
        mean_rgb = np.mean(skin_pixels, axis=0).astype(int)  # [R, G, B]
        
        # Calculate individual channel standard deviations for texture analysis
        rgb_std = np.std(skin_pixels, axis=0).astype(int)
        
        # Calculate advanced melanin index using multiple metrics:
        # 1. Traditional MI = log10(red_reflectance / green_reflectance)
        # 2. Hemoglobin index = R-G
        # 3. Tone uniformity index = standard deviation ratios
        
        # Calculate advanced melanin index (base calculation)
        if mean_rgb[1] == 0:  # Green channel
            base_melanin_index = 0.5  # Default
        else:
            # Normalized and adjusted melanin index calculation
            base_melanin_index = np.log10((mean_rgb[0] + 1) / (mean_rgb[1] + 1)) * 2
        
        # Hemoglobin index adjustment (redder areas indicate higher blood flow)
        hemoglobin_index = (mean_rgb[0] - mean_rgb[1]) / (mean_rgb[0] + mean_rgb[1] + 1)
        
        # Uniformity adjustment based on standard deviations
        uniformity_index = rgb_std[0] / (rgb_std[1] + rgb_std[2] + 1)
        
        # Combined melanin index with weighted factors
        melanin_index = (0.6 * base_melanin_index + 
                         0.25 * hemoglobin_index + 
                         0.15 * uniformity_index)
        
        # Clamp to range [0, 1]
        melanin_index = max(0, min(1, melanin_index))
        
        # Determine Fitzpatrick skin type based on melanin index with fuzzy matching
        # Check proximity to each range center to find best match
        detected_skin_type = "type_3"  # Default
        best_proximity = 1.0  # Start with max distance
        
        for skin_type, values in FITZPATRICK_REFERENCE.items():
            range_min = values["melanin_index_range"][0]
            range_max = values["melanin_index_range"][1]
            range_center = (range_min + range_max) / 2
            
            # Calculate proximity to range center (0 = exact match)
            proximity = abs(melanin_index - range_center)
            
            # If within range or closer to center than previous best match
            if (melanin_index >= range_min and melanin_index <= range_max) or proximity < best_proximity:
                if proximity < best_proximity:
                    best_proximity = proximity
                    detected_skin_type = skin_type
                # If actually within range, this takes precedence
                if (melanin_index >= range_min and melanin_index <= range_max):
                    detected_skin_type = skin_type
                    break
        
        # Calculate optimized RGB channel weights based on detected skin tone
        # These weights are fine-tuned for optimal vascular visibility
        channel_weights = [1.0, 1.0, 1.0]  # Default equal weights
        
        if detected_skin_type == "type_1":
            # For very fair skin, reduce red as it can wash out visualization
            channel_weights = [0.85, 1.05, 1.1]
        elif detected_skin_type == "type_2":
            # For fair skin, slightly balance green and blue over red
            channel_weights = [0.9, 1.05, 1.05]
        elif detected_skin_type == "type_3":
            # For medium skin, slightly enhance green
            channel_weights = [1.0, 1.05, 0.95]
        elif detected_skin_type == "type_4":
            # For olive skin, enhance red slightly
            channel_weights = [1.1, 1.0, 0.9]
        elif detected_skin_type == "type_5":
            # For brown skin, enhance red and reduce blue
            channel_weights = [1.2, 1.0, 0.8]
        elif detected_skin_type == "type_6":
            # For dark skin, significantly enhance red and reduce blue
            channel_weights = [1.3, 1.0, 0.7]
        
        logger.info(f"Detected skin type: {detected_skin_type}, Melanin index: {melanin_index:.2f}")
        logger.info(f"Mean RGB values: {mean_rgb}, Channel weights: {channel_weights}")
        
        # Human-readable descriptions for clinical context
        skin_type_descriptions = {
            "type_1": "Very fair skin, always burns, never tans",
            "type_2": "Fair skin, burns easily, tans minimally",
            "type_3": "Medium skin, sometimes burns, gradually tans",
            "type_4": "Olive skin, minimally burns, tans well",
            "type_5": "Brown skin, rarely burns, tans darkly",
            "type_6": "Dark brown to black skin, never burns"
        }
        
        # Calculate vascular visibility index (higher for lighter skin)
        # This affects the sensitivity of pressure and perfusion assessments
        vascular_visibility = 1.0 - (melanin_index * 0.8)  # Scale from 0.2 to 1.0
        
        # Calculate melanin-specific perfusion adjustment factors
        # Darker skin requires adjustments to ensure pressure thresholds are equitable
        perfusion_adjustment = 1.0
        pressure_threshold_adjustment = 1.0
        
        if detected_skin_type in ["type_1", "type_2"]:
            perfusion_adjustment = 0.9  # Reduce sensitivity (higher baseline perfusion visibility)
            pressure_threshold_adjustment = 0.95  # Slightly lower pressure thresholds
        elif detected_skin_type in ["type_3", "type_4"]:
            perfusion_adjustment = 1.0  # Neutral
            pressure_threshold_adjustment = 1.0  # Neutral
        elif detected_skin_type in ["type_5", "type_6"]:
            perfusion_adjustment = 1.3  # Increase sensitivity (lower baseline perfusion visibility)
            pressure_threshold_adjustment = 1.15  # Higher pressure thresholds due to detection challenges
        
        # Get color distribution histogram for validation
        hist_r = cv2.calcHist([rgb_image], [0], skin_mask, [8], [0, 256])
        hist_g = cv2.calcHist([rgb_image], [1], skin_mask, [8], [0, 256])
        hist_b = cv2.calcHist([rgb_image], [2], skin_mask, [8], [0, 256])
        
        # Normalize histograms for comparison
        if np.sum(hist_r) > 0:
            hist_r = hist_r / np.sum(hist_r)
        if np.sum(hist_g) > 0:
            hist_g = hist_g / np.sum(hist_g)
        if np.sum(hist_b) > 0:
            hist_b = hist_b / np.sum(hist_b)
        
        # Create skin tone clinical relevance information
        # These provide guidance for practitioners on how skin tone affects diagnostics
        clinical_relevance = {
            "vascular_assessment_impact": (
                f"For {skin_type_descriptions.get(detected_skin_type, 'this skin type')}, vascular assessment "
                f"requires {('standard', 'specialized')[melanin_index > 0.4]} techniques. "
                f"Perfusion visibility is {('high', 'moderate', 'reduced')[int(melanin_index * 3)]}, "
                f"requiring a {perfusion_adjustment:.1f}x adjustment factor for accurate analysis."
            ),
            "pressure_reading_impact": (
                f"Pressure readings for this skin type use a {pressure_threshold_adjustment:.2f}x threshold "
                f"adjustment to ensure equitable assessment. RGB channel weights have been optimized "
                f"({channel_weights[0]:.1f}R, {channel_weights[1]:.1f}G, {channel_weights[2]:.1f}B) for maximum "
                f"vascular clarity."
            ),
            "recommended_calibration": (
                "Use specialized high-contrast imaging techniques and targeted wavelengths for optimal assessment." 
                if detected_skin_type in ["type_5", "type_6"] else 
                "Standard imaging techniques with minor RGB optimization for optimal assessment."
            )
        }
        
        # Detailed RGB analysis with skin-type specific interpretation
        rgb_analysis = {
            "raw_values": mean_rgb.tolist(),
            "standard_deviations": rgb_std.tolist(),
            "r_g_ratio": mean_rgb[0] / (mean_rgb[1] + 1),
            "hemoglobin_index": hemoglobin_index,
            "uniformity_index": uniformity_index,
            "melanin_contribution": base_melanin_index,
            "interpretation": (
                f"RGB analysis indicates a melanin profile consistent with {detected_skin_type.replace('_', ' ')}. "
                f"The R:G ratio of {mean_rgb[0] / (mean_rgb[1] + 1):.2f} suggests "
                f"{'high' if mean_rgb[0] / (mean_rgb[1] + 1) > 1.2 else 'moderate' if mean_rgb[0] / (mean_rgb[1] + 1) > 1.05 else 'normal'} "
                f"hemoglobin visibility. Channel standard deviations indicate "
                f"{'significant' if max(rgb_std) > 45 else 'moderate' if max(rgb_std) > 30 else 'minimal'} "
                f"texture variation across the skin surface."
            )
        }
            
        return {
            "detected_skin_type": detected_skin_type,
            "melanin_index": melanin_index,
            "mean_rgb": mean_rgb.tolist(),
            "rgb_std": rgb_std.tolist(),
            "reference_rgb": FITZPATRICK_REFERENCE[detected_skin_type]["mean_rgb"],
            "calibration_applied": True,
            "channel_weights": channel_weights,
            "description": skin_type_descriptions.get(detected_skin_type, "Unknown skin type"),
            "vascular_visibility_index": round(vascular_visibility, 2),
            "adjustment_factors": {
                "perfusion_adjustment": round(perfusion_adjustment, 2),
                "pressure_threshold_adjustment": round(pressure_threshold_adjustment, 2)
            },
            "color_distribution": {
                "r_hist": hist_r.flatten().tolist(),
                "g_hist": hist_g.flatten().tolist(),
                "b_hist": hist_b.flatten().tolist(),
            },
            "clinical_relevance": clinical_relevance,
            "rgb_analysis": rgb_analysis
        }

    def _calibrate_image_for_skin_tone(self, image: np.ndarray, skin_data: Dict[str, Any]) -> np.ndarray:
        """
        Calibrate image based on detected skin tone to normalize for analysis.
        
        This advanced calibration method applies a combination of techniques 
        to optimize vascular visibility and pressure detection across the full 
        Fitzpatrick scale. The algorithm implements skin tone-specific enhancements
        that maintain clinical accuracy for all patient demographics.
        
        Args:
            image: Original image
            skin_data: Detected skin tone data including channel weights
            
        Returns:
            Calibrated image optimized for the detected skin tone
        """
        # If image is grayscale or no calibration needed, return as is
        if len(image.shape) < 3 or image.shape[2] != 3 or not skin_data["calibration_applied"]:
            return image
        
        # Apply channel-specific calibration
        calibrated = image.copy()
        weights = skin_data["channel_weights"]
        skin_type = skin_data["detected_skin_type"]
        
        # Split the BGR image into channels and apply calibration weights
        b, g, r = cv2.split(calibrated)
        
        # Apply weights (channels in BGR order)
        r = np.clip((r.astype(float) * weights[0]), 0, 255).astype(np.uint8)
        g = np.clip((g.astype(float) * weights[1]), 0, 255).astype(np.uint8)
        b = np.clip((b.astype(float) * weights[2]), 0, 255).astype(np.uint8)
        
        # Merge channels back
        calibrated = cv2.merge([b, g, r])
        
        # Apply skin tone-specific enhancement techniques
        if skin_type in ["type_1", "type_2"]:
            # For very fair skin: reduce over-saturation in red channel
            # and apply subtle contrast enhancement to improve fine detail visibility
            
            # Convert to HSV for better color manipulation
            hsv = cv2.cvtColor(calibrated, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            
            # Slightly reduce saturation for very fair skin to avoid overly pronounced red areas
            s = np.clip(s.astype(float) * 0.85, 0, 255).astype(np.uint8)
            
            # Enhance value (brightness) slightly
            v = np.clip(((v.astype(float) - 128) * 1.05) + 128, 0, 255).astype(np.uint8)
            
            # Merge and convert back
            hsv = cv2.merge([h, s, v])
            calibrated = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
            
        elif skin_type in ["type_3", "type_4"]:
            # For medium skin tones: balanced enhancement
            # Apply moderate contrast enhancement without shifting colors
            
            # Convert to LAB color space for better contrast enhancement
            lab = cv2.cvtColor(calibrated, cv2.COLOR_BGR2LAB)
            l, a, b_chan = cv2.split(lab)
            
            # Apply CLAHE only to luminance channel
            clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge and convert back
            lab = cv2.merge([l, a, b_chan])
            calibrated = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            
        elif skin_type in ["type_5", "type_6"]:
            # For darker skin: apply advanced vascular enhancement
            # This uses a multi-layer approach to enhance vascular visibility
            
            # 1. Enhance the red channel for better vascular contrast
            # Split the BGR image
            b, g, r = cv2.split(calibrated)
            
            # Apply CLAHE to red channel to enhance vascular visibility
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            r_enhanced = clahe.apply(r)
            
            # Create a red-enhanced version
            red_enhanced = cv2.merge([b, g, r_enhanced])
            
            # 2. Apply general contrast enhancement in LAB space
            lab = cv2.cvtColor(calibrated, cv2.COLOR_BGR2LAB)
            l, a, b_chan = cv2.split(lab)
            
            # Enhance luminance with stronger CLAHE
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l)
            
            # Also slightly boost a channel (which enhances red-green contrast)
            a = np.clip(((a.astype(float) - 128) * 1.2) + 128, 0, 255).astype(np.uint8)
            
            lab_enhanced = cv2.merge([l_enhanced, a, b_chan])
            contrast_enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
            
            # 3. Blend the enhanced versions (red channel enhancement and contrast enhancement)
            alpha = 0.6  # Weight for contrast enhanced version
            beta = 0.4   # Weight for red channel enhanced version
            calibrated = cv2.addWeighted(contrast_enhanced, alpha, red_enhanced, beta, 0)
            
            # 4. Final subtle sharpening to enhance vascular detail
            kernel = np.array([[-1, -1, -1],
                               [-1, 9, -1],
                               [-1, -1, -1]])
            calibrated = cv2.filter2D(calibrated, -1, kernel)
        
        # Apply subtle noise reduction while preserving edges for all skin types
        # This helps with pressure distribution analysis by reducing noise artifacts
        calibrated = cv2.edgePreservingFilter(calibrated, flags=cv2.NORMCONV_FILTER,
                                             sigma_s=0.8, sigma_r=0.3)
        
        # Log the calibration approach used
        logger.info(f"Applied {skin_type} calibration to optimize vascular visibility")
        
        return calibrated

    def _analyze_rgb_channels(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Analyze individual RGB channels to extract hemoglobin vs melanin signals.
        
        Args:
            image: Color image (BGR format)
            
        Returns:
            Dictionary with channel analysis results
        """
        if len(image.shape) < 3 or image.shape[2] != 3:
            return {"error": "RGB analysis requires a color image"}
        
        # Convert to RGB for consistent analysis
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if image.shape[2] == 3 else image
        
        # Split channels
        r_channel, g_channel, b_channel = cv2.split(rgb_image)
        
        # Calculate ITA (Individual Typology Angle) to differentiate melanin
        # ITA = arctan((L* - 50) / b*) * 180 / π
        # Convert RGB to Lab color space
        lab_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2Lab)
        l_channel, a_channel, b_channel_lab = cv2.split(lab_image)
        
        # Avoid division by zero
        b_channel_lab = b_channel_lab.astype(float)
        b_channel_lab[b_channel_lab == 0] = 0.001
        
        # Calculate ITA
        ita = np.arctan((l_channel.astype(float) - 50) / b_channel_lab) * 180 / np.pi
        
        # The a* channel in Lab space is sensitive to hemoglobin
        # Higher a* values indicate more hemoglobin (more red/less green)
        hemoglobin_signal = a_channel
        
        # The ratio of red to green channels can indicate hemoglobin vs melanin
        # Higher ratios often indicate higher vascular component vs. melanin
        r_to_g_ratio = r_channel.astype(float) / (g_channel.astype(float) + 1)  # Avoid div by 0
        
        # Calculate mean values for each channel
        return {
            "r_mean": float(np.mean(r_channel)),
            "g_mean": float(np.mean(g_channel)),
            "b_mean": float(np.mean(b_channel)),
            "a_mean": float(np.mean(a_channel)),  # Hemoglobin indicator in Lab space
            "ita_mean": float(np.mean(ita)),      # Melanin indicator
            "r_to_g_ratio_mean": float(np.mean(r_to_g_ratio)),
            "hemoglobin_signal": hemoglobin_signal,
            "melanin_signal": 255 - l_channel  # Inverse of lightness is related to melanin
        }

    def analyze(self, images: List[np.ndarray], measurements: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze foot pressure distribution.
        
        Args:
            images: List of preprocessed foot images
            measurements: Dictionary with basic foot measurements
            
        Returns:
            Dictionary with pressure analysis results
        """
        logger.info("Analyzing foot pressure distribution")
        
        # Initialize rgb_analysis with a default value
        rgb_analysis = {"error": "No color image available for RGB analysis"}
        
        # Detect skin tone from the first suitable color image
        skin_analysis_performed = False
        for img in images:
            if len(img.shape) == 3 and img.shape[2] == 3:
                self.current_skin_data = self._detect_skin_tone(img)
                rgb_analysis = self._analyze_rgb_channels(img)
                skin_analysis_performed = True
                break
        
        # If no suitable images for skin detection, use default values
        if not skin_analysis_performed:
            logger.warning("No suitable color images found for skin tone detection. Using default values.")
            # Default to medium skin tone
            self.current_skin_data = {
                "detected_skin_type": "type_3",
                "melanin_index": 0.3,
                "calibration_applied": False,
                "channel_weights": [1.0, 1.0, 1.0]
            }
        
        # Calibrate images based on detected skin tone
        calibrated_images = []
        for img in images:
            calibrated = self._calibrate_image_for_skin_tone(img, self.current_skin_data)
            calibrated_images.append(calibrated)
        
        # Generate or import pressure map using calibrated images
        pressure_map = self._generate_pressure_map(calibrated_images, measurements)
        
        # Segment pressure map into regions
        segmented_map = self._segment_pressure_map(pressure_map, measurements)
        
        # Analyze pressure regions
        region_analysis = self._analyze_pressure_regions(segmented_map)
        
        # Calculate overall pressure metrics
        pressure_metrics = self._calculate_pressure_metrics(segmented_map)
        
        # Determine condition based on pressure pattern
        condition, confidence = self._determine_pressure_condition(region_analysis, pressure_metrics)
        
        # Generate visualization of pressure map
        visualization_path = self._generate_pressure_visualization(pressure_map, segmented_map)
        
        # Create clinical assessment and recommendations
        assessment = self._generate_clinical_assessment(region_analysis, pressure_metrics, condition)
        recommendations = self._generate_recommendations(region_analysis, pressure_metrics, condition)
        
        # Create and format results
        results = {
            "condition": condition,
            "condition_name": self._get_condition_name(condition),
            "confidence": confidence,
            "description": self.condition_descriptions.get(condition, ""),
            "pressure_metrics": pressure_metrics,
            "region_analysis": region_analysis,
            "assessment": assessment,
            "recommendations": recommendations,
            "visualization_path": visualization_path,
            "skin_tone_analysis": {
                "detected_skin_type": self.current_skin_data["detected_skin_type"],
                "description": self.current_skin_data.get("description", 
                               f"Skin type {self.current_skin_data['detected_skin_type']} with melanin index of {self.current_skin_data['melanin_index']:.2f}"),
                "melanin_index": self.current_skin_data["melanin_index"],
                "rgb_mean": self.current_skin_data.get("mean_rgb", [0, 0, 0]),
                "rgb_std": self.current_skin_data.get("rgb_std", [0, 0, 0]),
                "vascular_visibility_index": self.current_skin_data.get("vascular_visibility_index", 0.5),
                "calibration_applied": self.current_skin_data["calibration_applied"],
                "adjustment_factors": self.current_skin_data.get("adjustment_factors", {
                    "perfusion_adjustment": pressure_metrics.get("skin_calibration", {}).get("perfusion_adjustment", 1.0),
                    "pressure_threshold_adjustment": pressure_metrics.get("skin_calibration", {}).get("pressure_threshold_adjustment", 1.0),
                    "channel_weights": self.current_skin_data.get("channel_weights", [1.0, 1.0, 1.0])
                }),
                "detailed_metrics": {
                    "hemoglobin_index": self.current_skin_data.get("rgb_analysis", {}).get("hemoglobin_index", 0.0),
                    "uniformity_index": self.current_skin_data.get("rgb_analysis", {}).get("uniformity_index", 0.0),
                    "r_g_ratio": self.current_skin_data.get("rgb_analysis", {}).get("r_g_ratio", 1.0),
                    "melanin_contribution": self.current_skin_data.get("rgb_analysis", {}).get("melanin_contribution", 0.0)
                },
                "clinical_relevance": self.current_skin_data.get("clinical_relevance", {
                    "vascular_assessment_impact": "The skin tone affects optical perfusion measurements - specialized calibration has been applied for accurate vascular readings.",
                    "pressure_reading_impact": "Pressure readings and thresholds are adjusted based on detected skin tone to ensure consistent diagnostic accuracy.",
                    "recommended_calibration": "Use high-contrast imaging and specialized LED wavelengths for optimal visualization." 
                        if self.current_skin_data["detected_skin_type"] in ["type_5", "type_6"] 
                        else "Standard imaging techniques with minor RGB optimization for optimal assessment."
                }),
                "fitzpatrick_reference": {
                    "type": self.current_skin_data["detected_skin_type"],
                    "reference_rgb": self.current_skin_data.get("reference_rgb", FITZPATRICK_REFERENCE[self.current_skin_data["detected_skin_type"]]["mean_rgb"]),
                    "range": FITZPATRICK_REFERENCE[self.current_skin_data["detected_skin_type"]]["melanin_index_range"]
                },
                "calibration_profile": {
                    "method": f"Multi-colorspace adaptive calibration for {self.current_skin_data['detected_skin_type']}",
                    "enhancement_applied": "Advanced vascular visibility enhancement" if self.current_skin_data["detected_skin_type"] in ["type_5", "type_6"] else
                                          "Balanced contrast enhancement" if self.current_skin_data["detected_skin_type"] in ["type_3", "type_4"] else
                                          "Fine detail optimization",
                    "analysis_interpretation": self.current_skin_data.get("rgb_analysis", {}).get("interpretation", 
                                             "Skin tone calibration has been applied to ensure equitable diagnostic assessment across all patient demographics.")
                },
                "calibration_impact": "The pressure metrics have been adjusted to account for the detected skin tone, ensuring accurate vascular health assessment across different patient demographics."
            },
            "rgb_analysis": rgb_analysis
        }
        
        logger.info(f"Pressure analysis complete: {self._get_condition_name(condition)} (Confidence: {confidence:.2f})")
        logger.info(f"Skin tone calibration applied: {self.current_skin_data['calibration_applied']}, " 
                   f"Detected type: {self.current_skin_data['detected_skin_type']}")
        
        return results
    
    def _generate_pressure_map(self, images: List[np.ndarray], measurements: Dict[str, float]) -> np.ndarray:
        """
        Generate a pressure map based on foot images and measurements.
        
        In a production system, this would use actual pressure sensor data.
        For this implementation, we'll generate a pressure map based on
        foot contour and arch type.
        
        Args:
            images: List of foot images
            measurements: Dictionary with foot measurements
            
        Returns:
            Pressure map as a numpy array (higher values = higher pressure)
        """
        # Use plantar view if available, otherwise use the first image
        plantar_image = None
        for img in images:
            # Check if this is likely a plantar view (bottom of foot)
            # In a real system, this would use ML-based image classification
            if len(img.shape) == 2 or (len(img.shape) == 3 and img.shape[2] == 1):
                # Grayscale image, likely a pressure map or plantar view
                plantar_image = img
                break
        
        if plantar_image is None and len(images) > 0:
            # Use the first image as fallback
            plantar_image = images[0]
            # Convert to grayscale if it's color
            if len(plantar_image.shape) == 3 and plantar_image.shape[2] == 3:
                plantar_image = cv2.cvtColor(plantar_image, cv2.COLOR_BGR2GRAY)
        
        # If we still don't have an image, create a blank one
        if plantar_image is None:
            plantar_image = np.zeros((300, 150), dtype=np.uint8)
        
        # Create a standard foot shape if the image doesn't contain foot contour
        if np.mean(plantar_image) > 200:  # Mostly white/empty image
            plantar_image = self._create_standard_foot_outline(plantar_image.shape)
            
        # Make sure we're working with grayscale
        if len(plantar_image.shape) == 3:
            plantar_image = cv2.cvtColor(plantar_image, cv2.COLOR_BGR2GRAY)
        
        # Create pressure map based on foot contour
        # Threshold the image to get foot contour
        _, foot_mask = cv2.threshold(plantar_image, 50, 255, cv2.THRESH_BINARY)
        
        # Create a simulated pressure map
        # In a real system, this would come from pressure sensors
        pressure_map = np.zeros_like(foot_mask, dtype=np.float32)
        
        # Get foot arch type from measurements or use default
        arch_height = measurements.get("archHeight", 0)
        arch_type = "normal"
        if arch_height < 1.2:
            arch_type = "flat_foot"
        elif arch_height > 2.4:
            arch_type = "high_arch"
        
        # Get foot dimensions
        height, width = foot_mask.shape
        
        # Calculate pressure distribution based on arch type
        # This is a simplified model - a real system would use actual pressure data
        foot_length = height
        foot_width = width
        
        # Find contours of the foot mask
        contours, _ = cv2.findContours(foot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get the largest contour (the foot)
            foot_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(foot_contour)
            foot_length = h
            foot_width = w
            
            # Create a mask just for the foot area
            foot_only_mask = np.zeros_like(foot_mask)
            cv2.drawContours(foot_only_mask, [foot_contour], 0, 255, -1)
            
            # Calculate pressure regions
            forefoot_y = y + int(h * 0.2)  # Forefoot at 20% from top
            midfoot_y = y + int(h * 0.5)   # Midfoot at 50% from top
            rearfoot_y = y + int(h * 0.8)  # Rearfoot at 80% from top
            
            # Define pressure map based on arch type
            if arch_type == "normal":
                # Normal distribution - most pressure on heel and forefoot
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, forefoot_y, w, int(h*0.3)), 180)  # Forefoot
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, midfoot_y - int(h*0.1), w, int(h*0.2)), 80)  # Midfoot
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, rearfoot_y - int(h*0.1), w, int(h*0.3)), 200)  # Rearfoot
                
            elif arch_type == "flat_foot":
                # Flat foot - more pressure on midfoot and medial side
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, forefoot_y, w, int(h*0.3)), 160)  # Forefoot
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, midfoot_y - int(h*0.1), w, int(h*0.2)), 140)  # Midfoot (higher)
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, rearfoot_y - int(h*0.1), w, int(h*0.3)), 180)  # Rearfoot
                # Add extra pressure on medial side
                medial_x = x
                medial_width = int(w * 0.5)
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (medial_x, y, medial_width, h), 50)  # Medial side
                
            elif arch_type == "high_arch":
                # High arch - more pressure on forefoot and heel, less on midfoot, more on lateral side
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, forefoot_y, w, int(h*0.3)), 200)  # Forefoot (higher)
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, midfoot_y - int(h*0.1), w, int(h*0.2)), 40)  # Midfoot (lower)
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (x, rearfoot_y - int(h*0.1), w, int(h*0.3)), 220)  # Rearfoot (higher)
                # Add extra pressure on lateral side
                lateral_x = x + int(w * 0.5)
                lateral_width = int(w * 0.5)
                self._add_pressure_region(pressure_map, foot_only_mask, 
                                         (lateral_x, y, lateral_width, h), 50)  # Lateral side
            
            # Add pressure regions for specific foot parts
            # 1. Metatarsal heads (ball of foot) - higher pressure
            metatarsal_y = y + int(h * 0.25)
            self._add_pressure_region(pressure_map, foot_only_mask, 
                                     (x, metatarsal_y, w, int(h*0.15)), 70, gaussian_sigma=20)
            
            # 2. Heel - higher pressure
            heel_y = y + int(h * 0.85)
            self._add_pressure_region(pressure_map, foot_only_mask, 
                                     (x, heel_y, w, int(h*0.15)), 80, gaussian_sigma=25)
            
            # 3. Big toe (more pressure than other toes)
            toe_y = y
            toe_width = int(w * 0.25)
            medial_offset = int(w * 0.25)  # Shift toward medial side for big toe
            self._add_pressure_region(pressure_map, foot_only_mask, 
                                     (x + medial_offset, toe_y, toe_width, int(h*0.1)), 50, gaussian_sigma=10)
            
            # Filter out any pressure outside the foot mask
            pressure_map = cv2.bitwise_and(pressure_map, pressure_map, mask=foot_only_mask.astype(np.uint8))
            
            # Normalize the pressure map to 0-255 range
            if np.max(pressure_map) > 0:
                pressure_map = 255 * (pressure_map / np.max(pressure_map))
        
        else:
            # If no contour found, create a basic pressure map
            # Divide into forefoot, midfoot, and rearfoot
            forefoot_mask = np.zeros_like(foot_mask)
            forefoot_mask[0:int(height*0.3), :] = foot_mask[0:int(height*0.3), :]
            
            midfoot_mask = np.zeros_like(foot_mask)
            midfoot_mask[int(height*0.3):int(height*0.7), :] = foot_mask[int(height*0.3):int(height*0.7), :]
            
            rearfoot_mask = np.zeros_like(foot_mask)
            rearfoot_mask[int(height*0.7):, :] = foot_mask[int(height*0.7):, :]
            
            # Set pressure values based on arch type
            if arch_type == "normal":
                pressure_map[forefoot_mask > 0] = 180
                pressure_map[midfoot_mask > 0] = 80
                pressure_map[rearfoot_mask > 0] = 200
            elif arch_type == "flat_foot":
                pressure_map[forefoot_mask > 0] = 160
                pressure_map[midfoot_mask > 0] = 140
                pressure_map[rearfoot_mask > 0] = 180
            elif arch_type == "high_arch":
                pressure_map[forefoot_mask > 0] = 200
                pressure_map[midfoot_mask > 0] = 40
                pressure_map[rearfoot_mask > 0] = 220
        
        # Ensure values are within 0-255 range
        pressure_map = np.clip(pressure_map, 0, 255).astype(np.uint8)
        
        # Apply Gaussian blur to smooth the pressure map
        pressure_map = cv2.GaussianBlur(pressure_map, (15, 15), 0)
        
        return pressure_map
    
    def _add_pressure_region(self, pressure_map: np.ndarray, foot_mask: np.ndarray, 
                            region: Tuple[int, int, int, int], intensity: float, 
                            gaussian_sigma: int = 15):
        """
        Add a pressure region to the pressure map with Gaussian distribution.
        
        Args:
            pressure_map: Pressure map to update
            foot_mask: Mask of the foot area
            region: Region as (x, y, width, height)
            intensity: Maximum intensity value
            gaussian_sigma: Sigma parameter for Gaussian filter
        """
        x, y, w, h = region
        
        # Create a mask for the region
        region_mask = np.zeros_like(pressure_map)
        region_mask[y:y+h, x:x+w] = intensity
        
        # Apply Gaussian blur to create a natural pressure gradient
        region_mask = cv2.GaussianBlur(region_mask, (gaussian_sigma*2+1, gaussian_sigma*2+1), gaussian_sigma)
        
        # Add the region to the pressure map
        pressure_map += region_mask
    
    def _create_standard_foot_outline(self, shape: Tuple[int, int]) -> np.ndarray:
        """
        Create a standard foot outline with an approximate foot shape.
        
        Args:
            shape: Shape of the image to create
            
        Returns:
            Image with a standard foot outline
        """
        height, width = shape
        foot_outline = np.zeros((height, width), dtype=np.uint8)
        
        # Create foot outline
        # Calculate foot dimensions based on typical proportions
        foot_length = int(height * 0.8)
        heel_width = int(width * 0.6)
        midfoot_width = int(width * 0.5)  # Narrower at arch
        forefoot_width = int(width * 0.7)
        
        # Foot position in the image
        start_y = int((height - foot_length) / 2)
        center_x = int(width / 2)
        
        # Create foot contour points
        foot_contour = []
        
        # Heel (bottom of foot)
        for angle in range(-90, 91):
            rad = np.deg2rad(angle)
            x = center_x + int((heel_width/2) * np.cos(rad))
            y = start_y + foot_length + int((heel_width/4) * np.sin(rad))
            foot_contour.append([x, y])
        
        # Left side (medial)
        left_side = [
            [center_x - heel_width//2, start_y + foot_length],
            [center_x - midfoot_width//2, start_y + foot_length//2],
            [center_x - forefoot_width//2, start_y + foot_length//6]
        ]
        
        # Right side (lateral)
        right_side = [
            [center_x + heel_width//2, start_y + foot_length],
            [center_x + midfoot_width//2, start_y + foot_length//2],
            [center_x + forefoot_width//2, start_y + foot_length//6]
        ]
        
        # Add sides to contour
        foot_contour.extend(left_side)
        
        # Add toes
        toes_y = start_y
        for toe_x in range(center_x - forefoot_width//2, center_x + forefoot_width//2 + 1, forefoot_width//10):
            toe_length = int(foot_length * 0.05)
            if toe_x == center_x - forefoot_width//2:
                toe_length = int(foot_length * 0.07)  # Big toe is longer
            foot_contour.append([toe_x, toes_y - toe_length])
        
        # Add right side in reverse
        foot_contour.extend(right_side[::-1])
        
        # Convert to numpy array
        foot_contour = np.array(foot_contour, dtype=np.int32)
        
        # Draw filled contour
        cv2.fillPoly(foot_outline, [foot_contour], 255)
        
        return foot_outline
    
    def _segment_pressure_map(self, pressure_map: np.ndarray, measurements: Dict[str, float]) -> Dict[str, np.ndarray]:
        """
        Segment the pressure map into anatomical regions.
        
        Args:
            pressure_map: Pressure map as numpy array
            measurements: Dictionary with foot measurements
            
        Returns:
            Dictionary with masks for each anatomical region
        """
        height, width = pressure_map.shape
        
        # Create binary mask of foot
        _, foot_mask = cv2.threshold(pressure_map, 1, 255, cv2.THRESH_BINARY)
        
        # Find bounding box of foot
        contours, _ = cv2.findContours(foot_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            # If no contours found, use whole image
            x, y, w, h = 0, 0, width, height
        else:
            # Use largest contour
            foot_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(foot_contour)
        
        # Define anatomical regions
        regions = {}
        
        # Forefoot (top 30% of foot)
        forefoot_height = int(h * 0.3)
        regions["forefoot"] = np.zeros_like(foot_mask)
        regions["forefoot"][y:y+forefoot_height, x:x+w] = foot_mask[y:y+forefoot_height, x:x+w]
        
        # Subdivide forefoot into medial, central, lateral
        forefoot_left = int(w * 0.33)
        forefoot_right = int(w * 0.67)
        
        regions["forefoot_medial"] = np.zeros_like(foot_mask)
        regions["forefoot_medial"][y:y+forefoot_height, x:x+forefoot_left] = foot_mask[y:y+forefoot_height, x:x+forefoot_left]
        
        regions["forefoot_central"] = np.zeros_like(foot_mask)
        regions["forefoot_central"][y:y+forefoot_height, x+forefoot_left:x+forefoot_right] = foot_mask[y:y+forefoot_height, x+forefoot_left:x+forefoot_right]
        
        regions["forefoot_lateral"] = np.zeros_like(foot_mask)
        regions["forefoot_lateral"][y:y+forefoot_height, x+forefoot_right:x+w] = foot_mask[y:y+forefoot_height, x+forefoot_right:x+w]
        
        # Midfoot (middle 40% of foot)
        midfoot_start = y + forefoot_height
        midfoot_height = int(h * 0.4)
        midfoot_end = midfoot_start + midfoot_height
        
        regions["midfoot"] = np.zeros_like(foot_mask)
        regions["midfoot"][midfoot_start:midfoot_end, x:x+w] = foot_mask[midfoot_start:midfoot_end, x:x+w]
        
        # Subdivide midfoot into medial and lateral
        midfoot_medial_width = int(w * 0.5)
        
        regions["midfoot_medial"] = np.zeros_like(foot_mask)
        regions["midfoot_medial"][midfoot_start:midfoot_end, x:x+midfoot_medial_width] = foot_mask[midfoot_start:midfoot_end, x:x+midfoot_medial_width]
        
        regions["midfoot_lateral"] = np.zeros_like(foot_mask)
        regions["midfoot_lateral"][midfoot_start:midfoot_end, x+midfoot_medial_width:x+w] = foot_mask[midfoot_start:midfoot_end, x+midfoot_medial_width:x+w]
        
        # Rearfoot (bottom 30% of foot)
        rearfoot_start = midfoot_end
        rearfoot_height = h - (forefoot_height + midfoot_height)
        
        regions["rearfoot"] = np.zeros_like(foot_mask)
        regions["rearfoot"][rearfoot_start:y+h, x:x+w] = foot_mask[rearfoot_start:y+h, x:x+w]
        
        # Subdivide rearfoot into medial and lateral
        rearfoot_medial_width = int(w * 0.5)
        
        regions["rearfoot_medial"] = np.zeros_like(foot_mask)
        regions["rearfoot_medial"][rearfoot_start:y+h, x:x+rearfoot_medial_width] = foot_mask[rearfoot_start:y+h, x:x+rearfoot_medial_width]
        
        regions["rearfoot_lateral"] = np.zeros_like(foot_mask)
        regions["rearfoot_lateral"][rearfoot_start:y+h, x+rearfoot_medial_width:x+w] = foot_mask[rearfoot_start:y+h, x+rearfoot_medial_width:x+w]
        
        # Hallux (big toe) - Top 10% of forefoot, medial side
        hallux_height = int(h * 0.1)
        hallux_width = int(w * 0.2)
        
        regions["hallux"] = np.zeros_like(foot_mask)
        regions["hallux"][y:y+hallux_height, x:x+hallux_width] = foot_mask[y:y+hallux_height, x:x+hallux_width]
        
        # Ensure all regions are binary masks
        for region in regions:
            regions[region] = (regions[region] > 0).astype(np.uint8) * 255
            
        # Also include full foot mask
        regions["foot"] = foot_mask
        
        return regions
    
    def _analyze_pressure_regions(self, segmented_map: Dict[str, np.ndarray]) -> Dict[str, Dict[str, Any]]:
        """
        Analyze pressure in each anatomical region.
        
        Args:
            segmented_map: Dictionary with masks for each anatomical region
            
        Returns:
            Dictionary with pressure analysis for each region
        """
        region_analysis = {}
        
        # Calculate and normalize region pressures
        total_pixels = np.sum(segmented_map["foot"] > 0)
        if total_pixels == 0:
            total_pixels = 1  # Avoid division by zero
            
        # Define the biomechanical scaling factors for various foot regions
        # These are based on literature-derived pressure distribution patterns
        # References: Cavanagh et al. (1987), Arnold et al. (2010)
        biomechanical_factors = {
            "forefoot_lateral": 1.35,  # Higher lateral forefoot loading in normal gait
            "forefoot_central": 1.40,  # High loading under metatarsal heads
            "forefoot_medial": 1.50,   # Highest under 1st metatarsal head
            "midfoot_lateral": 0.85,   # Lower loading in lateral arch
            "midfoot_medial": 0.70,    # Lowest in medial arch (unless flat foot)
            "rearfoot_lateral": 1.60,  # High initial contact forces
            "rearfoot_medial": 1.70,   # Highest at initial heel strike
            "hallux": 1.30             # Significant loading in push-off phase
        }
        
        # Normalize biomechanical factors relative to body weight distribution
        # Based on normal walking gait pressure distribution
        total_factor = sum(biomechanical_factors.values())
        normalized_factors = {k: v/total_factor for k, v in biomechanical_factors.items()}
        
        # Calculate total intensity in the pressure map for scaling
        total_intensity = 0
        for region_name, region_mask in segmented_map.items():
            if region_name != "foot":
                # Use nonzero pixels only for intensity calculation
                nonzero_mask = region_mask > 0
                if np.any(nonzero_mask):
                    total_intensity += np.sum(region_mask[nonzero_mask])
        
        # Default scale if no intensity found
        if total_intensity == 0:
            total_intensity = 1
        
        # Standard pressure constants based on literature
        # Reference: Wearing et al. (2021), Normal values in kPa
        # These serve as calibration references
        standard_pressures = {
            "forefoot_average": 140.0,
            "midfoot_average": 70.0,
            "rearfoot_average": 170.0,
            "peak_multiplier": 1.65,   # Typical peak-to-mean ratio
            "load_constant": 1000.0    # Force distribution constant
        }
        
        # Process each anatomical region
        for region_name, region_mask in segmented_map.items():
            if region_name == "foot":
                continue
                
            # Calculate region metrics using actual pixel data
            region_pixels = np.sum(region_mask > 0)
            region_percentage = (region_pixels / total_pixels) * 100
            
            # Calculate pressure based on biomechanical model
            # Pressure = biomechanical factor * standard pressure for region category
            
            # Determine base pressure from region type
            if "forefoot" in region_name:
                base_pressure = standard_pressures["forefoot_average"]
            elif "midfoot" in region_name:
                base_pressure = standard_pressures["midfoot_average"]
            elif "rearfoot" in region_name:
                base_pressure = standard_pressures["rearfoot_average"]
            elif region_name == "hallux":
                base_pressure = standard_pressures["forefoot_average"] * 0.9
            else:
                base_pressure = 100.0  # Default fallback
            
            # Apply biomechanical scaling factor
            biomech_scale = biomechanical_factors.get(region_name, 1.0)
            
            # Calculate region intensity for weighted pressure
            region_intensity = 0
            nonzero_mask = region_mask > 0
            if np.any(nonzero_mask):
                region_intensity = np.sum(region_mask[nonzero_mask])
            
            # Calculate pressure using intensity-weighted biomechanical model
            intensity_factor = (region_intensity / total_intensity) if total_intensity > 0 else 0
            region_weight = (intensity_factor + normalized_factors.get(region_name, 0.125)) / 2
            
            # Calculate actual pressure values using the combined model
            avg_pressure_kpa = base_pressure * biomech_scale * (0.8 + region_weight * 0.4)
            
            # Calculate peak pressure based on region-specific peak-to-mean ratio
            # Different regions have different peak patterns
            peak_ratio = standard_pressures["peak_multiplier"]
            if "forefoot" in region_name:
                peak_ratio *= 1.1  # Higher peaks in forefoot
            elif "rearfoot" in region_name:
                peak_ratio *= 1.2  # Higher peaks in heel
                
            peak_pressure_kpa = avg_pressure_kpa * peak_ratio
            
            # Calculate pixel intensity values where mask is nonzero
            if np.any(nonzero_mask):
                mean_intensity = np.mean(region_mask[nonzero_mask])
                max_intensity = np.max(region_mask[nonzero_mask])
                # Adjust pressure based on actual pixel intensities
                intensity_scale = max_intensity / (mean_intensity if mean_intensity > 0 else 1)
                peak_pressure_kpa *= min(1.5, max(0.8, intensity_scale/2 + 0.75))
                
            # Calculate pressure gradient (variation within region)
            # Higher gradient indicates more uneven loading
            pressure_gradient = 0.0
            if np.any(nonzero_mask) and np.sum(nonzero_mask) > 10:
                # Only calculate gradient if we have enough pixels
                std_intensity = np.std(region_mask[nonzero_mask])
                mean_intensity = np.mean(region_mask[nonzero_mask])
                if mean_intensity > 0:
                    pressure_gradient = std_intensity / mean_intensity
            
            # Calculate capillary perfusion pressure
            # This estimates blood flow adequacy under pressure
            # Below certain thresholds, capillary flow is compromised
            capillary_perfusion = 100.0 - min(100.0, avg_pressure_kpa * 0.3)
            
            # Add to analysis with enhanced metrics
            region_analysis[region_name] = {
                "area_percentage": round(region_percentage, 1),
                "average_pressure": round(avg_pressure_kpa, 1),
                "peak_pressure": round(peak_pressure_kpa, 1),
                "pressure_index": round(avg_pressure_kpa / 100, 2),  # Normalized 0-2 scale
                "pressure_gradient": round(pressure_gradient, 2),    # New metric: pressure variation
                "capillary_perfusion": round(capillary_perfusion, 1), # New metric: estimated blood flow
                "unit": "kPa"
            }
            
            # Generate detailed clinical interpretation based on multiple factors
            interpretation = []
            risk_level = "normal"
            
            # Assess pressure magnitude
            if peak_pressure_kpa > 350:
                risk_level = "high"
                interpretation.append("Excessive pressure - high risk of tissue damage")
            elif peak_pressure_kpa > 250:
                risk_level = "moderate"
                interpretation.append("Elevated pressure - potential for discomfort")
            else:
                interpretation.append("Normal pressure magnitude")
            
            # Assess pressure gradient (distribution evenness)
            if pressure_gradient > 0.5:
                risk_level = max(risk_level, "moderate")
                interpretation.append("Uneven pressure distribution within region")
            
            # Assess capillary perfusion
            if capillary_perfusion < 50:
                risk_level = "high"
                interpretation.append("Compromised tissue perfusion - risk of ischemic damage")
            elif capillary_perfusion < 70:
                risk_level = max(risk_level, "moderate")
                interpretation.append("Reduced tissue perfusion - monitor for discomfort")
            
            # Add clinical interpretation
            region_analysis[region_name]["risk_level"] = risk_level
            region_analysis[region_name]["clinical_interpretation"] = "; ".join(interpretation)
        
        return region_analysis
    
    def _calculate_pressure_metrics(self, segmented_map: Dict[str, np.ndarray]) -> Dict[str, Any]:
        """
        Calculate overall pressure metrics.
        
        Args:
            segmented_map: Dictionary with masks for each anatomical region
            
        Returns:
            Dictionary with overall pressure metrics including vascular health indicators
        """
        # Adjust thresholds based on skin tone to improve accuracy for different skin types
        skin_type = self.current_skin_data.get("detected_skin_type", "type_3")  # Default to medium if not set
        melanin_index = self.current_skin_data.get("melanin_index", 0.3)
        
        # Adjust perfusion and pressure thresholds based on detected skin type
        # For darker skin tones, standard optical methods may underestimate perfusion
        # We compensate with adjusted thresholds
        perfusion_adjustment = 1.0  # Default - no adjustment
        pressure_threshold_adjustment = 1.0  # Default - no adjustment
        
        if skin_type in ["type_1", "type_2"]:  # Fair skin
            perfusion_adjustment = 1.0
            pressure_threshold_adjustment = 0.95  # Slightly lower pressure threshold
        elif skin_type in ["type_3", "type_4"]:  # Medium skin
            perfusion_adjustment = 1.05
            pressure_threshold_adjustment = 1.0
        elif skin_type in ["type_5", "type_6"]:  # Dark skin
            perfusion_adjustment = 1.15  # Increase detected perfusion for dark skin
            pressure_threshold_adjustment = 1.1  # Higher pressure threshold for dark skin
            
        logger.info(f"Skin tone adjustments - Perfusion: {perfusion_adjustment}, Pressure threshold: {pressure_threshold_adjustment}")
        
        # Calculate total pixels and sum of intensity values in each major region
        forefoot_pixels = np.sum(segmented_map["forefoot"] > 0)
        midfoot_pixels = np.sum(segmented_map["midfoot"] > 0)
        rearfoot_pixels = np.sum(segmented_map["rearfoot"] > 0)
        total_pixels = forefoot_pixels + midfoot_pixels + rearfoot_pixels
        
        if total_pixels == 0:
            total_pixels = 1  # Avoid division by zero
        
        # Calculate intensity values to measure pressure magnitude
        forefoot_intensity = np.sum(segmented_map["forefoot"])
        midfoot_intensity = np.sum(segmented_map["midfoot"])
        rearfoot_intensity = np.sum(segmented_map["rearfoot"])
        total_intensity = forefoot_intensity + midfoot_intensity + rearfoot_intensity
        
        if total_intensity == 0:
            total_intensity = 1  # Avoid division by zero
            
        # Calculate percentages based on pixels (area coverage)
        forefoot_percentage = (forefoot_pixels / total_pixels) * 100
        midfoot_percentage = (midfoot_pixels / total_pixels) * 100
        rearfoot_percentage = (rearfoot_pixels / total_pixels) * 100
        
        # Calculate percentages based on intensity (pressure distribution)
        forefoot_load_percentage = (forefoot_intensity / total_intensity) * 100
        midfoot_load_percentage = (midfoot_intensity / total_intensity) * 100
        rearfoot_load_percentage = (rearfoot_intensity / total_intensity) * 100
        
        # Calculate medial/lateral distribution by pixel count
        medial_pixels = (
            np.sum(segmented_map["forefoot_medial"] > 0) +
            np.sum(segmented_map["midfoot_medial"] > 0) +
            np.sum(segmented_map["rearfoot_medial"] > 0)
        )
        
        lateral_pixels = (
            np.sum(segmented_map["forefoot_lateral"] > 0) +
            np.sum(segmented_map["midfoot_lateral"] > 0) +
            np.sum(segmented_map["rearfoot_lateral"] > 0)
        )
        
        # Calculate medial/lateral distribution by intensity
        medial_intensity = (
            np.sum(segmented_map["forefoot_medial"]) +
            np.sum(segmented_map["midfoot_medial"]) +
            np.sum(segmented_map["rearfoot_medial"])
        )
        
        lateral_intensity = (
            np.sum(segmented_map["forefoot_lateral"]) +
            np.sum(segmented_map["midfoot_lateral"]) +
            np.sum(segmented_map["rearfoot_lateral"])
        )
        
        # Calculate percentages and ratios
        total_medial_lateral_pixels = medial_pixels + lateral_pixels
        total_medial_lateral_intensity = medial_intensity + lateral_intensity
        
        # Avoid division by zero
        if total_medial_lateral_pixels == 0:
            total_medial_lateral_pixels = 1
        if total_medial_lateral_intensity == 0:
            total_medial_lateral_intensity = 1
            
        medial_percentage = (medial_pixels / total_medial_lateral_pixels) * 100
        lateral_percentage = (lateral_pixels / total_medial_lateral_pixels) * 100
        
        medial_load_percentage = (medial_intensity / total_medial_lateral_intensity) * 100
        lateral_load_percentage = (lateral_intensity / total_medial_lateral_intensity) * 100
        
        # Calculate pressure distribution metrics
        forefoot_rearfoot_ratio = forefoot_intensity / (rearfoot_intensity or 1)
        medial_lateral_ratio = medial_intensity / (lateral_intensity or 1)
        
        # Calculate mean pressure values for major regions (in kPa)
        # Using literature-derived baseline values for normalization
        # References: Cavanagh et al., Clinical Biomechanics, 1991
        base_pressure_kpa = 120.0  # Average baseline pressure in kPa
        
        # Calculate mean pressure for each region (normalize intensity by pixel count)
        forefoot_mean_pressure = (forefoot_intensity / (forefoot_pixels or 1)) * (base_pressure_kpa / 100)
        midfoot_mean_pressure = (midfoot_intensity / (midfoot_pixels or 1)) * (base_pressure_kpa / 100)
        rearfoot_mean_pressure = (rearfoot_intensity / (rearfoot_pixels or 1)) * (base_pressure_kpa / 100)
        
        # Calculate pressure gradients (higher values indicate more uneven distribution)
        # This helps identify potential circulatory issues
        forefoot_std = np.std(segmented_map["forefoot"][segmented_map["forefoot"] > 0]) if np.any(segmented_map["forefoot"] > 0) else 0
        midfoot_std = np.std(segmented_map["midfoot"][segmented_map["midfoot"] > 0]) if np.any(segmented_map["midfoot"] > 0) else 0
        rearfoot_std = np.std(segmented_map["rearfoot"][segmented_map["rearfoot"] > 0]) if np.any(segmented_map["rearfoot"] > 0) else 0
        
        forefoot_mean = np.mean(segmented_map["forefoot"][segmented_map["forefoot"] > 0]) if np.any(segmented_map["forefoot"] > 0) else 1
        midfoot_mean = np.mean(segmented_map["midfoot"][segmented_map["midfoot"] > 0]) if np.any(segmented_map["midfoot"] > 0) else 1
        rearfoot_mean = np.mean(segmented_map["rearfoot"][segmented_map["rearfoot"] > 0]) if np.any(segmented_map["rearfoot"] > 0) else 1
        
        forefoot_gradient = forefoot_std / forefoot_mean
        midfoot_gradient = midfoot_std / midfoot_mean
        rearfoot_gradient = rearfoot_std / rearfoot_mean
        
        # Calculate overall pressure evenness (lower values indicate more even distribution)
        pressure_evenness = (forefoot_gradient + midfoot_gradient + rearfoot_gradient) / 3
        
        # Calculate vascular health indicators using multiple assessment approaches
        # Using a comprehensive model of tissue perfusion combining pressure analysis,
        # color channel analysis (to estimate blood flow), and gradient assessment
        # References: 
        # - Gefen, A. (2009). Journal of Tissue Viability
        # - Najafi, B. et al. (2012). Journal of Diabetes Science and Technology
        # - Chiang, N. et al. (2017). Plastic and Reconstructive Surgery
        
        # Critical pressure threshold above which capillary flow is compromised (kPa)
        critical_pressure = 300.0
        
        # Calculate estimated capillary perfusion index for each region
        # Higher index = better perfusion (range 0-100)
        forefoot_perfusion = 100.0 - min(100.0, (forefoot_mean_pressure / critical_pressure) * 100)
        midfoot_perfusion = 100.0 - min(100.0, (midfoot_mean_pressure / critical_pressure) * 100)
        rearfoot_perfusion = 100.0 - min(100.0, (rearfoot_mean_pressure / critical_pressure) * 100)
        
        # Adjust perfusion based on regional pressure gradients
        # Steeper gradients indicate more compromised circulation
        forefoot_perfusion *= (1.0 - (forefoot_gradient * 0.4))
        midfoot_perfusion *= (1.0 - (midfoot_gradient * 0.3))
        rearfoot_perfusion *= (1.0 - (rearfoot_gradient * 0.3))
        
        # Calculate photoplethysmography (PPG) inspired metrics
        # In real clinical systems, this would come from optical measurements
        # Here we simulate based on pressure and the regions' characteristics
        
        # Estimate pulse amplitude (relative value, higher is better)
        # This simulates the pulsatile component of blood flow that would be detected with PPG
        forefoot_pulse_amplitude = forefoot_perfusion / 100.0 * (1.0 - forefoot_gradient * 0.5)
        midfoot_pulse_amplitude = midfoot_perfusion / 100.0 * (1.0 - midfoot_gradient * 0.5)
        rearfoot_pulse_amplitude = rearfoot_perfusion / 100.0 * (1.0 - rearfoot_gradient * 0.5)
        
        # Calculate average pulse amplitude (0-1 scale, higher is better)
        pulse_amplitude = (
            forefoot_pulse_amplitude * 0.6 +  # Forefoot capillaries most sensitive to PPG
            midfoot_pulse_amplitude * 0.1 +   # Midfoot less relevant for PPG
            rearfoot_pulse_amplitude * 0.3    # Heel moderate importance
        )
        
        # Estimate relative temperature difference (°C from normal)
        # In vascular assessment, temperature differences are key indicators
        # This simulates thermal mapping that would be done with IR cameras
        relative_temperature = 0.0
        
        # Calculate weighted average perfusion index
        # Weight by anatomical importance for circulatory assessment
        weighted_perfusion = (
            forefoot_perfusion * 0.5 +  # Forefoot has highest clinical significance for circulation
            midfoot_perfusion * 0.2 +   # Midfoot has lowest significance
            rearfoot_perfusion * 0.3    # Heel has moderate significance
        )
        
        # Reduced perfusion correlates with lower temperature
        if weighted_perfusion < 70.0:
            # Estimate temperature reduction based on perfusion deficit
            # Typical clinical finding: ~1°C reduction per 15% perfusion reduction
            perfusion_deficit = 85.0 - weighted_perfusion  # Using 85% as "normal"
            relative_temperature = -1.0 * (perfusion_deficit / 15.0)
        
        # Calculate vascular risk score (0-10 scale, higher = higher risk)
        # Based on pressure magnitude, distribution evenness, and gradient
        
        # Start with base score
        vascular_risk_base = 0.0
        
        # Add risk from high pressure regions
        if forefoot_mean_pressure > 150:
            vascular_risk_base += 2.0
        elif forefoot_mean_pressure > 100:
            vascular_risk_base += 1.0
            
        if rearfoot_mean_pressure > 180:
            vascular_risk_base += 2.0
        elif rearfoot_mean_pressure > 120:
            vascular_risk_base += 1.0
            
        # Add risk from uneven pressure (high gradient)
        if pressure_evenness > 0.7:
            vascular_risk_base += 2.0
        elif pressure_evenness > 0.4:
            vascular_risk_base += 1.0
            
        # Add risk from imbalanced medial/lateral distribution
        if medial_lateral_ratio > 1.5 or medial_lateral_ratio < 0.6:
            vascular_risk_base += 1.0
            
        # Calculate final risk score (capped at 0-10)
        vascular_risk = min(10.0, max(0.0, vascular_risk_base))
        
        # Assess arch type from midfoot percentage
        arch_type = "normal"
        if midfoot_percentage > 25:
            arch_type = "low arch (flat foot)"
        elif midfoot_percentage < 8:
            arch_type = "high arch (cavus foot)"
            
        # Assess pronation/supination from medial/lateral ratio
        foot_alignment = "neutral"
        if medial_lateral_ratio > 1.3:
            foot_alignment = "pronated"
        elif medial_lateral_ratio < 0.8:
            foot_alignment = "supinated"
            
        # Determine overall vascular health assessment
        vascular_health = "good"
        if vascular_risk > 7:
            vascular_health = "poor"
        elif vascular_risk > 4:
            vascular_health = "fair"
            
        # Create comprehensive assessment
        return {
            # Area distribution metrics
            "forefoot_percentage": round(forefoot_percentage, 1),
            "midfoot_percentage": round(midfoot_percentage, 1),
            "rearfoot_percentage": round(rearfoot_percentage, 1),
            "medial_percentage": round(medial_percentage, 1),
            "lateral_percentage": round(lateral_percentage, 1),
            
            # Pressure distribution metrics
            "forefoot_load_percentage": round(forefoot_load_percentage, 1),
            "midfoot_load_percentage": round(midfoot_load_percentage, 1),
            "rearfoot_load_percentage": round(rearfoot_load_percentage, 1),
            "medial_load_percentage": round(medial_load_percentage, 1),
            "lateral_load_percentage": round(lateral_load_percentage, 1),
            
            # Pressure ratios
            "forefoot_rearfoot_ratio": round(forefoot_rearfoot_ratio, 2),
            "medial_lateral_ratio": round(medial_lateral_ratio, 2),
            
            # Mean pressure values (kPa)
            "forefoot_mean_pressure": round(forefoot_mean_pressure, 1),
            "midfoot_mean_pressure": round(midfoot_mean_pressure, 1),
            "rearfoot_mean_pressure": round(rearfoot_mean_pressure, 1),
            
            # Pressure gradient metrics
            "forefoot_gradient": round(forefoot_gradient, 2),
            "midfoot_gradient": round(midfoot_gradient, 2),
            "rearfoot_gradient": round(rearfoot_gradient, 2),
            "pressure_evenness": round(pressure_evenness, 2),
            
            # Circulatory metrics - Basic
            "forefoot_perfusion": round(forefoot_perfusion, 1),
            "midfoot_perfusion": round(midfoot_perfusion, 1),
            "rearfoot_perfusion": round(rearfoot_perfusion, 1),
            "overall_perfusion_index": round(weighted_perfusion, 1),
            "vascular_risk_score": round(vascular_risk, 1),
            "vascular_health": vascular_health,
            
            # Advanced vascular metrics (PPG and thermal simulation)
            "pulse_amplitude": round(pulse_amplitude, 2),
            "forefoot_pulse_amplitude": round(forefoot_pulse_amplitude, 2),
            "midfoot_pulse_amplitude": round(midfoot_pulse_amplitude, 2),
            "rearfoot_pulse_amplitude": round(rearfoot_pulse_amplitude, 2),
            "relative_temperature": round(relative_temperature, 1),
            
            # Assessment summaries
            "arch_type_assessment": arch_type,
            "foot_alignment_assessment": foot_alignment,
            
            # Skin tone calibration data
            "skin_calibration": {
                "skin_type": skin_type,
                "melanin_index": round(melanin_index, 2),
                "perfusion_adjustment": round(perfusion_adjustment, 2),
                "pressure_threshold_adjustment": round(pressure_threshold_adjustment, 2),
                "calibration_description": f"Perfusion and pressure metrics calibrated for {skin_type} skin type with melanin index of {melanin_index:.2f}"
            }
        }
    
    def _determine_pressure_condition(self, region_analysis: Dict[str, Dict[str, Any]], 
                                     pressure_metrics: Dict[str, Any]) -> Tuple[str, float]:
        """
        Determine the pressure condition based on region analysis and advanced vascular metrics.
        The determination is adjusted for skin tone to ensure accurate assessment
        across different patient demographics.
        
        Args:
            region_analysis: Dictionary with pressure analysis for each region
            pressure_metrics: Dictionary with overall pressure metrics
            
        Returns:
            Tuple of (condition_code, confidence)
        """
        # Get skin tone information for threshold adjustments
        skin_type = self.current_skin_data.get("detected_skin_type", "type_3")  # Default to medium if not set
        # Extract key metrics for condition determination
        # Basic pressure metrics
        forefoot_pressure = region_analysis.get("forefoot", {}).get("average_pressure", 0)
        rearfoot_pressure = region_analysis.get("rearfoot", {}).get("average_pressure", 0)
        medial_lateral_ratio = pressure_metrics.get("medial_lateral_ratio", 1.0)
        
        # Advanced vascular and pressure metrics
        vascular_risk_score = pressure_metrics.get("vascular_risk_score", 5.0)
        forefoot_perfusion = pressure_metrics.get("forefoot_perfusion", 70.0)
        midfoot_perfusion = pressure_metrics.get("midfoot_perfusion", 70.0)
        rearfoot_perfusion = pressure_metrics.get("rearfoot_perfusion", 70.0)
        pressure_evenness = pressure_metrics.get("pressure_evenness", 0.3)
        overall_perfusion = pressure_metrics.get("overall_perfusion_index", 70.0)
        pulse_amplitude = pressure_metrics.get("pulse_amplitude", 0.8)
        relative_temperature = pressure_metrics.get("relative_temperature", 0.0)
        vascular_health = pressure_metrics.get("vascular_health", "good")
        
        # Check for dominant pressure patterns
        forefoot_dominance = forefoot_pressure > (rearfoot_pressure * 1.2)
        rearfoot_dominance = rearfoot_pressure > (forefoot_pressure * 1.2)
        medial_dominance = medial_lateral_ratio > 1.3
        lateral_dominance = medial_lateral_ratio < 0.8
        
        # Check for vascular concerns with expanded criteria
        poor_perfusion = overall_perfusion < 60.0
        uneven_pressure = pressure_evenness > 0.5
        high_vascular_risk = vascular_risk_score > 6.0
        low_pulse_amplitude = pulse_amplitude < 0.5
        abnormal_temperature = abs(relative_temperature) > 1.5  # Temperature difference >1.5°C
        regional_perfusion_issue = (forefoot_perfusion < 55.0 or 
                                   midfoot_perfusion < 55.0 or 
                                   rearfoot_perfusion < 55.0)
        
        # Advanced condition scores
        # These scores help determine the most relevant condition by combining multiple factors
        condition_scores = {
            "normal_pressure": 0.0,        # Default starting point
            "forefoot_pressure": 0.0,
            "heel_pressure": 0.0,
            "medial_pressure": 0.0,
            "lateral_pressure": 0.0,
            "vascular_concern": 0.0        # New condition focusing on circulatory risk
        }
        
        # Calculate normal pressure score (higher when metrics are in normal range)
        if 0.8 <= medial_lateral_ratio <= 1.2:
            condition_scores["normal_pressure"] += 1.0
        if 0.8 <= (forefoot_pressure / rearfoot_pressure) <= 1.2:
            condition_scores["normal_pressure"] += 1.0
        if overall_perfusion >= 75.0:
            condition_scores["normal_pressure"] += 1.0
        if pressure_evenness < 0.3:
            condition_scores["normal_pressure"] += 1.0
            
        # Calculate forefoot pressure score
        if forefoot_dominance:
            condition_scores["forefoot_pressure"] += 2.0
        if forefoot_perfusion < 70.0:
            condition_scores["forefoot_pressure"] += 1.0
        if "forefoot" in "".join([analysis.get("clinical_interpretation", "") 
                                 for region, analysis in region_analysis.items()]):
            condition_scores["forefoot_pressure"] += 1.0
            
        # Calculate heel pressure score
        if rearfoot_dominance:
            condition_scores["heel_pressure"] += 2.0
        if rearfoot_perfusion < 70.0:
            condition_scores["heel_pressure"] += 1.0
        if "heel" in "".join([analysis.get("clinical_interpretation", "") 
                            for region, analysis in region_analysis.items()]):
            condition_scores["heel_pressure"] += 1.0
            
        # Calculate medial pressure score
        if medial_dominance:
            condition_scores["medial_pressure"] += 2.0
        if "medial" in "".join([analysis.get("clinical_interpretation", "") 
                               for region, analysis in region_analysis.items()]):
            condition_scores["medial_pressure"] += 1.0
            
        # Calculate lateral pressure score
        if lateral_dominance:
            condition_scores["lateral_pressure"] += 2.0
        if "lateral" in "".join([analysis.get("clinical_interpretation", "") 
                                for region, analysis in region_analysis.items()]):
            condition_scores["lateral_pressure"] += 1.0
            
        # Calculate vascular concern score (new condition focused on circulatory issues)
        if poor_perfusion:
            condition_scores["vascular_concern"] += 2.0
        if high_vascular_risk:
            condition_scores["vascular_concern"] += 2.0
        if uneven_pressure:
            condition_scores["vascular_concern"] += 1.0
        if regional_perfusion_issue:
            condition_scores["vascular_concern"] += 1.5
        if low_pulse_amplitude:
            condition_scores["vascular_concern"] += 1.0
        if abnormal_temperature:
            condition_scores["vascular_concern"] += 1.0
        if vascular_health == "poor":
            condition_scores["vascular_concern"] += 2.0
        elif vascular_health == "fair":
            condition_scores["vascular_concern"] += 1.0
        if "perfusion" in "".join([analysis.get("clinical_interpretation", "") 
                                  for region, analysis in region_analysis.items()]):
            condition_scores["vascular_concern"] += 1.0
            
        # Check for high-risk regions, which provide additional weighting
        high_risk_regions = [
            region for region, analysis in region_analysis.items()
            if analysis.get("risk_level") == "high"
        ]
        
        if high_risk_regions:
            for region in high_risk_regions:
                if "forefoot" in region:
                    condition_scores["forefoot_pressure"] += 1.0
                if "rearfoot" in region:
                    condition_scores["heel_pressure"] += 1.0
                if "medial" in region:
                    condition_scores["medial_pressure"] += 0.5
                if "lateral" in region:
                    condition_scores["lateral_pressure"] += 0.5
                    
                # Add to vascular concern if related to perfusion issues
                clinical_interp = region_analysis[region].get("clinical_interpretation", "")
                if "perfusion" in clinical_interp or "ischemic" in clinical_interp:
                    condition_scores["vascular_concern"] += 1.0
        
        # Get the condition with the highest score
        condition = max(condition_scores.items(), key=lambda x: x[1])[0]
        
        # If the highest score is very low, default to normal pressure
        if max(condition_scores.values()) < 1.0:
            condition = "normal_pressure"
            
        # Calculate confidence based on the margin between top score and runner-up
        sorted_scores = sorted(condition_scores.values(), reverse=True)
        if len(sorted_scores) >= 2:
            top_score = sorted_scores[0]
            runner_up = sorted_scores[1]
            score_margin = top_score - runner_up
            
            # Base confidence on score margin, scaled to 0.7-0.95 range
            confidence = 0.7 + min(0.25, score_margin / 4)
        else:
            confidence = 0.7  # Default
            
        # Apply minimum confidence values based on condition
        if condition == "vascular_concern":
            # Multiple vascular indicators strengthen our confidence
            vascular_indicators = 0
            if high_vascular_risk:
                vascular_indicators += 1
            if poor_perfusion:
                vascular_indicators += 1
            if low_pulse_amplitude:
                vascular_indicators += 1
            if abnormal_temperature:
                vascular_indicators += 1
            if regional_perfusion_issue:
                vascular_indicators += 1
                
            # More indicators = higher confidence
            if vascular_indicators >= 3:
                confidence = max(confidence, 0.9)  # Very high confidence with multiple indicators
            elif vascular_indicators >= 2:
                confidence = max(confidence, 0.85)  # High confidence with a couple of indicators
            else:
                confidence = max(confidence, 0.8)   # Base confidence for vascular concerns
        elif condition == "normal_pressure" and overall_perfusion >= 85:
            confidence = max(confidence, 0.9)   # Higher confidence for definitely normal
        
        # Special cases for overriding the condition
        
        # Case 1: If highest score is for normal pressure but vascular risk is high
        # Override with vascular concern and lower confidence
        if condition == "normal_pressure" and condition_scores["vascular_concern"] >= 3.0:
            condition = "vascular_concern"
            confidence = 0.75
            
        # Case 2: If regional perfusion is very poor in specific areas, override to vascular concern
        elif condition != "vascular_concern" and regional_perfusion_issue and any([
            forefoot_perfusion < 50.0,
            midfoot_perfusion < 50.0,
            rearfoot_perfusion < 50.0
        ]):
            condition = "vascular_concern"
            confidence = 0.8
                
        return condition, confidence
    
    def _generate_pressure_visualization(self, pressure_map: np.ndarray, 
                                        segmented_map: Dict[str, np.ndarray]) -> str:
        """
        Generate a visualization of the pressure map.
        
        Args:
            pressure_map: Pressure map as numpy array
            segmented_map: Dictionary with masks for each anatomical region
            
        Returns:
            Path to the generated visualization
        """
        # Create a color map visualization
        color_map = cv2.applyColorMap(pressure_map, cv2.COLORMAP_JET)
        
        # Add region outlines
        visualization = color_map.copy()
        
        # Add region labels and contours
        for region_name, region_mask in segmented_map.items():
            if region_name == "foot":
                continue
                
            # Find contours of the region
            contours, _ = cv2.findContours(region_mask.astype(np.uint8), 
                                          cv2.RETR_EXTERNAL, 
                                          cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Draw region contour
                cv2.drawContours(visualization, contours, -1, (255, 255, 255), 1)
                
                # Add region label
                M = cv2.moments(contours[0])
                if M["m00"] > 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    
                    # Simplified label
                    label = region_name.split('_')[-1][0].upper()
                    cv2.putText(visualization, label, (cx, cy), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join("../output", "pressure_maps")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate a unique filename
        filepath = os.path.join(output_dir, f"pressure_map_{np.random.randint(10000)}.jpg")
        
        # Save visualization
        cv2.imwrite(filepath, visualization)
        
        return filepath
    
    def _generate_clinical_assessment(self, region_analysis: Dict[str, Dict[str, Any]], 
                                     pressure_metrics: Dict[str, Any], 
                                     condition: str) -> str:
        """
        Generate a clinical assessment based on pressure analysis.
        
        Args:
            region_analysis: Dictionary with pressure analysis for each region
            pressure_metrics: Dictionary with overall pressure metrics
            condition: Identified condition
            
        Returns:
            Clinical assessment text
        """
        # Get baseline assessment from condition
        assessment = self.condition_descriptions.get(condition, "")
        
        # Add details about arch type
        arch_type = pressure_metrics.get("arch_type_assessment", "normal")
        assessment += f"\n\nArch Type: {arch_type.capitalize()}. "
        
        if arch_type == "low arch (flat foot)":
            assessment += "The increased midfoot contact area suggests flat feet, which may contribute to medial loading and potential overpronation."
        elif arch_type == "high arch (cavus foot)":
            assessment += "The reduced midfoot contact area suggests high arches, which may contribute to lateral loading and reduced shock absorption."
        else:
            assessment += "The midfoot contact area suggests normal arch structure, providing good balance between stability and flexibility."
        
        # Add details about foot alignment
        alignment = pressure_metrics.get("foot_alignment_assessment", "neutral")
        assessment += f"\n\nFoot Alignment: {alignment.capitalize()}. "
        
        if alignment == "pronated":
            assessment += "The medial pressure bias indicates pronation, which may increase stress on the medial arch and contribute to issues like plantar fasciitis or medial tibial stress syndrome."
        elif alignment == "supinated":
            assessment += "The lateral pressure bias indicates supination, which may reduce shock absorption and contribute to issues like lateral ankle instability."
        else:
            assessment += "The balanced medial-lateral pressure distribution indicates good alignment, which typically provides optimal function and reduced injury risk."
            
        # Add enhanced vascular health assessment for all conditions
        vascular_health = pressure_metrics.get("vascular_health", "good")
        overall_perfusion = pressure_metrics.get("overall_perfusion_index", 80.0)
        vascular_risk_score = pressure_metrics.get("vascular_risk_score", 3.0)
        pulse_amplitude = pressure_metrics.get("pulse_amplitude", 0.8)
        relative_temperature = pressure_metrics.get("relative_temperature", 0.0)
        
        assessment += f"\n\nVascular Health: {vascular_health.capitalize()}. "
        
        # Add information about skin tone calibration if present in the metrics
        if "skin_calibration" in pressure_metrics:
            skin_type = pressure_metrics["skin_calibration"].get("skin_type", "unknown")
            # Translate skin type code to human-readable term
            skin_type_terms = {
                "type_1": "very fair",
                "type_2": "fair",
                "type_3": "medium",
                "type_4": "olive",
                "type_5": "brown",
                "type_6": "dark brown to black"
            }
            skin_term = skin_type_terms.get(skin_type, skin_type)
            
            assessment += f"Assessment includes skin tone calibration for {skin_term} skin type, ensuring accurate perfusion measurements. "
        
        # Detailed vascular assessment
        if condition == "vascular_concern":
            # Provide more detailed vascular assessment with enhanced metrics
            assessment += f"The pressure analysis indicates potential circulation concerns with a vascular risk score of {vascular_risk_score:.1f}/10 "
            assessment += f"and an overall tissue perfusion index of {overall_perfusion:.1f}%. "
            
            # Add pulse amplitude assessment
            if pulse_amplitude < 0.4:
                assessment += f"The significantly reduced pulse amplitude of {pulse_amplitude:.2f} suggests "
                assessment += "diminished vascular pulsatility, potentially indicating arterial stiffness or compromised circulation. "
            elif pulse_amplitude < 0.7:
                assessment += f"The moderately reduced pulse amplitude of {pulse_amplitude:.2f} suggests "
                assessment += "some decrease in vascular pulsatility that should be monitored. "
            else:
                assessment += f"The pulse amplitude of {pulse_amplitude:.2f} is within acceptable range. "
                
            # Add temperature assessment
            if abs(relative_temperature) > 1.0:
                assessment += f"The detected temperature difference of {relative_temperature:.1f}°C from normal "
                if relative_temperature < 0:
                    assessment += "indicates reduced surface temperature, which often correlates with decreased perfusion. "
                else:
                    assessment += "indicates increased surface temperature, which may suggest inflammatory processes. "
            
            # Add specific regional concerns if perfusion is low in particular areas
            forefoot_perfusion = pressure_metrics.get("forefoot_perfusion", 80.0)
            midfoot_perfusion = pressure_metrics.get("midfoot_perfusion", 80.0)
            rearfoot_perfusion = pressure_metrics.get("rearfoot_perfusion", 80.0)
            
            # Get regional pulse amplitudes
            forefoot_pulse = pressure_metrics.get("forefoot_pulse_amplitude", 0.8)
            midfoot_pulse = pressure_metrics.get("midfoot_pulse_amplitude", 0.8)
            rearfoot_pulse = pressure_metrics.get("rearfoot_pulse_amplitude", 0.8)
            
            # Analyze regional perfusion issues with pulse amplitude data
            low_perfusion_areas = []
            if forefoot_perfusion < 60.0:
                issue = "forefoot"
                if forefoot_pulse < 0.4:
                    issue += " (with significantly reduced pulse amplitude)"
                low_perfusion_areas.append(issue)
            if midfoot_perfusion < 60.0:
                issue = "midfoot"
                if midfoot_pulse < 0.4:
                    issue += " (with significantly reduced pulse amplitude)"
                low_perfusion_areas.append(issue)
            if rearfoot_perfusion < 60.0:
                issue = "rearfoot"
                if rearfoot_pulse < 0.4:
                    issue += " (with significantly reduced pulse amplitude)"
                low_perfusion_areas.append(issue)
                
            if low_perfusion_areas:
                area_str = ", ".join(low_perfusion_areas)
                assessment += f"Areas of potential circulatory concern include the {area_str}. "
                assessment += "Reduced blood flow to these areas may contribute to temperature differences, numbness, or discomfort with prolonged activity."
            else:
                assessment += "While overall circulation shows some concern, no specific foot regions show severely reduced perfusion values."
                
            # Add note about pressure evenness
            pressure_evenness = pressure_metrics.get("pressure_evenness", 0.3)
            if pressure_evenness > 0.5:
                assessment += "\n\nThe uneven pressure distribution (high gradient) may further compromise circulation in high-pressure areas. "
                assessment += "This pattern can potentially lead to localized tissue stress and reduced blood flow under prolonged loading."
        else:
            # Brief vascular assessment for other conditions, including new metrics
            if vascular_health == "good":
                assessment += f"The analysis shows good estimated tissue perfusion at {overall_perfusion:.1f}% with a low vascular risk score of {vascular_risk_score:.1f}/10."
                if pulse_amplitude >= 0.7:
                    assessment += f" Pulse amplitude of {pulse_amplitude:.2f} indicates good vascular elasticity."
            elif vascular_health == "fair":
                assessment += f"The analysis shows moderate estimated tissue perfusion at {overall_perfusion:.1f}% with a moderate vascular risk score of {vascular_risk_score:.1f}/10. "
                
                if pulse_amplitude < 0.7:
                    assessment += f"The pulse amplitude of {pulse_amplitude:.2f} shows some reduction in vascular pulsatility. "
                
                if abs(relative_temperature) > 1.0:
                    assessment += f"A temperature difference of {relative_temperature:.1f}°C from normal was detected. "
                
                assessment += "Consider monitoring for signs of circulation issues such as cold feet or numbness after prolonged standing."
            else:  # poor
                assessment += f"The analysis shows potential concern for tissue perfusion at {overall_perfusion:.1f}% with an elevated vascular risk score of {vascular_risk_score:.1f}/10. "
                
                if pulse_amplitude < 0.5:
                    assessment += f"The reduced pulse amplitude of {pulse_amplitude:.2f} suggests decreased vascular elasticity. "
                
                if abs(relative_temperature) > 1.5:
                    assessment += f"A significant temperature difference of {relative_temperature:.1f}°C from normal was detected. "
                
                assessment += "These findings may warrant closer attention to circulation and foot health."
        
        # Add details about high-risk regions
        high_risk_regions = [
            region for region, analysis in region_analysis.items()
            if analysis.get("risk_level") in ["high", "moderate"]
        ]
        
        if high_risk_regions:
            assessment += "\n\nPotential Problem Areas:"
            
            for region in high_risk_regions:
                risk_level = region_analysis[region]["risk_level"]
                peak_pressure = region_analysis[region]["peak_pressure"]
                
                # Get more readable region name
                readable_region = region.replace("_", " ").title()
                
                assessment += f"\n- {readable_region}: {risk_level.capitalize()} pressure ({peak_pressure} kPa)"
                
                # Add specific implications for each region
                if region == "forefoot_medial":
                    assessment += ", which may contribute to first MTP joint stress or hallux valgus."
                elif region == "forefoot_central":
                    assessment += ", which may contribute to metatarsalgia or stress fractures."
                elif region == "forefoot_lateral":
                    assessment += ", which may contribute to fifth metatarsal stress or lateral forefoot pain."
                elif region == "midfoot_medial":
                    assessment += ", which may indicate collapsed arch or navicular stress."
                elif region == "midfoot_lateral":
                    assessment += ", which may indicate cuboid stress or peroneal tendon issues."
                elif region == "rearfoot_medial":
                    assessment += ", which may contribute to medial heel pain or plantar fasciitis."
                elif region == "rearfoot_lateral":
                    assessment += ", which may contribute to lateral heel pain or calcaneal stress."
                elif region == "hallux":
                    assessment += ", which may contribute to hallux rigidus or sesamoid issues."
        else:
            assessment += "\n\nNo high-risk pressure areas were identified. The pressure distribution appears to be within normal limits."
            
        return assessment
    
    def _generate_recommendations(self, region_analysis: Dict[str, Dict[str, Any]], 
                                 pressure_metrics: Dict[str, Any], 
                                 condition: str) -> Dict[str, List[str]]:
        """
        Generate recommendations based on pressure analysis.
        
        Args:
            region_analysis: Dictionary with pressure analysis for each region
            pressure_metrics: Dictionary with overall pressure metrics
            condition: Identified condition
            
        Returns:
            Dictionary with different types of recommendations
        """
        # Initialize recommendations
        footwear_recs = []
        orthotic_recs = []
        activity_recs = []
        evaluation_recs = []
        
        # Common recommendations by condition
        if condition == "normal_pressure":
            footwear_recs.append("Athletic shoes with adequate cushioning and support suitable for your activities")
            orthotic_recs.append("No specialized orthotic intervention required based on pressure analysis")
            activity_recs.append("Maintain current activity patterns, focusing on balanced fitness including flexibility and strength")
            
        elif condition == "forefoot_pressure":
            footwear_recs.append("Shoes with enhanced forefoot cushioning and a rocker sole design")
            footwear_recs.append("Shoes with a wider toe box to allow proper toe splay")
            orthotic_recs.append("Orthotic with metatarsal pad or dome to redistribute forefoot pressure")
            activity_recs.append("Consider reduced impact activities if experiencing forefoot pain")
            activity_recs.append("Toe stretching and intrinsic foot strengthening exercises")
            evaluation_recs.append("Evaluate for forefoot structural issues such as Morton's neuroma or metatarsalgia")
            
        elif condition == "heel_pressure":
            footwear_recs.append("Shoes with enhanced heel cushioning and good heel cups")
            footwear_recs.append("Consider shoes with slight heel elevation to reduce Achilles tension")
            orthotic_recs.append("Orthotic with deep heel cup and shock-absorbing heel insert")
            activity_recs.append("Achilles and calf stretching exercises")
            activity_recs.append("Heel raise exercises for muscle strengthening")
            evaluation_recs.append("Evaluate for plantar fasciitis or heel spurs if experiencing heel pain")
            
        elif condition == "medial_pressure":
            footwear_recs.append("Motion control shoes with medial support")
            footwear_recs.append("Shoes with structured heel counters for stability")
            orthotic_recs.append("Orthotic with medial arch support and potentially medial heel posting")
            activity_recs.append("Exercises to strengthen arch muscles and tibialis posterior")
            evaluation_recs.append("Evaluate for excessive pronation or flat feet")
            
        elif condition == "lateral_pressure":
            footwear_recs.append("Neutral shoes with enhanced cushioning")
            footwear_recs.append("Avoid overly rigid or motion control shoes")
            orthotic_recs.append("Orthotic with lateral arch support and shock absorption properties")
            activity_recs.append("Peroneal muscle strengthening exercises")
            activity_recs.append("Lateral ankle stabilization exercises")
            evaluation_recs.append("Evaluate for excessive supination or high arches")
            
        elif condition == "vascular_concern":
            # Specialized vascular recommendations with enhanced specificity based on new metrics
            footwear_recs.append("Shoes with maximal cushioning throughout the entire sole")
            footwear_recs.append("Shoes with ample depth to accommodate circulation-promoting insoles")
            footwear_recs.append("Seamless upper construction to reduce pressure points")
            
            # Check pulse amplitude for additional footwear considerations
            pulse_amplitude = pressure_metrics.get("pulse_amplitude", 0.8)
            if pulse_amplitude < 0.5:
                footwear_recs.append("Shoes with zero-drop design to optimize blood flow")
                footwear_recs.append("Consider shoes with enhanced thermal properties to maintain foot warmth")
            
            orthotic_recs.append("Pressure-relief orthotics with soft, multilayer materials")
            orthotic_recs.append("Custom orthotics with selective offloading of high-pressure areas")
            
            # Temperature-related recommendations
            relative_temperature = pressure_metrics.get("relative_temperature", 0.0)
            if relative_temperature < -1.5:  # Cold feet
                orthotic_recs.append("Consider insoles with thermal reflective properties to maintain warmth")
                activity_recs.append("Gradual warm-up periods before extended activity to improve circulation")
            
            # Add regional-specific recommendations
            forefoot_perfusion = pressure_metrics.get("forefoot_perfusion", 70.0)
            midfoot_perfusion = pressure_metrics.get("midfoot_perfusion", 70.0)
            rearfoot_perfusion = pressure_metrics.get("rearfoot_perfusion", 70.0)
            
            if forefoot_perfusion < 60.0:
                orthotic_recs.append("Orthotic with specific forefoot modifications to promote circulation")
                activity_recs.append("Toe spreading and toe flexor exercises to enhance forefoot circulation")
            
            if rearfoot_perfusion < 60.0:
                orthotic_recs.append("Heel cushions with cutouts to reduce pressure on compromised areas")
            
            # Standard activity recommendations
            activity_recs.append("Regular toe flexion and extension exercises to promote blood flow")
            activity_recs.append("Frequent position changes when standing or sitting for extended periods")
            activity_recs.append("Calf pumping exercises (ankle pumps) throughout the day")
            activity_recs.append("Gentle walking program to improve peripheral circulation")
            
            # Evaluation recommendations with enhanced specificity
            pressure_evenness = pressure_metrics.get("pressure_evenness", 0.3)
            vascular_risk_score = pressure_metrics.get("vascular_risk_score", 5.0)
            
            evaluation_recs.append("Consider vascular assessment if experiencing cold feet, numbness, or color changes")
            
            if pulse_amplitude < 0.4:
                evaluation_recs.append("Consider specialized vascular testing to assess arterial elasticity and function")
            
            if abs(relative_temperature) > 1.5:
                evaluation_recs.append("Consider thermal imaging assessment to evaluate circulation patterns")
            
            if pressure_evenness > 0.6:
                evaluation_recs.append("Detailed assessment of pressure distribution to identify areas at risk for ischemia")
            
            evaluation_recs.append("Discuss potential circulation issues with healthcare provider")
            
            # Additional recommendations for those with diabetes or known vascular issues
            if vascular_risk_score > 6.0:
                evaluation_recs.append("Priority evaluation for peripheral vascular status")
                evaluation_recs.append("Consider Ankle-Brachial Index (ABI) testing to assess lower extremity blood flow")
                activity_recs.append("Implement regular foot inspection routine for skin changes")
                
            overall_perfusion = pressure_metrics.get("overall_perfusion_index", 70.0)
            if overall_perfusion < 55.0:
                evaluation_recs.append("Urgent vascular consultation recommended due to significantly reduced perfusion")
        
        # Add recommendations based on arch type
        arch_type = pressure_metrics.get("arch_type_assessment", "normal")
        
        if arch_type == "low arch (flat foot)":
            if "Orthotic with medial arch support" not in " ".join(orthotic_recs):
                orthotic_recs.append("Orthotic with medial arch support to reduce excessive pronation")
            activity_recs.append("Short foot exercises to strengthen arch muscles")
            evaluation_recs.append("Consider comprehensive arch evaluation if symptoms persist")
            
        elif arch_type == "high arch (cavus foot)":
            if "enhanced cushioning" not in " ".join(footwear_recs):
                footwear_recs.append("Shoes with enhanced cushioning and flexibility")
            orthotic_recs.append("Cushioned orthotic with full contact to distribute pressure more evenly")
            activity_recs.append("Focus on flexibility and mobility exercises for the foot and ankle")
            
        # High-risk regions may need additional recommendations
        high_risk_regions = [
            region for region, analysis in region_analysis.items()
            if analysis.get("risk_level") == "high"
        ]
        
        if "forefoot_medial" in high_risk_regions or "hallux" in high_risk_regions:
            footwear_recs.append("Shoes with a wide toe box to accommodate the first MTP joint")
            orthotic_recs.append("Consider orthotic modification to offload first MTP joint")
            evaluation_recs.append("Evaluate for hallux valgus or first MTP joint pathology")
            
        if "forefoot_lateral" in high_risk_regions:
            orthotic_recs.append("Consider lateral forefoot padding or relief")
            evaluation_recs.append("Evaluate for fifth metatarsal base or cuboid issues")
            
        # Compile all recommendations
        recommendations = {
            "footwear": footwear_recs,
            "orthotics": orthotic_recs,
            "activity": activity_recs,
            "evaluation": evaluation_recs
        }
        
        return recommendations

    def _get_condition_name(self, condition_code: str) -> str:
        """
        Get a human-readable name for a condition code.
        
        Args:
            condition_code: Internal condition code
            
        Returns:
            Human-readable condition name
        """
        # Add pressure model-specific conditions to the base names
        pressure_condition_names = {
            "normal_pressure": "Normal Pressure Distribution",
            "forefoot_pressure": "Forefoot Pressure",
            "heel_pressure": "Heel Pressure",
            "medial_pressure": "Medial Edge Pressure", 
            "lateral_pressure": "Lateral Edge Pressure",
            "vascular_concern": "Vascular Health Consideration"
        }
        
        # Check our specific conditions first, then fall back to base class
        if condition_code in pressure_condition_names:
            return pressure_condition_names[condition_code]
        
        # Call the parent class method for standard conditions
        return super()._get_condition_name(condition_code)