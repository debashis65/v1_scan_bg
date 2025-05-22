"""
Optimized Visualization Module for Barogrip Processor

This module generates "optimized" or "corrected" versions of foot scan visualizations
that show the potential improvements after applying the recommended interventions.
It creates side-by-side comparisons to help doctors visualize the potential improvements
and for patients to understand their treatment goals.
"""

import os
import json
import logging
import numpy as np
import cv2
import math
import random
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

class OptimizedVisualizationGenerator:
    """
    Generates visualizations of optimized foot scans based on recommendations.
    
    This class takes the original scan images and diagnosis results as input,
    and generates modified versions that visualize the foot with the recommended
    orthotic interventions applied.
    """
    
    def __init__(self, output_dir: str, analysis_results_path: str, input_dir: Optional[str] = None):
        """
        Initialize the optimized visualization generator.
        
        Args:
            output_dir: Directory where output files will be stored
            analysis_results_path: Path to the analysis results JSON file
            input_dir: Optional input directory with scan images
        """
        self.output_dir = Path(output_dir)
        self.analysis_results_path = analysis_results_path
        self.input_dir = input_dir
        self.optimized_dir = self.output_dir / 'optimized'
        self.optimized_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for optimized visualizations
        (self.optimized_dir / 'pressure_maps').mkdir(exist_ok=True)
        (self.optimized_dir / 'arch_analysis').mkdir(exist_ok=True)
        (self.optimized_dir / 'comparison').mkdir(exist_ok=True)
        
        # Load analysis results
        with open(analysis_results_path, 'r') as f:
            self.analysis_results = json.load(f)
        
        self.logger = logging.getLogger(__name__)
    
    def generate_all_optimized_visualizations(self) -> Dict[str, str]:
        """
        Generate all optimized visualizations and comparison images.
        
        Returns:
            Dictionary with paths to all generated visualization files
        """
        result_paths = {}
        
        # Generate optimized pressure maps
        pressure_result = self.generate_optimized_pressure_maps()
        result_paths.update(pressure_result)
        
        # Generate optimized arch analysis visualizations
        arch_result = self.generate_optimized_arch_visualizations()
        result_paths.update(arch_result)
        
        # Generate side-by-side comparisons
        comparison_result = self.generate_comparison_visualizations()
        result_paths.update(comparison_result)
        
        return result_paths
    
    def generate_optimized_pressure_maps(self) -> Dict[str, str]:
        """
        Generate optimized pressure maps based on recommendations.
        Split into left and right foot maps in professional heatmap style.
        
        Returns:
            Dictionary with paths to generated pressure map files
        """
        result_paths = {}
        pressure_dir = self.output_dir / 'pressure_maps'
        optimized_pressure_dir = self.optimized_dir / 'pressure_maps'
        
        # Find the most recent pressure map
        pressure_files = list(pressure_dir.glob('pressure_map_*.jpg'))
        if not pressure_files:
            self.logger.warning("No pressure maps found to optimize")
            # Try to use sample footer_pressure.jpg from input directory if available
            sample_path = Path(self.input_dir).parent / 'sample' / 'foot_pressure.jpg'
            if sample_path.exists():
                pressure_files = [sample_path]
            else:
                return result_paths
        
        # Sort by modification time (most recent first)
        pressure_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        latest_pressure_map = pressure_files[0]
        
        # Load the pressure map
        original_map = cv2.imread(str(latest_pressure_map))
        if original_map is None:
            self.logger.error(f"Failed to load pressure map: {latest_pressure_map}")
            return result_paths
        
        # Create optimized version of the combined map
        optimized_map = self._apply_pressure_optimization(original_map)
        
        # Split into left and right foot heatmaps
        left_foot, right_foot = self._split_into_foot_heatmaps(original_map)
        optimized_left_foot, optimized_right_foot = self._split_into_foot_heatmaps(optimized_map)
        
        # Apply professional heatmap style
        left_foot_heatmap = self._generate_professional_heatmap(left_foot, is_left=True)
        right_foot_heatmap = self._generate_professional_heatmap(right_foot, is_left=False)
        
        # Save individual foot heatmaps
        left_foot_path = optimized_pressure_dir / f"left_foot_heatmap_{random.randint(1000, 9999)}.jpg"
        right_foot_path = optimized_pressure_dir / f"right_foot_heatmap_{random.randint(1000, 9999)}.jpg"
        
        cv2.imwrite(str(left_foot_path), left_foot_heatmap)
        cv2.imwrite(str(right_foot_path), right_foot_heatmap)
        
        # Still save the full optimized map for backward compatibility
        optimized_filename = f"optimized_{latest_pressure_map.name}"
        optimized_path = optimized_pressure_dir / optimized_filename
        cv2.imwrite(str(optimized_path), optimized_map)
        
        # Add all paths to results
        result_paths['optimized_pressure_map'] = str(optimized_path)
        result_paths['left_foot_heatmap'] = str(left_foot_path)
        result_paths['right_foot_heatmap'] = str(right_foot_path)
        
        self.logger.info(f"Generated left foot heatmap: {left_foot_path}")
        self.logger.info(f"Generated right foot heatmap: {right_foot_path}")
        
        return result_paths
    
    def _apply_pressure_optimization(self, pressure_map: np.ndarray) -> np.ndarray:
        """
        Apply pressure optimization to a pressure map image.
        
        This simulates the pressure distribution after applying recommended orthotics.
        
        Args:
            pressure_map: Original pressure map as numpy array
            
        Returns:
            Optimized pressure map as numpy array
        """
        # Get recommendations from analysis results
        recommendations = self._get_orthotic_recommendations()
        
        # Create a copy of the original map
        optimized_map = pressure_map.copy()
        
        # Extract the heatmap area (assumes the heatmap is the main colored region)
        hsv = cv2.cvtColor(optimized_map, cv2.COLOR_BGR2HSV)
        
        # Mask to identify the actual foot area
        saturation_threshold = 30
        foot_mask = hsv[:, :, 1] > saturation_threshold
        
        # Apply transformations based on recommendations
        if 'arch_support' in recommendations:
            # Modify the arch area - add support by reducing pressure (changing color)
            self._modify_arch_area(optimized_map, foot_mask)
        
        if 'metatarsal_pad' in recommendations:
            # Add metatarsal pad effect
            self._add_metatarsal_pad_effect(optimized_map, foot_mask)
            
        if 'heel_cushion' in recommendations:
            # Add heel cushioning effect
            self._add_heel_cushioning(optimized_map, foot_mask)
            
        # Apply overall pressure redistribution
        optimized_map = self._redistribute_pressure(optimized_map, foot_mask, recommendations)
        
        return optimized_map
    
    def _modify_arch_area(self, image: np.ndarray, foot_mask: np.ndarray):
        """
        Modify the arch area of the foot in the pressure map.
        
        Args:
            image: Pressure map image
            foot_mask: Binary mask of the foot area
        """
        height, width = image.shape[:2]
        
        # Estimate arch region (middle third of foot, medial side)
        y_coords, x_coords = np.where(foot_mask)
        if len(y_coords) == 0 or len(x_coords) == 0:
            return
        
        min_y, max_y = np.min(y_coords), np.max(y_coords)
        min_x, max_x = np.min(x_coords), np.max(x_coords)
        
        # Define arch region
        arch_y_start = min_y + (max_y - min_y) // 3
        arch_y_end = min_y + 2 * (max_y - min_y) // 3
        arch_x_mid = min_x + (max_x - min_x) // 2
        
        # Medial side is typically inside of foot (left half for right foot, right half for left foot)
        # Check foot orientation by comparing distribution of pixels
        left_count = np.sum(foot_mask[arch_y_start:arch_y_end, min_x:arch_x_mid])
        right_count = np.sum(foot_mask[arch_y_start:arch_y_end, arch_x_mid:max_x])
        
        # Determine medial side
        if left_count > right_count:
            # Right foot (medial side is left)
            arch_x_start = min_x
            arch_x_end = arch_x_mid
        else:
            # Left foot (medial side is right)
            arch_x_start = arch_x_mid
            arch_x_end = max_x
        
        # Create arch region mask
        arch_mask = np.zeros_like(foot_mask)
        arch_mask[arch_y_start:arch_y_end, arch_x_start:arch_x_end] = 1
        arch_mask = arch_mask & foot_mask
        
        # Modify colors in the arch region to simulate arch support (reduce red, increase blue)
        # This simulates reduced pressure in arch area due to arch support
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Modify hue to shift from red/yellow toward green/blue
        # Assuming the pressure map uses a heat-like colormap
        y_indices, x_indices = np.where(arch_mask)
        for y, x in zip(y_indices, x_indices):
            # Get current HSV
            h, s, v = hsv[y, x]
            
            # Shift hue toward blue/green (lower pressure)
            # Hue is 0-180 in OpenCV (0=red, 60=yellow, 120=green)
            new_h = min(h + 30, 120)  # Shift toward green but not beyond
            
            hsv[y, x, 0] = new_h
        
        # Convert back to BGR
        image[:] = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def _add_metatarsal_pad_effect(self, image: np.ndarray, foot_mask: np.ndarray):
        """
        Add metatarsal pad effect to the pressure map.
        
        Args:
            image: Pressure map image
            foot_mask: Binary mask of the foot area
        """
        height, width = image.shape[:2]
        
        # Estimate metatarsal region (anterior third of foot)
        y_coords, x_coords = np.where(foot_mask)
        if len(y_coords) == 0 or len(x_coords) == 0:
            return
        
        min_y, max_y = np.min(y_coords), np.max(y_coords)
        min_x, max_x = np.min(x_coords), np.max(x_coords)
        
        # Define metatarsal region (anterior third)
        meta_y_start = min_y + 2 * (max_y - min_y) // 3
        meta_y_end = max_y
        meta_x_start = min_x
        meta_x_end = max_x
        
        # Create metatarsal region mask
        meta_mask = np.zeros_like(foot_mask)
        meta_mask[meta_y_start:meta_y_end, meta_x_start:meta_x_end] = 1
        meta_mask = meta_mask & foot_mask
        
        # Modify pressure distribution in metatarsal area
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        y_indices, x_indices = np.where(meta_mask)
        for y, x in zip(y_indices, x_indices):
            # Get current HSV
            h, s, v = hsv[y, x]
            
            # Adjust hue to distribute pressure more evenly
            # This simulates the effect of a metatarsal pad
            center_x = (meta_x_start + meta_x_end) // 2
            center_y = (meta_y_start + meta_y_end) // 2
            
            # Calculate distance from center of metatarsal area
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            max_dist = np.sqrt((meta_x_end - center_x)**2 + (meta_y_end - center_y)**2)
            
            # Adjust hue based on distance from center
            # Center area gets more green/blue (lower pressure)
            dist_factor = dist / max_dist
            hue_shift = int(30 * (1 - dist_factor))
            new_h = min(h + hue_shift, 120)  # Shift toward green but not beyond
            
            hsv[y, x, 0] = new_h
        
        # Convert back to BGR
        image[:] = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def _add_heel_cushioning(self, image: np.ndarray, foot_mask: np.ndarray):
        """
        Add heel cushioning effect to the pressure map.
        
        Args:
            image: Pressure map image
            foot_mask: Binary mask of the foot area
        """
        height, width = image.shape[:2]
        
        # Estimate heel region (posterior third of foot)
        y_coords, x_coords = np.where(foot_mask)
        if len(y_coords) == 0 or len(x_coords) == 0:
            return
        
        min_y, max_y = np.min(y_coords), np.max(y_coords)
        min_x, max_x = np.min(x_coords), np.max(x_coords)
        
        # Define heel region (posterior third)
        heel_y_start = min_y
        heel_y_end = min_y + (max_y - min_y) // 3
        heel_x_start = min_x
        heel_x_end = max_x
        
        # Create heel region mask
        heel_mask = np.zeros_like(foot_mask)
        heel_mask[heel_y_start:heel_y_end, heel_x_start:heel_x_end] = 1
        heel_mask = heel_mask & foot_mask
        
        # Modify pressure distribution in heel area
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        y_indices, x_indices = np.where(heel_mask)
        for y, x in zip(y_indices, x_indices):
            # Get current HSV
            h, s, v = hsv[y, x]
            
            # For heel cushioning, we want to evenly distribute pressure
            # Reduce high-pressure areas (red/yellow) and make more uniform
            if h < 30:  # Red to orange range
                new_h = min(h + 20, 120)  # Shift toward yellow/green
                hsv[y, x, 0] = new_h
        
        # Convert back to BGR
        image[:] = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def _redistribute_pressure(self, image: np.ndarray, foot_mask: np.ndarray, 
                             recommendations: Dict[str, Any]) -> np.ndarray:
        """
        Redistribute pressure across the foot based on recommendations.
        
        Args:
            image: Pressure map image
            foot_mask: Binary mask of the foot area
            recommendations: Dictionary of recommendations
            
        Returns:
            Modified pressure map with redistributed pressure
        """
        # Convert to HSV for easier color manipulation
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Create a smoother pressure distribution
        # This simulates the effect of proper orthotic support
        
        # Get the hue channel (represents pressure levels)
        hue = hsv[:, :, 0].copy()
        
        # Create a smoothed version of the hue channel
        blurred_hue = cv2.GaussianBlur(hue, (15, 15), 0)
        
        # Blend original and smoothed hue to create more even distribution
        alpha = 0.6  # Blending factor (higher = more smoothing)
        hue[foot_mask] = (1 - alpha) * hue[foot_mask] + alpha * blurred_hue[foot_mask]
        
        # Ensure the overall color range is preserved
        # But distribute the pressure more evenly
        if foot_mask.any():
            # Get original hue statistics
            original_hue = hsv[:, :, 0][foot_mask]
            original_min, original_max = np.min(original_hue), np.max(original_hue)
            original_range = original_max - original_min
            
            # Adjust the new hue to maintain similar overall pressure
            # but with more even distribution
            new_hue = hue[foot_mask]
            new_min, new_max = np.min(new_hue), np.max(new_hue)
            new_range = new_max - new_min
            
            # Scale to match original range
            if new_range > 0:
                scale_factor = original_range / new_range
                new_hue = (new_hue - new_min) * scale_factor + original_min
                hue[foot_mask] = new_hue
        
        # Update the hue channel
        hsv[:, :, 0] = hue
        
        # Convert back to BGR
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    
    def generate_optimized_arch_visualizations(self) -> Dict[str, str]:
        """
        Generate optimized arch visualizations based on recommendations.
        
        Returns:
            Dictionary with paths to generated arch visualization files
        """
        result_paths = {}
        arch_dir = self.output_dir / 'arch_analysis'
        optimized_arch_dir = self.optimized_dir / 'arch_analysis'
        
        # Find the most recent arch analysis
        arch_files = list(arch_dir.glob('arch_analysis_*.jpg'))
        if not arch_files:
            self.logger.warning("No arch analysis images found to optimize")
            return result_paths
        
        # Sort by modification time (most recent first)
        arch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        latest_arch_analysis = arch_files[0]
        
        # Load the arch analysis image
        original_arch = cv2.imread(str(latest_arch_analysis))
        if original_arch is None:
            self.logger.error(f"Failed to load arch analysis: {latest_arch_analysis}")
            return result_paths
        
        # Create optimized version
        optimized_arch = self._apply_arch_optimization(original_arch)
        
        # Save optimized arch analysis
        optimized_filename = f"optimized_{latest_arch_analysis.name}"
        optimized_path = optimized_arch_dir / optimized_filename
        cv2.imwrite(str(optimized_path), optimized_arch)
        
        result_paths['optimized_arch_analysis'] = str(optimized_path)
        return result_paths
    
    def _apply_arch_optimization(self, arch_image: np.ndarray) -> np.ndarray:
        """
        Apply arch optimization to an arch analysis image.
        
        This simulates the arch shape after applying recommended orthotic interventions.
        
        Args:
            arch_image: Original arch analysis image as numpy array
            
        Returns:
            Optimized arch analysis image as numpy array
        """
        # Create a copy of the original image
        optimized_arch = arch_image.copy()
        
        # Get arch type from analysis results
        arch_type = self._get_arch_type()
        
        # Extract arch outline and landmarks
        arch_mask, landmarks = self._extract_arch_outline(optimized_arch)
        
        if arch_type == "flatfoot" or arch_type == "low_arch":
            # For flatfoot, simulate raising the arch
            self._raise_arch(optimized_arch, arch_mask, landmarks)
        elif arch_type == "high_arch":
            # For high arch, simulate better distribution
            self._lower_arch(optimized_arch, arch_mask, landmarks)
        elif arch_type == "neutral":
            # For neutral arch, make minor adjustments for optimal support
            self._optimize_neutral_arch(optimized_arch, arch_mask, landmarks)
        
        return optimized_arch
    
    def _extract_arch_outline(self, image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Tuple[int, int]]]:
        """
        Extract the arch outline and key landmarks from the arch analysis image.
        
        Args:
            image: Arch analysis image
            
        Returns:
            Tuple containing:
                - Binary mask of the arch outline
                - Dictionary of key landmarks
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Threshold to get footprint outline
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Get the largest contour (foot outline)
        if not contours:
            return np.zeros_like(gray), {}
        
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Create mask from the contour
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [largest_contour], 0, (255, 255, 255), -1)
        
        # Extract key landmarks (simplified)
        # Find extreme points
        leftmost = tuple(largest_contour[largest_contour[:, :, 0].argmin()][0])
        rightmost = tuple(largest_contour[largest_contour[:, :, 0].argmax()][0])
        topmost = tuple(largest_contour[largest_contour[:, :, 1].argmin()][0])
        bottommost = tuple(largest_contour[largest_contour[:, :, 1].argmax()][0])
        
        # Create landmarks dictionary
        landmarks = {
            'heel': bottommost,
            'toe': topmost,
            'lateral': rightmost,
            'medial': leftmost
        }
        
        # Estimate arch point (midpoint between heel and toe, shifted toward medial side)
        mid_y = (topmost[1] + bottommost[1]) // 2
        arch_x = (leftmost[0] + (rightmost[0] - leftmost[0]) // 3)  # Biased toward medial side
        landmarks['arch'] = (arch_x, mid_y)
        
        return mask, landmarks
    
    def _raise_arch(self, image: np.ndarray, arch_mask: np.ndarray, landmarks: Dict[str, Tuple[int, int]]):
        """
        Modify the arch image to simulate raising the arch (for flatfoot/low arch).
        
        Args:
            image: Arch analysis image
            arch_mask: Binary mask of the arch
            landmarks: Dictionary of key landmarks
        """
        if 'arch' not in landmarks or 'heel' not in landmarks or 'toe' not in landmarks:
            return
        
        arch_point = landmarks['arch']
        heel_point = landmarks['heel']
        toe_point = landmarks['toe']
        
        # Define arch region
        arch_y_start = arch_point[1] - 20
        arch_y_end = arch_point[1] + 20
        
        # Get the medial border points in the arch region
        medial_border = []
        for y in range(arch_y_start, arch_y_end):
            row = arch_mask[y, :]
            if np.any(row):
                x_coords = np.where(row)[0]
                medial_x = np.min(x_coords)  # Leftmost point
                medial_border.append((medial_x, y))
        
        if not medial_border:
            return
        
        # Draw a new arch line
        # Original image
        overlay = image.copy()
        
        # Define the extent of arch correction
        correction_extent = 15  # pixels to raise arch
        
        # Get center of arch region
        arch_center_y = (arch_y_start + arch_y_end) // 2
        
        # Draw the "optimized" arch curve (higher arch)
        # Find points along the original arch
        for x, y in medial_border:
            # Calculate distance from arch center (normalized)
            dist_from_center = abs(y - arch_center_y) / (arch_y_end - arch_y_start)
            
            # Adjust more at center, less at edges
            adjustment = int(correction_extent * (1 - dist_from_center))
            
            # Draw new arch point (moved inward/laterally)
            new_x = x + adjustment
            cv2.circle(overlay, (new_x, y), 2, (0, 255, 0), -1)
        
        # Connect points with a smooth curve
        # Sort points by y-coordinate
        sorted_points = sorted([(x+int(correction_extent*(1-abs(y-arch_center_y)/(arch_y_end-arch_y_start))), y) 
                              for x, y in medial_border], key=lambda p: p[1])
        
        if len(sorted_points) > 1:
            # Convert to numpy array for drawing
            curve_points = np.array(sorted_points, dtype=np.int32)
            
            # Draw the smooth curve
            cv2.polylines(overlay, [curve_points], False, (0, 255, 0), 2)
            
            # Add arrows indicating the correction
            for i, (x, y) in enumerate(medial_border):
                if i % 3 == 0:  # Add arrows at every 3rd point
                    new_x = x + int(correction_extent * (1 - abs(y - arch_center_y) / (arch_y_end - arch_y_start)))
                    cv2.arrowedLine(overlay, (x, y), (new_x, y), (0, 0, 255), 1, tipLength=0.3)
        
        # Add transparent overlay
        alpha = 0.7
        image[:] = cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)
        
        # Add text explaining the correction
        cv2.putText(image, "Optimized Arch Support", (landmarks['arch'][0] - 70, landmarks['arch'][1] - 30), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
    
    def _lower_arch(self, image: np.ndarray, arch_mask: np.ndarray, landmarks: Dict[str, Tuple[int, int]]):
        """
        Modify the arch image to simulate lowering the arch (for high arch).
        
        Args:
            image: Arch analysis image
            arch_mask: Binary mask of the arch
            landmarks: Dictionary of key landmarks
        """
        if 'arch' not in landmarks or 'heel' not in landmarks or 'toe' not in landmarks:
            return
        
        arch_point = landmarks['arch']
        heel_point = landmarks['heel']
        toe_point = landmarks['toe']
        
        # Define arch region
        arch_y_start = arch_point[1] - 20
        arch_y_end = arch_point[1] + 20
        
        # Get the medial border points in the arch region
        medial_border = []
        for y in range(arch_y_start, arch_y_end):
            row = arch_mask[y, :]
            if np.any(row):
                x_coords = np.where(row)[0]
                medial_x = np.min(x_coords)  # Leftmost point
                medial_border.append((medial_x, y))
        
        if not medial_border:
            return
        
        # Draw a new arch line
        # Original image
        overlay = image.copy()
        
        # Define the extent of arch correction
        correction_extent = 15  # pixels to lower arch
        
        # Get center of arch region
        arch_center_y = (arch_y_start + arch_y_end) // 2
        
        # Draw the "optimized" arch curve (lower arch)
        # Find points along the original arch
        for x, y in medial_border:
            # Calculate distance from arch center (normalized)
            dist_from_center = abs(y - arch_center_y) / (arch_y_end - arch_y_start)
            
            # Adjust more at center, less at edges
            adjustment = int(correction_extent * (1 - dist_from_center))
            
            # Draw new arch point (moved outward/medially)
            new_x = x - adjustment
            cv2.circle(overlay, (new_x, y), 2, (0, 255, 0), -1)
        
        # Connect points with a smooth curve
        # Sort points by y-coordinate
        sorted_points = sorted([(x-int(correction_extent*(1-abs(y-arch_center_y)/(arch_y_end-arch_y_start))), y) 
                              for x, y in medial_border], key=lambda p: p[1])
        
        if len(sorted_points) > 1:
            # Convert to numpy array for drawing
            curve_points = np.array(sorted_points, dtype=np.int32)
            
            # Draw the smooth curve
            cv2.polylines(overlay, [curve_points], False, (0, 255, 0), 2)
            
            # Add arrows indicating the correction
            for i, (x, y) in enumerate(medial_border):
                if i % 3 == 0:  # Add arrows at every 3rd point
                    new_x = x - int(correction_extent * (1 - abs(y - arch_center_y) / (arch_y_end - arch_y_start)))
                    cv2.arrowedLine(overlay, (x, y), (new_x, y), (0, 0, 255), 1, tipLength=0.3)
        
        # Add transparent overlay
        alpha = 0.7
        image[:] = cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)
        
        # Add text explaining the correction
        cv2.putText(image, "Optimized Arch Support", (landmarks['arch'][0] - 70, landmarks['arch'][1] - 30), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
    
    def _optimize_neutral_arch(self, image: np.ndarray, arch_mask: np.ndarray, landmarks: Dict[str, Tuple[int, int]]):
        """
        Modify the arch image to optimize a neutral arch.
        
        Args:
            image: Arch analysis image
            arch_mask: Binary mask of the arch
            landmarks: Dictionary of key landmarks
        """
        # For neutral arch, just add annotations showing optimal support areas
        if 'arch' not in landmarks:
            return
        
        arch_point = landmarks['arch']
        
        # Draw support areas
        overlay = image.copy()
        
        # Add circles indicating key support areas
        cv2.circle(overlay, arch_point, 15, (0, 255, 0), 2)
        
        if 'heel' in landmarks:
            heel_point = landmarks['heel']
            cv2.circle(overlay, heel_point, 15, (0, 255, 0), 2)
        
        if 'toe' in landmarks and 'heel' in landmarks:
            toe_point = landmarks['toe']
            heel_point = landmarks['heel']
            
            # Find metatarsal heads (estimated position)
            meta_y = toe_point[1] + (heel_point[1] - toe_point[1]) // 4
            if 'lateral' in landmarks and 'medial' in landmarks:
                lateral_point = landmarks['lateral']
                medial_point = landmarks['medial']
                
                # Find lateral and medial metatarsal heads
                lateral_meta = (lateral_point[0], meta_y)
                medial_meta = (medial_point[0], meta_y)
                
                # Draw metatarsal support
                cv2.circle(overlay, lateral_meta, 10, (0, 255, 0), 2)
                cv2.circle(overlay, medial_meta, 10, (0, 255, 0), 2)
        
        # Add transparent overlay
        alpha = 0.7
        image[:] = cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)
        
        # Add text
        cv2.putText(image, "Optimal Support Areas", (arch_point[0] - 70, arch_point[1] - 30), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
    
    def generate_comparison_visualizations(self) -> Dict[str, str]:
        """
        Generate side-by-side comparison visualizations.
        
        Returns:
            Dictionary with paths to generated comparison files
        """
        result_paths = {}
        comparison_dir = self.optimized_dir / 'comparison'
        
        # Find the most recent pressure map and its optimized version
        pressure_files = list((self.output_dir / 'pressure_maps').glob('pressure_map_*.jpg'))
        optimized_pressure_files = list((self.optimized_dir / 'pressure_maps').glob('optimized_pressure_map_*.jpg'))
        
        if pressure_files and optimized_pressure_files:
            # Sort by modification time (most recent first)
            pressure_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            optimized_pressure_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            
            # Create pressure map comparison
            pressure_comparison_path = self._create_side_by_side_comparison(
                str(pressure_files[0]), 
                str(optimized_pressure_files[0]),
                str(comparison_dir / "pressure_comparison.jpg"),
                "Current Pressure Distribution",
                "Optimized Pressure Distribution"
            )
            
            if pressure_comparison_path:
                result_paths['pressure_comparison'] = pressure_comparison_path
        
        # Find the most recent arch analysis and its optimized version
        arch_files = list((self.output_dir / 'arch_analysis').glob('arch_analysis_*.jpg'))
        optimized_arch_files = list((self.optimized_dir / 'arch_analysis').glob('optimized_arch_analysis_*.jpg'))
        
        if arch_files and optimized_arch_files:
            # Sort by modification time (most recent first)
            arch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            optimized_arch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            
            # Create arch analysis comparison
            arch_comparison_path = self._create_side_by_side_comparison(
                str(arch_files[0]), 
                str(optimized_arch_files[0]),
                str(comparison_dir / "arch_comparison.jpg"),
                "Current Arch Structure",
                "Optimized Arch Support"
            )
            
            if arch_comparison_path:
                result_paths['arch_comparison'] = arch_comparison_path
        
        return result_paths
    
    def _create_side_by_side_comparison(self, image1_path: str, image2_path: str, 
                                      output_path: str, label1: str, label2: str) -> Optional[str]:
        """
        Create a side-by-side comparison of two images.
        
        Args:
            image1_path: Path to first image
            image2_path: Path to second image
            output_path: Path to save comparison image
            label1: Label for first image
            label2: Label for second image
            
        Returns:
            Path to comparison image or None if failed
        """
        # Load images
        image1 = cv2.imread(image1_path)
        image2 = cv2.imread(image2_path)
        
        if image1 is None or image2 is None:
            self.logger.error(f"Failed to load images for comparison: {image1_path}, {image2_path}")
            return None
        
        # Resize to the same height if needed
        height1, width1 = image1.shape[:2]
        height2, width2 = image2.shape[:2]
        
        target_height = max(height1, height2)
        
        if height1 != target_height:
            scale_factor = target_height / height1
            image1 = cv2.resize(image1, (int(width1 * scale_factor), target_height))
        
        if height2 != target_height:
            scale_factor = target_height / height2
            image2 = cv2.resize(image2, (int(width2 * scale_factor), target_height))
        
        # Get dimensions after potential resize
        height1, width1 = image1.shape[:2]
        height2, width2 = image2.shape[:2]
        
        # Create a new image for the side-by-side comparison
        # Add a gap between images and space for title
        gap = 30
        title_height = 40
        comparison = np.ones((target_height + title_height, width1 + width2 + gap, 3), dtype=np.uint8) * 255
        
        # Add the images
        comparison[title_height:title_height+height1, 0:width1] = image1
        comparison[title_height:title_height+height2, width1+gap:width1+gap+width2] = image2
        
        # Add titles
        cv2.putText(comparison, label1, (width1//2 - 80, 25), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(comparison, label2, (width1 + gap + width2//2 - 80, 25), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2, cv2.LINE_AA)
        
        # Add vertical separator line
        cv2.line(comparison, (width1 + gap//2, 0), (width1 + gap//2, target_height + title_height), 
                (0, 0, 0), 1, cv2.LINE_AA)
        
        # Save comparison image
        cv2.imwrite(output_path, comparison)
        
        return output_path
    
    def _get_arch_type(self) -> str:
        """
        Get the arch type from analysis results.
        
        Returns:
            String representing the arch type
        """
        try:
            # Navigate the analysis results JSON structure to find arch type
            # This will need to be adapted to match your specific JSON structure
            arch_info = self.analysis_results.get("arch_analysis", {})
            arch_type = arch_info.get("arch_type", {}).get("classification", "neutral")
            return arch_type
        except (KeyError, TypeError) as e:
            self.logger.warning(f"Error extracting arch type: {e}")
            return "neutral"  # Default to neutral if not found
    
    def _get_orthotic_recommendations(self) -> Dict[str, Any]:
        """
        Extract orthotic recommendations from analysis results.
        
        Returns:
            Dictionary of orthotic recommendations
        """
        recommendations = {}
        
        try:
            # Extract recommendations from analysis results
            treatment_recs = self.analysis_results.get("arch_analysis", {}).get("treatment_recommendations", {})
            
            # Extract orthotic recommendations
            orthotics = treatment_recs.get("orthotics", [])
            
            # Parse orthotic recommendations
            for rec in orthotics:
                if "arch support" in rec.lower():
                    recommendations["arch_support"] = True
                if "metatarsal" in rec.lower() and "pad" in rec.lower():
                    recommendations["metatarsal_pad"] = True
                if "heel" in rec.lower() and ("cushion" in rec.lower() or "cup" in rec.lower()):
                    recommendations["heel_cushion"] = True
                if "lateral posting" in rec.lower():
                    recommendations["lateral_posting"] = True
                if "medial posting" in rec.lower():
                    recommendations["medial_posting"] = True
            
            # If no specific recommendations found, use defaults based on arch type
            if not recommendations:
                arch_type = self._get_arch_type()
                if arch_type == "flatfoot" or arch_type == "low_arch":
                    recommendations["arch_support"] = True
                    recommendations["medial_posting"] = True
                elif arch_type == "high_arch":
                    recommendations["heel_cushion"] = True
                    recommendations["metatarsal_pad"] = True
                else:  # neutral
                    recommendations["arch_support"] = True
        
        except (KeyError, TypeError) as e:
            self.logger.warning(f"Error extracting recommendations: {e}")
            # Set default recommendations
            recommendations = {
                "arch_support": True,
                "heel_cushion": True
            }
        
        return recommendations
        
    def _split_into_foot_heatmaps(self, pressure_map: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Split a combined pressure map into left and right foot heatmaps.
        
        Args:
            pressure_map: The combined pressure map image
            
        Returns:
            Tuple containing left foot and right foot images
        """
        # In a real implementation, this would use advanced image processing 
        # to separate the feet. For this demo, we'll simulate by splitting the image.
        h, w = pressure_map.shape[:2]
        mid_point = w // 2
        
        # For demo purposes, we'll just split the image in half or copy it
        if w > h * 1.5:
            # Wide image - likely has both feet, so split
            left_foot = pressure_map[:, :mid_point].copy()
            right_foot = pressure_map[:, mid_point:].copy()
        else:
            # Single foot image - use as both left and right for demonstration
            left_foot = pressure_map.copy()
            right_foot = cv2.flip(pressure_map.copy(), 1)  # Flip horizontally for right foot
            
        return left_foot, right_foot
    
    def _generate_professional_heatmap(self, foot_image: np.ndarray, is_left: bool = True) -> np.ndarray:
        """
        Generate a professional-looking heatmap visualization for foot pressure in clinical style.
        Matches the format shown in the reference image (image2.png).
        
        Args:
            foot_image: The foot pressure data image
            is_left: Whether this is the left foot (True) or right foot (False)
            
        Returns:
            A clinically styled foot pressure heatmap visualization
        """
        # Convert to grayscale if not already
        if len(foot_image.shape) == 3:
            gray = cv2.cvtColor(foot_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = foot_image.copy()
        
        # Normalize values
        normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
        
        # Apply Gaussian blur to smooth the data
        blurred = cv2.GaussianBlur(normalized, (15, 15), 0)
        
        # Create binary mask of foot shape
        _, binary = cv2.threshold(normalized, 30, 255, cv2.THRESH_BINARY)
        
        # Find contours to get foot outline
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            self.logger.warning("No contours found in foot image for heatmap")
            return foot_image  # Return original if no contours found
        
        # Get the largest contour (foot shape)
        foot_contour = max(contours, key=cv2.contourArea)
        
        # Create a mask from the contour
        mask = np.zeros_like(gray)
        cv2.drawContours(mask, [foot_contour], 0, 255, -1)
        
        # Apply mask to original image to isolate foot
        masked_image = cv2.bitwise_and(blurred, blurred, mask=mask)
        
        # Calculate the bounding box of the foot
        x, y, w, h = cv2.boundingRect(foot_contour)
        
        # Crop to foot area with small padding
        padding = 10
        y1 = max(0, y - padding)
        y2 = min(masked_image.shape[0], y + h + padding)
        x1 = max(0, x - padding)
        x2 = min(masked_image.shape[1], x + w + padding)
        cropped = masked_image[y1:y2, x1:x2]
        
        # Create a clinical heatmap with matplotlib
        plt.figure(figsize=(10, 24))
        plt.imshow(cropped, cmap='jet')
        plt.axis('off')
        
        # Create an empty mask for the outline with blue border
        outline_mask = np.zeros_like(cropped)
        
        # Draw dilated outline of foot
        cropped_binary = binary[y1:y2, x1:x2]
        kernel = np.ones((5, 5), np.uint8)
        dilated = cv2.dilate(cropped_binary, kernel, iterations=1)
        edge = dilated - cropped_binary
        outline_mask[edge > 0] = 255
        
        # Draw the blue outline around the foot shape
        plt.contour(outline_mask, levels=[128], colors='blue', linewidths=3)
        
        # Add the central line
        # Find centerline of foot
        indices = np.column_stack(np.where(cropped_binary > 0))
        if len(indices) > 0:
            # Get the average x-coordinate for each y-coordinate
            y_values = np.unique(indices[:, 0])
            centers = []
            for y_val in y_values:
                x_vals = indices[indices[:, 0] == y_val, 1]
                if len(x_vals) > 0:
                    centers.append((y_val, int(np.mean(x_vals))))
            
            if centers:
                # Extract coordinates for the centerline
                y_center = [p[0] for p in centers]
                x_center = [p[1] for p in centers]
                
                # Smooth the centerline
                if len(y_center) > 5:  # Need enough points to smooth
                    x_center_smooth = np.array(x_center)
                    # Use a moving average to smooth the line
                    window_size = 7
                    x_center_smooth = np.convolve(x_center_smooth, np.ones(window_size)/window_size, mode='valid')
                    y_center_smooth = y_center[window_size-1:len(y_center)]
                    
                    # Draw the centerline
                    plt.plot(x_center_smooth, y_center_smooth, 'w--', linewidth=1.5)
                else:
                    # Not enough points for smoothing, use original
                    plt.plot(x_center, y_center, 'w--', linewidth=1.5)
                
                # Add 'M' label for medial side (similar to reference)
                mid_index = len(y_center) // 2
                if mid_index < len(y_center):
                    if is_left:
                        plt.text(x_center[mid_index] + 15, y_center[mid_index], 'M', 
                                color='white', fontsize=12, weight='bold')
                    else:
                        plt.text(x_center[mid_index] - 25, y_center[mid_index], 'M', 
                                color='white', fontsize=12, weight='bold')
        
        # Save figure to a temporary file
        temp_file = f"/tmp/foot_heatmap_{random.randint(1000, 9999)}.png"
        plt.savefig(temp_file, bbox_inches='tight', pad_inches=0, dpi=100)
        plt.close()
        
        # Read back the image with OpenCV
        heatmap = cv2.imread(temp_file)
        
        # Add a title
        title = "Left Foot Pressure Map" if is_left else "Right Foot Pressure Map"
        font = cv2.FONT_HERSHEY_SIMPLEX
        heatmap_with_title = cv2.copyMakeBorder(heatmap, 40, 0, 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        cv2.putText(heatmap_with_title, title, (10, 30), font, 0.8, (0, 0, 0), 2)
        
        return heatmap_with_title

def main():
    """
    Main entry point for the optimized visualization generator.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate optimized foot scan visualizations.")
    parser.add_argument("--output-dir", default="../output", help="Directory containing analysis results and where to save optimized visualizations")
    parser.add_argument("--analysis-file", default="../output/analysis_results.json", help="Path to analysis results JSON file")
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, 
                       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Create and run the visualization generator
    generator = OptimizedVisualizationGenerator(args.output_dir, args.analysis_file)
    result_paths = generator.generate_all_optimized_visualizations()
    
    # Print results
    print("Generated optimized visualizations:")
    for name, path in result_paths.items():
        print(f"  {name}: {path}")

if __name__ == "__main__":
    main()