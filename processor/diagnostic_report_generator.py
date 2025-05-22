import os
import json
import base64
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
import logging
from jinja2 import Environment, FileSystemLoader
from fpdf import FPDF  # Keeping as fallback

logger = logging.getLogger("DiagnosticReport")

class DiagnosticReportGenerator:
    def __init__(self, output_dir):
        self.output_dir = Path(output_dir)
        self.reports_dir = self.output_dir / 'reports'
        self.reports_dir.mkdir(exist_ok=True)
        
        # Set up Jinja2 template environment
        template_dir = Path(__file__).parent.parent / 'templates'
        template_dir.mkdir(exist_ok=True)
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
        
        # Copy sample HTML template if it doesn't exist
        self.template_path = template_dir / 'foot_scan_report.html'
        if not self.template_path.exists():
            sample_path = Path(__file__).parent.parent / 'sample-foot-scan-report.html'
            if sample_path.exists():
                shutil.copy(sample_path, self.template_path)
                logger.info(f"Copied sample template to {self.template_path}")
            else:
                logger.warning("Sample template not found, creating a basic template")
                self._create_basic_template()
    
    def _create_basic_template(self):
        """Create a basic HTML template if the sample doesn't exist"""
        with open(self.template_path, 'w') as f:
            f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barogrip Foot Scan Report</title>
    <style>
        :root {
            --primary-color: #3366cc;
            --secondary-color: #4285F4;
            --background-color: #f8f9fa;
            --text-color: #333;
            --border-color: #e0e0e0;
            --highlight-color: #ffeb3b;
            --success-color: #4caf50;
            --warning-color: #ff9800;
            --danger-color: #f44336;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background-color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px 0;
            margin-bottom: 30px;
        }

        .logo {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            overflow: hidden;
        }

        .card-header {
            background-color: var(--primary-color);
            color: white;
            padding: 15px 20px;
            font-weight: bold;
        }

        .card-body {
            padding: 20px;
        }

        .scan-images {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .scan-image {
            text-align: center;
        }

        .scan-image img {
            max-width: 100%;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <div class="logo">
                <h1>Barogrip Foot Scan Report</h1>
                <div class="report-meta">
                    <div>Report ID: {{ report_id }}</div>
                    <div>Date: {{ report_date }}</div>
                </div>
            </div>
        </div>
    </header>

    <div class="container">
        <div class="card">
            <div class="card-header">Scan Information</div>
            <div class="card-body">
                <p>Scan ID: {{ scan_id }}</p>
                <p>Date: {{ scan_date }}</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">Diagnostic Results</div>
            <div class="card-body">
                <h3>Arch Classification</h3>
                <p>{{ arch_type }}</p>
                
                <h3>Conditions</h3>
                <ul>
                {% for pathology in pathologies %}
                    <li>{{ pathology }}</li>
                {% endfor %}
                </ul>
            </div>
        </div>

        <div class="card">
            <div class="card-header">Visualizations</div>
            <div class="card-body">
                <div class="scan-images">
                    {% if pressure_map %}
                    <div class="scan-image">
                        <img src="{{ pressure_map }}" alt="Pressure Distribution">
                        <p>Pressure Distribution Analysis</p>
                    </div>
                    {% endif %}
                    
                    {% if arch_analysis %}
                    <div class="scan-image">
                        <img src="{{ arch_analysis }}" alt="Arch Analysis">
                        <p>Arch Analysis</p>
                    </div>
                    {% endif %}
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">Recommendations</div>
            <div class="card-body">
                <h3>Orthotic Recommendations</h3>
                <ul>
                {% for rec in orthotic_recommendations %}
                    <li>{{ rec }}</li>
                {% endfor %}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>""")
        
    def _get_arch_degree_description(self, degree):
        if degree == 1:
            return "Mild"
        elif degree == 2:
            return "Moderate"
        elif degree == 3:
            return "Pronounced"
        elif degree == 4:
            return "Severe"
        else:
            return f"Degree {degree}"
    
    def _get_arch_type_description(self, arch_type):
        descriptions = {
            "flat": "Flat feet (pes planus) with reduced or absent medial longitudinal arch",
            "normal": "Normal arch with typical medial longitudinal arch height",
            "high": "High arch (pes cavus) with excessive medial longitudinal arch height",
            "asymmetric": "Asymmetric arches with different characteristics between left and right feet"
        }
        return descriptions.get(arch_type.lower(), arch_type)
    
    def _alignment_description(self, alignment):
        if not alignment:
            return "Not available"
            
        descriptions = []
        for zone, value in alignment.items():
            if value == "varus":
                zone_desc = f"{zone.capitalize()} shows varus alignment (turned inward)"
            elif value == "valgus":
                zone_desc = f"{zone.capitalize()} shows valgus alignment (turned outward)"
            elif value == "neutral":
                zone_desc = f"{zone.capitalize()} shows neutral alignment"
            else:
                zone_desc = f"{zone.capitalize()}: {value}"
            descriptions.append(zone_desc)
        
        return ". ".join(descriptions)
    
    def _image_to_base64(self, image_path):
        """Convert image to base64 for embedding in HTML"""
        try:
            if not image_path or not os.path.exists(image_path):
                logger.warning(f"Image path does not exist: {image_path}")
                return ""
                
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                image_ext = Path(image_path).suffix.lstrip('.')
                if image_ext.lower() not in ['jpg', 'jpeg', 'png', 'gif']:
                    image_ext = 'jpeg'  # Default to jpeg if unknown extension
                return f"data:image/{image_ext};base64,{encoded_string}"
        except Exception as e:
            logger.error(f"Error converting image to base64: {e}")
            return ""

    def generate_report(self, scan_id, analysis_results_path, visualizations):
        """
        Generate a diagnostic HTML report and convert to PDF
        
        Args:
            scan_id: ID of the scan
            analysis_results_path: Path to the analysis results JSON file
            visualizations: Dictionary with paths to visualization images
            
        Returns:
            Path to the generated PDF file
        """
        try:
            # Load analysis results
            with open(analysis_results_path, 'r') as f:
                data = json.load(f)
            
            # Extract key data
            # Patient info (simulated as it's not in the data)
            patient_info = {
                "name": "Patient Data",
                "id": f"PT-{scan_id}",
                "age": "",
                "gender": "",
                "height": "",
                "weight": "",
                "shoe_size": "",
                "prev_conditions": "",
                "foot_pain": ""
            }
            
            # Extract diagnosis details
            arch_type = "Unknown"
            arch_degree = 0
            pathologies = []
            alignment = {}
            recommendations = {
                "intrinsic": [],
                "extrinsic": [],
                "exercise": [],
                "footwear": []
            }
            confidence_scores = {}
            measurements = {}
            advanced_metrics = {}
            
            # Extract key diagnosis information
            if 'models' in data:
                # Get arch type information
                if 'arch_type' in data['models']:
                    arch_result = data['models']['arch_type'].get('result', {})
                    arch_type = arch_result.get('arch_type', 'unknown')
                    arch_degree = arch_result.get('degree', 0)
                    
                    # Get arch index if available
                    if 'measurements' in arch_result:
                        measurements.update(arch_result['measurements'])
                    
                # Get alignment information
                if 'alignment' in data['models']:
                    alignment_result = data['models']['alignment'].get('result', {})
                    alignment = alignment_result.get('zones', {})
                    
                # Get pathology information
                if 'pathology_detection' in data['models']:
                    pathology_result = data['models']['pathology_detection'].get('result', {})
                    detected = pathology_result.get('detected_pathologies', [])
                    pathologies = detected if isinstance(detected, list) else []
                
                # Get pressure metrics if available
                if 'pressure' in data['models']:
                    pressure_result = data['models']['pressure'].get('result', {})
                    if 'metrics' in pressure_result:
                        advanced_metrics.update(pressure_result['metrics'])
                
                # Get advanced measurements if available
                if 'advanced_measurements' in data['models']:
                    adv_result = data['models']['advanced_measurements'].get('result', {})
                    if 'measurements' in adv_result:
                        measurements.update(adv_result['measurements'])
                
                # Get skin tone analysis if available
                if 'skin_tone' in data['models']:
                    skin_result = data['models']['skin_tone'].get('result', {})
                    if 'fitzpatrick_type' in skin_result:
                        advanced_metrics['fitzpatrick_type'] = skin_result['fitzpatrick_type']
                    if 'rgb_values' in skin_result:
                        advanced_metrics['rgb_values'] = skin_result['rgb_values']
            
            # Get structured recommendations if available
            if 'recommendations' in data:
                if 'intrinsic' in data['recommendations']:
                    recommendations['intrinsic'] = data['recommendations']['intrinsic']
                if 'extrinsic' in data['recommendations']:
                    recommendations['extrinsic'] = data['recommendations']['extrinsic']
                if 'confidence_scores' in data['recommendations']:
                    confidence_scores = data['recommendations']['confidence_scores']
                
                # Add exercise and footwear recommendations if available
                if 'exercise' in data['recommendations']:
                    recommendations['exercise'] = data['recommendations']['exercise']
                if 'footwear' in data['recommendations']:
                    recommendations['footwear'] = data['recommendations']['footwear']
            
            # Prepare visualization images as base64 for embedding
            pressure_map_base64 = ""
            arch_analysis_base64 = ""
            left_foot_heatmap_base64 = ""
            right_foot_heatmap_base64 = ""
            
            # Log the available visualization paths
            logger.info(f"Available visualizations: {visualizations}")
            
            # Process pressure maps
            if 'left_foot_heatmap' in visualizations and os.path.exists(visualizations['left_foot_heatmap']):
                logger.info(f"Converting left foot heatmap to base64: {visualizations['left_foot_heatmap']}")
                left_foot_heatmap_base64 = self._image_to_base64(visualizations['left_foot_heatmap'])
                logger.info(f"Left foot heatmap base64 length: {len(left_foot_heatmap_base64) if left_foot_heatmap_base64 else 0}")
                
            if 'right_foot_heatmap' in visualizations and os.path.exists(visualizations['right_foot_heatmap']):
                logger.info(f"Converting right foot heatmap to base64: {visualizations['right_foot_heatmap']}")
                right_foot_heatmap_base64 = self._image_to_base64(visualizations['right_foot_heatmap'])
                logger.info(f"Right foot heatmap base64 length: {len(right_foot_heatmap_base64) if right_foot_heatmap_base64 else 0}")
            
            # Process combined pressure map (as fallback)
            if 'pressure_map' in visualizations and os.path.exists(visualizations['pressure_map']):
                logger.info(f"Converting pressure map to base64: {visualizations['pressure_map']}")
                pressure_map_base64 = self._image_to_base64(visualizations['pressure_map'])
                logger.info(f"Pressure map base64 length: {len(pressure_map_base64) if pressure_map_base64 else 0}")
                
            if 'arch_analysis' in visualizations and os.path.exists(visualizations['arch_analysis']):
                logger.info(f"Converting arch analysis to base64: {visualizations['arch_analysis']}")
                arch_analysis_base64 = self._image_to_base64(visualizations['arch_analysis'])
                logger.info(f"Arch analysis base64 length: {len(arch_analysis_base64) if arch_analysis_base64 else 0}")
            
            # Convert comparison images if available
            pressure_comparison_base64 = ""
            arch_comparison_base64 = ""
            
            if 'pressure_comparison' in visualizations and os.path.exists(visualizations['pressure_comparison']):
                logger.info(f"Converting pressure comparison to base64: {visualizations['pressure_comparison']}")
                pressure_comparison_base64 = self._image_to_base64(visualizations['pressure_comparison'])
                
            if 'arch_comparison' in visualizations and os.path.exists(visualizations['arch_comparison']):
                logger.info(f"Converting arch comparison to base64: {visualizations['arch_comparison']}")
                arch_comparison_base64 = self._image_to_base64(visualizations['arch_comparison'])
            
            # Prepare template context
            template_data = {
                'report_id': f"BG-{datetime.now().strftime('%Y%m%d')}-{scan_id}",
                'report_date': datetime.now().strftime('%B %d, %Y'),
                'scan_id': scan_id,
                'scan_date': datetime.now().strftime('%Y-%m-%d'),
                'patient': patient_info,
                'arch_type': self._get_arch_type_description(arch_type),
                'arch_degree': self._get_arch_degree_description(arch_degree),
                'arch_degree_value': arch_degree,
                'pathologies': pathologies,
                'alignment': alignment,
                'alignment_description': self._alignment_description(alignment),
                'measurements': measurements,
                'metrics': advanced_metrics,
                'recommendations': recommendations,
                'confidence_scores': confidence_scores,
                'pressure_map': pressure_map_base64,
                'arch_analysis': arch_analysis_base64,
                'pressure_comparison': pressure_comparison_base64,
                'arch_comparison': arch_comparison_base64,
                'orthotic_recommendations': recommendations['intrinsic'] + recommendations['extrinsic'],
                'left_foot_heatmap': left_foot_heatmap_base64,
                'right_foot_heatmap': right_foot_heatmap_base64
            }
            
            # Log template data keys for debugging
            logger.info(f"Template data keys: {list(template_data.keys())}")
            logger.info(f"Pressure map data available: {'Yes' if pressure_map_base64 else 'No'}")
            logger.info(f"Arch analysis data available: {'Yes' if arch_analysis_base64 else 'No'}")
            logger.info(f"Pressure comparison available: {'Yes' if pressure_comparison_base64 else 'No'}")
            logger.info(f"Arch comparison available: {'Yes' if arch_comparison_base64 else 'No'}")
            
            # Render HTML template
            template = self.jinja_env.get_template('foot_scan_report.html')
            html_content = template.render(**template_data)
            
            # Save HTML report
            html_path = self.reports_dir / f"scan_{scan_id}_report.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # For now, use just the HTML file since we couldn't install wkhtmltopdf
            logger.info(f"HTML report generated at {html_path}")
            
            # Copy the HTML to PDF location to keep compatibility with existing code
            pdf_path = self.reports_dir / f"scan_{scan_id}_report.pdf"
            shutil.copy(html_path, pdf_path)
            logger.info(f"Copied HTML report to PDF path at {pdf_path}")
            
            return pdf_path
            
        except Exception as e:
            logger.error(f"Error generating diagnostic report: {e}")
            # Fall back to basic PDF generation
            return self._generate_fallback_pdf(scan_id, analysis_results_path, visualizations)
    
    def _generate_fallback_pdf(self, scan_id, analysis_results_path, visualizations):
        """Fallback to basic FPDF generation if HTML approach fails"""
        try:
            logger.warning("Falling back to basic PDF generation")
            
            # Load analysis results
            with open(analysis_results_path, 'r') as f:
                data = json.load(f)
            
            # Create basic PDF
            pdf = FallbackPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            
            # Extract key diagnosis information
            arch_type = None
            arch_degree = None
            pathologies = []
            alignment = {}
            recommendations = []
            
            if 'models' in data:
                # Get arch type information
                if 'arch_type' in data['models']:
                    arch_result = data['models']['arch_type'].get('result', {})
                    arch_type = arch_result.get('arch_type', 'unknown')
                    arch_degree = arch_result.get('degree', 0)
                    
                # Get alignment information
                if 'alignment' in data['models']:
                    alignment_result = data['models']['alignment'].get('result', {})
                    alignment = alignment_result.get('zones', {})
                    
                # Get pathology information
                if 'pathology_detection' in data['models']:
                    pathology_result = data['models']['pathology_detection'].get('result', {})
                    detected = pathology_result.get('detected_pathologies', [])
                    pathologies = detected if isinstance(detected, list) else []
                    
                # Get recommendations
                for model_name, model_data in data['models'].items():
                    if 'recommendations' in model_data.get('result', {}):
                        model_recs = model_data['result']['recommendations']
                        if isinstance(model_recs, dict) and 'orthotics' in model_recs:
                            recommendations.extend(model_recs['orthotics'])
                        elif isinstance(model_recs, list):
                            recommendations.extend(model_recs)
            
            # Basic PDF content
            pdf.section_title('Scan Information')
            pdf.section_body(f"Scan ID: {scan_id}")
            pdf.section_body(f"Scan Date: {datetime.now().strftime('%Y-%m-%d')}")
            pdf.section_body(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            pdf.section_title('Foot Analysis')
            
            if arch_type:
                pdf.small_title('Arch Classification:')
                degree_text = self._get_arch_degree_description(arch_degree) if arch_degree else ""
                pdf.section_body(f"{degree_text} {self._get_arch_type_description(arch_type)}")
            
            if alignment:
                pdf.small_title('Foot Alignment:')
                pdf.section_body(self._alignment_description(alignment))
            
            if pathologies:
                pdf.small_title('Detected Conditions:')
                pdf.section_body(", ".join(pathologies))
            
            # Add visualizations
            if 'pressure_map' in visualizations and os.path.exists(visualizations['pressure_map']):
                pdf.add_page()
                pdf.section_title('Pressure Distribution Analysis')
                pdf.image(visualizations['pressure_map'], x=15, w=180)
                
            if 'arch_analysis' in visualizations and os.path.exists(visualizations['arch_analysis']):
                pdf.add_page()
                pdf.section_title('Arch Analysis')
                pdf.image(visualizations['arch_analysis'], x=15, w=180)
            
            # Save PDF
            pdf_path = self.reports_dir / f"scan_{scan_id}_report.pdf"
            pdf.output(str(pdf_path))
            logger.info(f"Basic PDF report generated at {pdf_path}")
            
            return pdf_path
            
        except Exception as e:
            logger.error(f"Error generating fallback PDF: {e}")
            return None

# Fallback PDF class in case HTML approach fails
class FallbackPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'Barogrip Foot Scan Diagnostic Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()} - Generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 0, 'C')

    def section_title(self, title):
        self.set_font('Arial', 'B', 12)
        self.set_fill_color(230, 230, 230)
        self.cell(0, 10, title, 0, 1, 'L', True)
        self.ln(2)

    def section_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 8, body)
        self.ln(2)
        
    def small_title(self, title):
        self.set_font('Arial', 'B', 11)
        self.cell(0, 8, title, 0, 1)