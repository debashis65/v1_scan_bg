import os
import numpy as np
import cv2
import random

# Create directories
os.makedirs('input/sample', exist_ok=True)
os.makedirs('output', exist_ok=True)

# Create sample foot images with different views
def create_sample_foot_image(filename, width, height, color=(255, 255, 255)):
    # Create a blank image with the specified color
    image = np.ones((height, width, 3), np.uint8) * np.array(color, dtype=np.uint8)
    
    # Add noise texture first (for high Laplacian variance)
    noise = np.zeros((height, width, 3), np.uint8)
    for i in range(3):
        noise[:,:,i] = np.random.randint(0, 30, (height, width)).astype(np.uint8)
    image = cv2.add(image, noise)
    
    # Add some shading to make it more realistic
    center_x, center_y = width // 2, height // 2
    for y in range(height):
        for x in range(width):
            # Calculate distance from center
            dx, dy = x - center_x, y - center_y
            distance = np.sqrt(dx**2 + dy**2)
            
            # Add shading based on distance
            shade = max(0, min(1, 1 - distance / (width/2)))
            image[y, x] = image[y, x] * shade
    
    # Add foot-like shape
    foot_color = (180, 140, 100)
    
    if 'dorsal' in filename:
        # Top view of foot
        pts = np.array([[width//4, height//4], 
                         [3*width//4, height//4],
                         [3*width//4, 3*height//4],
                         [width//2, 7*height//8],
                         [width//4, 3*height//4]], np.int32)
        cv2.fillPoly(image, [pts], foot_color)
        
        # Add toes
        for i in range(5):
            toe_x = width//4 + i * width//10
            toe_y = height//4
            toe_radius = width//30
            cv2.circle(image, (toe_x, toe_y), toe_radius, (150, 120, 90), -1)
        
        # Add arch lines
        for i in range(5):
            y_offset = height//3 + i * height//15
            cv2.line(image, (width//4, y_offset), (3*width//4, y_offset), (100, 80, 60), 2)
            
    elif 'lateral' in filename:
        # Outside side view
        pts = np.array([[width//4, height//3], 
                         [3*width//4, height//3],
                         [3*width//4, 2*height//3],
                         [width//4, 2*height//3]], np.int32)
        cv2.fillPoly(image, [pts], foot_color)
        
        # Add arch curve
        cv2.ellipse(image, (width//2, 2*height//3), (width//4, height//6), 
                    0, 180, 360, (130, 100, 70), 2)
        
        # Add ankle
        cv2.circle(image, (width//4, height//3), width//10, (160, 120, 90), -1)
        
    elif 'medial' in filename:
        # Inside side view
        pts = np.array([[width//4, height//3], 
                         [3*width//4, height//3],
                         [3*width//4, 2*height//3],
                         [width//4, 2*height//3]], np.int32)
        cv2.fillPoly(image, [pts], foot_color)
        
        # Add prominent arch
        cv2.ellipse(image, (width//2, 2*height//3), (width//3, height//4), 
                   0, 180, 360, (130, 100, 70), 2)
        
        # Add ankle details
        cv2.circle(image, (width//4, height//3), width//10, (160, 120, 90), -1)
        cv2.ellipse(image, (width//4 + width//15, height//3), (width//20, height//15), 
                   0, 0, 360, (140, 110, 80), 2)
        
    elif 'posterior' in filename:
        # Back view
        pts = np.array([[width//3, height//4], 
                         [2*width//3, height//4],
                         [2*width//3, 3*height//4],
                         [width//3, 3*height//4]], np.int32)
        cv2.fillPoly(image, [pts], foot_color)
        
        # Add heel details
        cv2.ellipse(image, (width//2, 3*height//4), (width//6, height//12), 
                    0, 0, 180, (150, 110, 80), -1)
        
        # Add Achilles tendon
        cv2.line(image, (width//2, height//4), (width//2, height//8), (160, 120, 90), 5)
        
    elif 'anterior' in filename:
        # Front view
        pts = np.array([[width//3, height//4], 
                         [2*width//3, height//4],
                         [3*width//4, height//2],
                         [2*width//3, 3*height//4],
                         [width//3, 3*height//4],
                         [width//4, height//2]], np.int32)
        cv2.fillPoly(image, [pts], foot_color)
        
        # Add toes
        for i in range(5):
            toe_x = width//3 + i * width//15
            toe_y = height//4
            toe_w = width//25
            toe_h = height//15
            cv2.ellipse(image, (toe_x, toe_y), (toe_w, toe_h), 0, 0, 360, (150, 120, 90), -1)
    
    # Add high-contrast edges to increase Laplacian variance
    edges = cv2.Canny(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 50, 150)
    for i in range(3):
        image[:,:,i] = cv2.addWeighted(image[:,:,i], 1, edges, 0.3, 0)
    
    # Add random lines for texture and detail
    for _ in range(50):
        pt1 = (random.randint(0, width), random.randint(0, height))
        pt2 = (random.randint(0, width), random.randint(0, height))
        color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        cv2.line(image, pt1, pt2, color, 1)
    
    # Add text to indicate the view
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(image, os.path.basename(filename).split('.')[0], 
                (10, 30), font, 1, (0, 0, 0), 2, cv2.LINE_AA)
    
    # Save the image
    cv2.imwrite(filename, image)
    
    # Calculate Laplacian variance (blurriness test)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    print(f"Created {filename} ({width}x{height}) - Laplacian variance: {laplacian_var:.1f}")

# Create each view
create_sample_foot_image('input/sample/1_dorsal.jpg', 500, 500)      # Top view
create_sample_foot_image('input/sample/2_lateral.jpg', 500, 500)     # Outside view
create_sample_foot_image('input/sample/3_medial.jpg', 500, 500)      # Inside view
create_sample_foot_image('input/sample/4_posterior.jpg', 500, 500)   # Back view
create_sample_foot_image('input/sample/5_anterior.jpg', 500, 500)    # Front view

print("All sample images created successfully")