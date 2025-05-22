#!/usr/bin/env python3
"""
Test the enhanced FootDiagnosisModel with structured diagnosis and orthotic recommendations.
"""
import os
import json
import logging
from pathlib import Path
from ai_diagnosis import FootDiagnosisModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('TestEnhancedDiagnosis')

def main():
    """
    Test the enhanced FootDiagnosisModel with structured diagnosis and orthotic recommendations.
    """
    logger.info("Testing enhanced FootDiagnosisModel with structured diagnosis and orthotic recommendations")
    
    # Initialize the model
    logger.info("Initializing FootDiagnosisModel")
    model = FootDiagnosisModel()
    
    # Get sample images from the input directory
    input_dir = Path("../input/sample")
    image_paths = []
    
    if input_dir.exists():
        for file in input_dir.glob("*.jpg"):
            image_paths.append(str(file))
            
        for file in input_dir.glob("*.png"):
            image_paths.append(str(file))
            
    if not image_paths:
        logger.warning("No images found in input directory, using a placeholder image path")
        image_paths = ["test_image.jpg"]
    
    # Run analysis
    logger.info(f"Analyzing {len(image_paths)} images")
    result = model.analyze_foot_images(image_paths)
    
    # Output the diagnosis results
    logger.info("\nDiagnosis Results:")
    logger.info(f"Primary Diagnosis: {result['diagnosis']} (Confidence: {result['confidence']:.2f})")
    logger.info(f"Assessment: {result['assessment']}")
    
    # Check for enhanced structured diagnosis
    if 'structured_diagnosis' in result:
        diag = result['structured_diagnosis']
        logger.info("\nEnhanced Structured Diagnosis:")
        logger.info(f"  Arch Type: {diag['arch_type']} (Degree: {diag['arch_degree']})")
        logger.info("  Alignment:")
        logger.info(f"    Forefoot: {diag['alignment']['forefoot']}")
        logger.info(f"    Midfoot: {diag['alignment']['midfoot']}")
        logger.info(f"    Hindfoot: {diag['alignment']['hindfoot']}")
        logger.info(f"  Detected Pathologies: {', '.join(diag['pathologies']) if diag['pathologies'] else 'None'}")
    else:
        logger.error("No structured_diagnosis found in results!")
    
    # Check for orthotic recommendations
    if 'recommendations' in result:
        recs = result['recommendations']
        logger.info("\nOrthotic Recommendations:")
        if recs['orthotic_addons']:
            for addon in recs['orthotic_addons']:
                full_name = recs.get('abbreviation_map', {}).get(addon.split(' ')[0], '')
                logger.info(f"  • {addon}{f' ({full_name})' if full_name else ''}")
        else:
            logger.info("  No specific orthotic add-ons recommended")
    else:
        logger.error("No recommendations found in results!")
    
    # Save result to file for examination
    output_dir = Path(".")
    output_file = output_dir / "enhanced_diagnosis_test_result.json"
    
    logger.info(f"\nSaving results to {output_file}")
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    logger.info("Test complete")

if __name__ == "__main__":
    main()