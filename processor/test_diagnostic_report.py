#!/usr/bin/env python3

import os
import logging
import sys
from pathlib import Path
from diagnostic_report_generator import DiagnosticReportGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    # Get current directory and setup paths
    script_dir = Path(os.path.dirname(os.path.realpath(__file__)))
    output_dir = script_dir.parent / "output"
    
    if not output_dir.exists():
        logger.error(f"Output directory does not exist: {output_dir}")
        return False
    
    # Path to analysis results
    analysis_file = output_dir / "analysis_results.json"
    if not analysis_file.exists():
        logger.error(f"Analysis results file not found: {analysis_file}")
        return False
    
    # Find visualization files
    visualizations = {}
    pressure_map_path = None
    arch_analysis_path = None
    
    # Look for the latest optimized visualizations
    pressure_dir = output_dir / "optimized" / "pressure_maps"
    arch_dir = output_dir / "optimized" / "arch_analysis"
    
    if pressure_dir.exists():
        pressure_files = list(pressure_dir.glob("optimized_pressure_map_*.jpg"))
        if pressure_files:
            pressure_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            pressure_map_path = str(pressure_files[0])
            visualizations['pressure_map'] = pressure_map_path
    
    if arch_dir.exists():
        arch_files = list(arch_dir.glob("optimized_arch_analysis_*.jpg"))
        if arch_files:
            arch_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            arch_analysis_path = str(arch_files[0])
            visualizations['arch_analysis'] = arch_analysis_path
    
    # Also check for comparison visualizations
    comparison_dir = output_dir / "optimized" / "comparison"
    if comparison_dir.exists():
        pressure_comparison = comparison_dir / "pressure_comparison.jpg"
        arch_comparison = comparison_dir / "arch_comparison.jpg"
        
        if pressure_comparison.exists():
            visualizations['pressure_comparison'] = str(pressure_comparison)
        if arch_comparison.exists():
            visualizations['arch_comparison'] = str(arch_comparison)
    
    # Generate the report
    generator = DiagnosticReportGenerator(output_dir)
    report_path = generator.generate_report(
        scan_id=1, 
        analysis_results_path=str(analysis_file),
        visualizations=visualizations
    )
    
    if report_path:
        logger.info(f"Report generated successfully: {report_path}")
        return True
    else:
        logger.error("Failed to generate report")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)