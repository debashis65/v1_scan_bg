#!/usr/bin/env python3
"""
Test script for the OptimizedVisualizationGenerator.

This script demonstrates how the OptimizedVisualizationGenerator works
and generates optimized versions of foot scan visualizations that show
potential improvements after applying recommended interventions.
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the OptimizedVisualizationGenerator
from optimized_visualization import OptimizedVisualizationGenerator

def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )

def main():
    """
    Test the OptimizedVisualizationGenerator with real data.
    """
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Define the output directory
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")
    
    # Define the analysis results file
    analysis_results_file = os.path.join(output_dir, "analysis_results.json")
    
    # Check if files exist
    if not os.path.exists(output_dir):
        logger.error(f"Output directory not found: {output_dir}")
        return
    
    if not os.path.exists(analysis_results_file):
        logger.error(f"Analysis results file not found: {analysis_results_file}")
        return
    
    # Create the optimization generator
    logger.info("Creating OptimizedVisualizationGenerator...")
    generator = OptimizedVisualizationGenerator(output_dir, analysis_results_file)
    
    # Generate all optimized visualizations
    logger.info("Generating optimized visualizations...")
    result_paths = generator.generate_all_optimized_visualizations()
    
    # Print results
    logger.info("Generated optimized visualizations:")
    for name, path in result_paths.items():
        logger.info(f"  {name}: {path}")
    
    # Check if optimized directory exists and has files
    optimized_dir = os.path.join(output_dir, "optimized")
    if os.path.exists(optimized_dir):
        num_files = sum(len(files) for _, _, files in os.walk(optimized_dir))
        logger.info(f"Total files in optimized directory: {num_files}")
    
    logger.info("Test completed successfully!")

if __name__ == "__main__":
    main()