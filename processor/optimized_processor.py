import os
import sys
import json
import time
import logging
import shutil
import tempfile
import threading
import concurrent.futures
import multiprocessing
import numpy as np
import cv2
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests

from ai_diagnosis import FootDiagnosisModel

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('processor.log')
    ]
)

logger = logging.getLogger('Barogrip-Processor')

class OptimizedScanProcessor:
    def __init__(self, input_dir: str, output_dir: str, api_url: str):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.api_url = api_url
        self.diagnosis_model = FootDiagnosisModel()
        
        # Create directories if they don't exist
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache for processed scans
        self.scan_cache = {}
        
        # Thread pool for parallel processing
        max_workers = max(2, multiprocessing.cpu_count() - 1)
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
        
        logger.info(f"OptimizedScanProcessor initialized with input_dir={input_dir}, output_dir={output_dir}, api_url={api_url}, workers={max_workers}")
    
    def _fetch_patient_data(self, scan_id: int) -> Dict[str, Any]:
        """
        Fetch patient data for the given scan from the database via API.
        
        Args:
            scan_id: The database ID of the scan
            
        Returns:
            Dictionary with patient context data
        """
        try:
            logger.info(f"Fetching patient data for scan {scan_id}")
            
            # Request patient data from the backend
            response = requests.get(
                f"{self.api_url}/api/processor/patient-data/{scan_id}",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch patient data: HTTP {response.status_code}")
                return {}
                
            patient_data = response.json()
            logger.info(f"Successfully fetched patient data for scan {scan_id}")
            
            # Convert to the format expected by the AI diagnosis model
            patient_context = {
                "age": patient_data.get("age", None),
                "gender": patient_data.get("gender", "unknown"),
                "height": patient_data.get("height", None),  # in cm
                "weight": patient_data.get("weight", None),  # in kg
                "activity_level": "moderate",  # Default activity level
                "medical_history": [],
                "previous_orthotics": patient_data.get("usedOrthopedicInsoles", False),
            }
            
            # Add any medical conditions to medical history
            if patient_data.get("hasDiabetes", False):
                patient_context["medical_history"].append("diabetes")
            
            if patient_data.get("hasHeelSpur", False):
                patient_context["medical_history"].append("heel spur")
                
            if patient_data.get("footPain"):
                patient_context["medical_history"].append(f"foot pain: {patient_data.get('footPain')}")
            
            return patient_context
            
        except Exception as e:
            logger.error(f"Error fetching patient data for scan {scan_id}: {str(e)}")
            return {}  # Return empty dict on error, which will trigger default context in AI diagnosis
    
    def process_scan(self, scan_id: int, image_paths: List[str]) -> bool:
        """
        Process a foot scan using the provided images.
        
        Args:
            scan_id: The database ID of the scan
            image_paths: List of paths to foot images
            
        Returns:
            bool: True if processing was successful, False otherwise
        """
        try:
            logger.info(f"Processing scan {scan_id} with {len(image_paths)} images")
            
            # Update status to processing
            self._update_status(scan_id, "processing", "Starting optimized image processing...")
            
            # Fetch patient data from the database
            patient_context = self._fetch_patient_data(scan_id)
            
            # Create a temporary working directory for this scan
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Create scan output directory
                scan_output_dir = self.output_dir / f"scan_{scan_id}"
                scan_output_dir.mkdir(parents=True, exist_ok=True)
                
                # Preprocess and optimize images in parallel
                preprocessed_images = self._preprocess_images(image_paths, temp_path)
                if not preprocessed_images:
                    self._update_status(scan_id, "error", f"Failed to preprocess images")
                    return False
                
                # Update status to photogrammetry phase
                self._update_status(scan_id, "processing", "Running optimized photogrammetry analysis...")
                
                # Run optimized photogrammetry
                photogrammetry_future = self.executor.submit(
                    self._run_optimized_photogrammetry,
                    preprocessed_images,
                    scan_output_dir,
                    scan_id
                )
                
                # While photogrammetry is running, start AI analysis in parallel
                self._update_status(scan_id, "analyzing", "Running AI diagnosis in parallel...")
                
                # Run AI diagnosis on preprocessed images, passing the patient context
                diagnosis_future = self.executor.submit(
                    self.diagnosis_model.analyze_foot_images,
                    preprocessed_images,
                    patient_context
                )
                
                # Wait for photogrammetry to complete
                photogrammetry_result = photogrammetry_future.result()
                if not photogrammetry_result["success"]:
                    logger.error(f"Photogrammetry failed for scan {scan_id}: {photogrammetry_result['error']}")
                    self._update_status(scan_id, "error", f"Photogrammetry failed: {photogrammetry_result['error']}")
                    return False
                
                # Update status to 3D model generation phase
                self._update_status(scan_id, "generating_model", "Creating 3D model files...")
                
                # Generate 3D files using the photogrammetry result
                obj_path = scan_output_dir / f"model.obj"
                stl_path = scan_output_dir / f"model.stl"
                thumbnail_path = scan_output_dir / f"thumbnail.jpg"
                
                # Build 3D models from sparse point cloud
                model_success = self._generate_optimized_3d_models(
                    photogrammetry_result["point_cloud"],
                    obj_path,
                    stl_path,
                    thumbnail_path
                )
                
                if not model_success:
                    logger.error(f"3D model generation failed for scan {scan_id}")
                    self._update_status(scan_id, "error", "Failed to generate 3D models")
                    return False
                
                # Wait for AI diagnosis to complete
                diagnosis_result = diagnosis_future.result()
                
                # Create public URLs that will be served through our Express static middleware
                obj_url = f"/api/files/output/scan_{scan_id}/model.obj"
                stl_url = f"/api/files/output/scan_{scan_id}/model.stl"
                thumbnail_url = f"/api/files/output/scan_{scan_id}/thumbnail.jpg"
                
                # Update status and notify backend of completion
                self._update_status(scan_id, "complete", "Processing complete. Finalizing results...")
                logger.info(f"Notifying backend of scan {scan_id} completion")
                
                # Check if notification was successful
                notification_success = self._notify_backend_completion(
                    scan_id, 
                    obj_url, 
                    stl_url, 
                    thumbnail_url, 
                    diagnosis_result
                )
                
                # Cache the results for future use
                self.scan_cache[scan_id] = {
                    "obj_url": obj_url,
                    "stl_url": stl_url,
                    "thumbnail_url": thumbnail_url,
                    "diagnosis_result": diagnosis_result,
                    "completed_at": time.time()
                }
                
                if notification_success:
                    logger.info(f"Scan {scan_id} processed and notification sent successfully")
                    return True
                else:
                    logger.warning(f"Scan {scan_id} processed but failed to notify backend. Results saved to cache.")
                    return True
                
        except Exception as e:
            logger.error(f"Error processing scan {scan_id}: {str(e)}", exc_info=True)
            self._update_status(scan_id, "error", f"Processing error: {str(e)}")
            return False
    
    def _preprocess_images(self, image_paths: List[str], output_dir: Path) -> List[str]:
        """
        Preprocess images for optimal photogrammetry performance.
        
        Args:
            image_paths: List of paths to foot images
            output_dir: Directory to store preprocessed images
            
        Returns:
            List of paths to preprocessed images
        """
        logger.info(f"Preprocessing {len(image_paths)} images")
        
        preprocessed_paths = []
        futures = []
        
        # Submit all image preprocessing tasks to thread pool
        for i, img_path in enumerate(image_paths):
            output_path = output_dir / f"preprocessed_{i}.jpg"
            futures.append(
                self.executor.submit(
                    self._preprocess_single_image,
                    img_path,
                    output_path
                )
            )
        
        # Collect results
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result["success"]:
                preprocessed_paths.append(result["path"])
            else:
                logger.error(f"Failed to preprocess image: {result['error']}")
        
        logger.info(f"Preprocessing complete, {len(preprocessed_paths)} images processed")
        return preprocessed_paths
    
    def _preprocess_single_image(self, input_path: str, output_path: Path) -> Dict[str, Any]:
        """
        Preprocess a single image for optimal quality.
        
        Args:
            input_path: Path to input image
            output_path: Path to save preprocessed image
            
        Returns:
            Dictionary with preprocessing result
        """
        try:
            # Check if input file exists
            input_path_obj = Path(input_path)
            if not input_path_obj.exists():
                return {"success": False, "error": f"Image file not found: {input_path}"}
            
            # Read image
            img = cv2.imread(str(input_path_obj))
            if img is None:
                return {"success": False, "error": f"Failed to read image: {input_path}"}
            
            # Apply preprocessing steps for better photogrammetry results
            
            # 1. Resize to reasonable dimensions if too large
            h, w = img.shape[:2]
            if max(h, w) > 2048:
                scale = 2048 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
            # 2. Apply contrast enhancement
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge((l, a, b))
            img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            
            # 3. Apply mild sharpening
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            img = cv2.filter2D(img, -1, kernel)
            
            # 4. Denoise if needed
            img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
            
            # 5. Save with optimized quality
            cv2.imwrite(str(output_path), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            return {"success": True, "path": str(output_path)}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_optimized_photogrammetry(self, image_paths: List[str], output_dir: Path, scan_id: int) -> Dict[str, Any]:
        """
        Run optimized photogrammetry on the preprocessed images.
        
        Optimizations:
        1. Uses incremental SfM instead of global SfM for faster processing
        2. Applies feature culling to reduce noise
        3. Uses adaptive densification based on image quality
        4. Implements parallel processing for feature extraction
        
        Args:
            image_paths: List of paths to preprocessed images
            output_dir: Directory to store output files
            scan_id: Scan ID for logging
            
        Returns:
            Dictionary with photogrammetry results
        """
        logger.info(f"Running optimized photogrammetry for scan {scan_id}")
        
        try:
            # In a real implementation, you would call optimized Meshroom with:
            # meshroom_batch --input "{','.join(image_paths)}" --output "{output_dir}" --paramOverrides "{optimization_params}"
            
            # For this example, we'll simulate the processing with a shorter delay
            logger.info(f"Optimized photogrammetry in progress for scan {scan_id}...")
            time.sleep(2)  # Simulate faster processing time
            
            # Generate a simulated sparse point cloud
            point_cloud = self._generate_simulated_point_cloud()
            
            logger.info(f"Optimized photogrammetry complete for scan {scan_id}")
            return {
                "success": True,
                "point_cloud": point_cloud
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_simulated_point_cloud(self):
        """Generate a simulated point cloud for testing."""
        # In a real implementation, this would be the output from Meshroom
        # Here we just create a foot-shaped point cloud
        
        # Create a foot-shaped point cloud
        points = []
        
        # Generate heel points
        for i in range(100):
            x = np.random.normal(-0.5, 0.5)
            y = np.random.normal(0, 0.25)
            z = np.random.normal(-1.5, 0.25)
            points.append((x, y, z))
            
        # Generate arch points
        for i in range(150):
            x = np.random.normal(-0.7, 0.7)
            y = np.random.normal(0.2, 0.2)
            z = np.random.normal(-0.5, 0.3)
            points.append((x, y, z))
            
        # Generate midfoot points
        for i in range(200):
            x = np.random.normal(-0.9, 0.9)
            y = np.random.normal(0.3, 0.2)
            z = np.random.normal(0.5, 0.3)
            points.append((x, y, z))
            
        # Generate forefoot points
        for i in range(150):
            x = np.random.normal(-0.7, 0.7)
            y = np.random.normal(0.4, 0.2)
            z = np.random.normal(1.5, 0.25)
            points.append((x, y, z))
            
        # Generate toe points
        for i in range(100):
            x = np.random.normal(-0.2, 0.2)
            y = np.random.normal(0.3, 0.15)
            z = np.random.normal(2.5, 0.2)
            points.append((x, y, z))
            
        return np.array(points)
    
    def _generate_optimized_3d_models(self, point_cloud, obj_path, stl_path, thumbnail_path):
        """
        Generate optimized 3D models from point cloud data.
        
        Uses:
        1. Poisson surface reconstruction for smoother mesh
        2. Optimized decimation to reduce file size while preserving detail
        3. Progressive processing for faster results
        
        Args:
            point_cloud: 3D point cloud data
            obj_path: Path to output OBJ file
            stl_path: Path to output STL file
            thumbnail_path: Path to output thumbnail
            
        Returns:
            Boolean indicating success
        """
        try:
            # In a real implementation, you would:
            # 1. Use PyMeshLab or Open3D for point cloud to mesh conversion
            # 2. Optimize the mesh (decimate, smooth)
            # 3. Export to OBJ and STL formats
            
            # For this example, we'll create simplified OBJ/STL files
            
            # Create an improved OBJ file
            with open(obj_path, 'w') as f:
                f.write("# Optimized foot model\n")
                f.write("mtllib foot.mtl\n")
                f.write("o Foot\n")
                
                # Write vertices
                for i, (x, y, z) in enumerate(point_cloud):
                    f.write(f"v {x:.6f} {y:.6f} {z:.6f}\n")
                
                # Create faces using triangulation
                # Simple triangulation for this example
                num_points = len(point_cloud)
                for i in range(num_points - 50):
                    if i % 50 < 48:  # Avoid connecting across the foot
                        f.write(f"f {i+1} {i+2} {i+51}\n")
                        f.write(f"f {i+2} {i+52} {i+51}\n")
            
            # Create a corresponding STL file (binary format would be used in production)
            with open(stl_path, 'w') as f:
                f.write("solid OptimizedFootScan\n")
                
                # Write a subset of triangles
                for i in range(min(1000, len(point_cloud) - 50)):
                    if i % 50 < 48:
                        # First triangle
                        p1 = point_cloud[i]
                        p2 = point_cloud[i+1]
                        p3 = point_cloud[i+50]
                        
                        # Calculate normal
                        v1 = p2 - p1
                        v2 = p3 - p1
                        normal = np.cross(v1, v2)
                        normal = normal / np.linalg.norm(normal)
                        
                        f.write(f"  facet normal {normal[0]:.6f} {normal[1]:.6f} {normal[2]:.6f}\n")
                        f.write("    outer loop\n")
                        f.write(f"      vertex {p1[0]:.6f} {p1[1]:.6f} {p1[2]:.6f}\n")
                        f.write(f"      vertex {p2[0]:.6f} {p2[1]:.6f} {p2[2]:.6f}\n")
                        f.write(f"      vertex {p3[0]:.6f} {p3[1]:.6f} {p3[2]:.6f}\n")
                        f.write("    endloop\n")
                        f.write("  endfacet\n")
                        
                        # Second triangle
                        p1 = point_cloud[i+1]
                        p2 = point_cloud[i+51]
                        p3 = point_cloud[i+50]
                        
                        # Calculate normal
                        v1 = p2 - p1
                        v2 = p3 - p1
                        normal = np.cross(v1, v2)
                        normal = normal / np.linalg.norm(normal)
                        
                        f.write(f"  facet normal {normal[0]:.6f} {normal[1]:.6f} {normal[2]:.6f}\n")
                        f.write("    outer loop\n")
                        f.write(f"      vertex {p1[0]:.6f} {p1[1]:.6f} {p1[2]:.6f}\n")
                        f.write(f"      vertex {p2[0]:.6f} {p2[1]:.6f} {p2[2]:.6f}\n")
                        f.write(f"      vertex {p3[0]:.6f} {p3[1]:.6f} {p3[2]:.6f}\n")
                        f.write("    endloop\n")
                        f.write("  endfacet\n")
                
                f.write("endsolid OptimizedFootScan\n")
            
            # Create a thumbnail using the 3D model
            img = np.ones((400, 200, 3), dtype=np.uint8) * 255
            
            # Draw an improved foot outline
            cv2.ellipse(img, (100, 350), (50, 40), 0, 0, 180, (120, 120, 120), 2)
            
            # Outside edge
            pts_outside = np.array([[50, 350], [40, 250], [45, 150], [60, 80], [80, 50]], np.int32)
            cv2.polylines(img, [pts_outside], False, (120, 120, 120), 2)
            
            # Inside edge
            pts_inside = np.array([[150, 350], [145, 250], [135, 180], [110, 120], [110, 50]], np.int32)
            cv2.polylines(img, [pts_inside], False, (120, 120, 120), 2)
            
            # Connect toe
            cv2.line(img, (80, 50), (110, 50), (120, 120, 120), 2)
            
            # Add arch shading
            cv2.ellipse(img, (95, 240), (40, 70), 0, 180, 360, (200, 200, 200), -1)
            
            # Add 3D effect
            for y in range(50, 350):
                alpha = (y - 50) / 300.0
                x_left = int(50 + 30 * (1 - alpha))
                x_right = int(150 - 40 * (1 - alpha))
                thickness = max(1, int(3 * alpha))
                color = (int(120 + 80 * alpha), int(120 + 80 * alpha), int(120 + 80 * alpha))
                cv2.line(img, (x_left, y), (x_right, y), color, thickness)
            
            # Add text
            cv2.putText(img, "Barogrip 3D", (40, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
            cv2.putText(img, "Optimized", (40, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
            
            # Save the image
            cv2.imwrite(str(thumbnail_path), img)
            
            logger.info(f"Created optimized 3D model files")
            return True
            
        except Exception as e:
            logger.error(f"Error creating optimized 3D files: {str(e)}", exc_info=True)
            return False
    
    def _update_status(self, scan_id: int, status: str, message: str):
        """Update the scan status on the backend via API."""
        try:
            payload = {
                "scanId": scan_id,
                "status": status,
                "message": message
            }
            
            logger.info(f"Updating scan {scan_id} status to '{status}': {message}")
            
            # Send request to backend via API
            response = requests.post(
                f"{self.api_url}/api/processor/scan-status",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to update scan status: HTTP {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error updating scan status: {str(e)}")
            # Continue processing even if status update fails
    
    def _notify_backend_completion(self, scan_id, obj_url, stl_url, thumbnail_url, diagnosis_result, retry_count=0, max_retries=3):
        """Notify the backend that processing is complete."""
        try:
            # Create payload with enhanced diagnosis structure
            payload = {
                "scanId": scan_id,
                "objUrl": obj_url,
                "stlUrl": stl_url,
                "thumbnailUrl": thumbnail_url,
                "aiResults": diagnosis_result,
                # Include the enhanced structured diagnosis and recommendations if available
                "structuredDiagnosis": diagnosis_result.get("structured_diagnosis"),
                "orthoticRecommendations": diagnosis_result.get("recommendations")
            }
            
            response = requests.post(
                f"{self.api_url}/api/processor/scan-complete",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                logger.info(f"Backend notification successful for scan {scan_id}")
                return True
            else:
                logger.warning(f"Failed to notify backend: HTTP {response.status_code}")
                
                # Retry logic
                if retry_count < max_retries:
                    retry_delay = 2 ** retry_count
                    logger.info(f"Retrying in {retry_delay} seconds (attempt {retry_count+1}/{max_retries})")
                    time.sleep(retry_delay)
                    return self._notify_backend_completion(
                        scan_id, obj_url, stl_url, thumbnail_url, 
                        diagnosis_result, retry_count + 1, max_retries
                    )
                else:
                    logger.error(f"Failed to notify backend after {max_retries} attempts")
                    return False
                
        except Exception as e:
            logger.error(f"Error notifying backend: {str(e)}")
            
            # Retry logic
            if retry_count < max_retries:
                retry_delay = 2 ** retry_count
                logger.info(f"Retrying in {retry_delay} seconds (attempt {retry_count+1}/{max_retries})")
                time.sleep(retry_delay)
                return self._notify_backend_completion(
                    scan_id, obj_url, stl_url, thumbnail_url, 
                    diagnosis_result, retry_count + 1, max_retries
                )
            else:
                logger.error(f"Failed to notify backend after {max_retries} attempts")
                return False
    
    def cleanup_old_cache(self, max_age_hours=24):
        """Clean up old cache entries to prevent memory leaks."""
        current_time = time.time()
        keys_to_remove = []
        
        for scan_id, entry in self.scan_cache.items():
            age_hours = (current_time - entry["completed_at"]) / 3600
            if age_hours > max_age_hours:
                keys_to_remove.append(scan_id)
        
        for key in keys_to_remove:
            del self.scan_cache[key]
            
        logger.info(f"Cleaned up {len(keys_to_remove)} old cache entries")