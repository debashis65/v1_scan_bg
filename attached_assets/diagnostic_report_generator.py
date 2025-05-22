
import os
import json
from fpdf import FPDF
from datetime import datetime

class DiagnosticPDF(FPDF):
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
        self.set_text_color(30, 30, 30)
        self.cell(0, 10, title, 0, 1)
        self.set_text_color(0, 0, 0)

    def section_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 8, body)
        self.ln()

def generate_report(diagnosis_json_path, output_path, annotated_image_path=None):
    with open(diagnosis_json_path, 'r') as f:
        data = json.load(f)

    pdf = DiagnosticPDF()
    pdf.add_page()

    # Patient + Scan Info
    pdf.section_title('Patient & Scan Summary')
    pdf.section_body(f"Scan Date: {datetime.now().strftime('%Y-%m-%d')}")
    if 'diagnosis' in data:
        diag = data['diagnosis']
        pdf.section_body(f"Arch Type: {diag.get('arch_type')}")
        pdf.section_body(f"Arch Degree: {diag.get('arch_degree')}")
        pdf.section_body(f"Detected Pathologies: {', '.join(diag.get('pathologies', []))}")
        alignment = diag.get('alignment', {})
        pdf.section_body(f"Alignment Zones: Forefoot - {alignment.get('forefoot')}, Midfoot - {alignment.get('midfoot')}, Hindfoot - {alignment.get('hindfoot')}")

    # Recommendations
    if 'recommendations' in data:
        pdf.section_title('Orthotic Recommendations')
        recs = data['recommendations'].get('orthotic_addons', [])
        for item in recs:
            pdf.section_body(f"- {item}")

    # Annotated Image
    if annotated_image_path and os.path.exists(annotated_image_path):
        pdf.add_page()
        pdf.section_title("Scan Visualization")
        pdf.image(annotated_image_path, x=15, w=180)

    pdf.output(output_path)
    print(f"PDF report saved to {output_path}")

# Example usage:
# generate_report('sample_diagnosis.json', 'foot_scan_report.pdf', 'annotated_overlay.png')
