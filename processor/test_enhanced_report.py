#!/usr/bin/env python3
"""
Test the enhanced diagnostic report generator with intrinsic vs extrinsic differentiation.
"""
import os
import json
import logging
from pathlib import Path
import sys
from ai_diagnosis import FootDiagnosisModel
from diagnostic_report_generator import DiagnosticReportGenerator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('TestEnhancedReport')

def main():
    # Create output directories
    output_dir = Path('../output')
    output_dir.mkdir(exist_ok=True)
    reports_dir = output_dir / 'reports'
    reports_dir.mkdir(exist_ok=True)
    
    # Find the test image directory
    script_dir = Path(os.path.dirname(os.path.realpath(__file__)))
    test_images_dir = script_dir.parent / 'input' / 'sample'
    
    # Check if test images exist
    image_paths = []
    if test_images_dir.exists():
        for img_file in test_images_dir.glob('*.jpg'):
            image_paths.append(str(img_file))
    
    if not image_paths:
        logger.warning("No test images found. Using empty list for testing.")
    
    # Create test patient context
    patient_context = {
        "age": 45,
        "weight": 80,  # kg
        "height": 175,  # cm
        "gender": "male",
        "activity_level": "moderate",
        "medical_history": ["diabetes", "foot_pain"],
        "previous_orthotics": True,
        "shoe_size": 10,
        "occupation": "office_worker"
    }
    
    # Initialize the diagnostic model
    logger.info("Initializing diagnostic model...")
    diagnosis_model = FootDiagnosisModel()
    
    # Run the analysis
    logger.info(f"Analyzing foot images with patient context...")
    analysis_results = diagnosis_model.analyze_foot_images(image_paths, patient_context)
    
    # Save the analysis results to a file
    results_path = output_dir / 'enhanced_analysis_results.json'
    with open(results_path, 'w') as f:
        json.dump(analysis_results, f, indent=2)
    logger.info(f"Analysis results saved to {results_path}")
    
    # Create visualizations paths (would be created by the real visualization generator)
    # For testing, we'll use any visualization files that might exist
    visualizations = {}
    pressure_dir = output_dir / "optimized" / "pressure_maps"
    arch_dir = output_dir / "optimized" / "arch_analysis"
    
    if pressure_dir.exists():
        pressure_files = list(pressure_dir.glob("optimized_pressure_map_*.jpg"))
        if pressure_files:
            pressure_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            visualizations['pressure_map'] = str(pressure_files[0])
    
    if arch_dir.exists():
        arch_files = list(arch_dir.glob("optimized_arch_analysis_*.jpg"))
        if arch_files:
            arch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            visualizations['arch_analysis'] = str(arch_files[0])
    
    # Generate the enhanced diagnostic report
    generator = DiagnosticReportGenerator(output_dir)
    logger.info("Generating enhanced diagnostic report...")
    report_path = generator.generate_report(
        scan_id=123,  # Test scan ID
        analysis_results_path=str(results_path),
        visualizations=visualizations
    )
    
    if report_path:
        logger.info(f"Enhanced report generated successfully: {report_path}")
        
        # Print structure summary to verify content
        with open(results_path, 'r') as f:
            data = json.load(f)
        
        # Check for structured diagnostic data
        if 'structured_diagnosis' in data:
            diag = data['structured_diagnosis']
            logger.info(f"Structured Diagnosis: Arch Type: {diag.get('arch_type')}, Arch Degree: {diag.get('arch_degree')}")
            logger.info(f"Alignment: {diag.get('alignment', {})}")
            logger.info(f"Pathologies: {', '.join(diag.get('pathologies', []))}")
        
        # Check for intrinsic vs extrinsic recommendations
        if 'recommendations' in data:
            recs = data['recommendations']
            logger.info(f"Intrinsic recommendations: {len(recs.get('intrinsic', []))}")
            logger.info(f"Extrinsic recommendations: {len(recs.get('extrinsic', []))}")
            logger.info(f"Confidence scores available: {len(recs.get('confidence_scores', {}))}")
        
        return 0
    else:
        logger.error("Failed to generate enhanced report")
        return 1

if __name__ == "__main__":
    sys.exit(main())