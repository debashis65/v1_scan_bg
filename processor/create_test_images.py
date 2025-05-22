#!/usr/bin/env python3
"""
Creates simple test images for the optimized visualization generator testing.
"""

import os
import numpy as np
import cv2
import sys

def create_side_view(filename, width=800, height=600, color=(255, 255, 255)):
    """Create a sample side view image of a foot."""
    # Create a white image
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Draw a simple foot outline
    points = np.array([
        [int(width * 0.2), int(height * 0.7)],   # heel
        [int(width * 0.3), int(height * 0.8)],   # bottom of heel
        [int(width * 0.5), int(height * 0.85)],  # arch
        [int(width * 0.75), int(height * 0.8)],  # ball of foot
        [int(width * 0.85), int(height * 0.75)], # toe
        [int(width * 0.8), int(height * 0.6)],   # top of toe
        [int(width * 0.6), int(height * 0.5)],   # top of foot
        [int(width * 0.3), int(height * 0.6)]    # top of heel
    ], np.int32)
    
    # Draw filled polygon and then outline
    cv2.fillPoly(img, [points], (230, 210, 200))  # Light skin tone
    cv2.polylines(img, [points], True, (160, 140, 130), 2)
    
    # Add an arch line
    arch_start = (int(width * 0.3), int(height * 0.8))
    arch_end = (int(width * 0.75), int(height * 0.8))
    cv2.line(img, arch_start, arch_end, (100, 100, 100), 1, cv2.LINE_AA)
    
    # Add some shading for depth
    for i in range(30):
        alpha = 0.7 - (i / 60.0)
        shade_y = int(height * 0.8) - i
        cv2.line(img, 
                 (int(width * 0.3), shade_y), 
                 (int(width * 0.75), shade_y),
                 (int(220 * alpha), int(200 * alpha), int(190 * alpha)), 
                 1, cv2.LINE_AA)
    
    # Save the image
    cv2.imwrite(filename, img)
    print(f"Created {filename} ({width}x{height})")

def create_top_view(filename, width=800, height=600, color=(255, 255, 255)):
    """Create a sample top view image of a foot."""
    # Create a white image
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Draw foot outline
    points = np.array([
        [int(width * 0.3), int(height * 0.3)],   # heel
        [int(width * 0.25), int(height * 0.4)],  # inner heel
        [int(width * 0.2), int(height * 0.6)],   # inner arch
        [int(width * 0.25), int(height * 0.75)], # inner ball
        [int(width * 0.35), int(height * 0.85)], # big toe
        [int(width * 0.45), int(height * 0.8)],  # 2nd toe
        [int(width * 0.5), int(height * 0.82)],  # 3rd toe
        [int(width * 0.55), int(height * 0.8)],  # 4th toe
        [int(width * 0.6), int(height * 0.75)],  # pinky toe
        [int(width * 0.62), int(height * 0.6)],  # outer ball
        [int(width * 0.58), int(height * 0.4)],  # outer arch
        [int(width * 0.45), int(height * 0.25)]  # outer heel
    ], np.int32)
    
    # Draw filled polygon and then outline
    cv2.fillPoly(img, [points], (230, 210, 200))  # Light skin tone
    cv2.polylines(img, [points], True, (160, 140, 130), 2)
    
    # Add some texture/lines
    # Arch line
    cv2.line(img, 
             (int(width * 0.25), int(height * 0.4)), 
             (int(width * 0.58), int(height * 0.4)),
             (180, 160, 150), 1, cv2.LINE_AA)
    
    # Ball of foot line
    cv2.line(img, 
             (int(width * 0.25), int(height * 0.75)), 
             (int(width * 0.62), int(height * 0.6)),
             (180, 160, 150), 1, cv2.LINE_AA)
    
    # Save the image
    cv2.imwrite(filename, img)
    print(f"Created {filename} ({width}x{height})")

def main():
    """Create test images for optimized visualization generator."""
    # Create directories if they don't exist
    input_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "input", "sample")
    os.makedirs(input_dir, exist_ok=True)
    
    # Create left side view
    left_side_path = os.path.join(input_dir, "foot_left_side.jpg")
    create_side_view(left_side_path, 800, 600)
    
    # Create right side view - just flip the left side
    right_side_path = os.path.join(input_dir, "foot_right_side.jpg")
    left_img = cv2.imread(left_side_path)
    right_img = cv2.flip(left_img, 1)  # Flip horizontally
    cv2.imwrite(right_side_path, right_img)
    print(f"Created {right_side_path} (flipped copy of left side)")
    
    # Create top view
    top_view_path = os.path.join(input_dir, "foot_top.jpg")
    create_top_view(top_view_path, 800, 600)
    
    print("All test images created successfully!")

if __name__ == "__main__":
    main()