import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { isAuthenticated, hasRole } from './auth';
import { UserRole } from '../shared/constants';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { generateAlignmentSvg, generateArchTypeSvg } from './utils/alignment-svg-generator';

export const exportRouter = Router();

// Middleware to validate format parameter
const validateFormat = (req: Request, res: Response, next: NextFunction) => {
  const { format } = req.query;
  if (format && !['pdf', 'csv', 'json'].includes(format as string)) {
    return res.status(400).json({ 
      error: 'Invalid format. Supported formats: pdf, csv, json' 
    });
  }
  next();
};

// PDF export of a scan with diagnosis and prescriptions
exportRouter.get('/scan-pdf/:scanId', 
  isAuthenticated, 
  validateFormat,
  async (req, res) => {
    try {
      const scanId = parseInt(req.params.scanId);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan (either the patient or any doctor)
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get related data
      const prescriptions = await storage.getScanPrescriptions(scanId);
      const images = await storage.getScanImages(scanId);
      const patient = await storage.getUser(scan.patientId);
      
      // Generate filename
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
      const filename = `scan_${scanId}_${timestamp}.pdf`;
      const outputPath = path.join(__dirname, '../output', filename);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      
      // Create a simple PDF document with scan details
      // In a production environment, you would use a library like PDFKit to generate a proper PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scan Report #${scanId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.5; color: #333; }
            h1, h2 { color: #2563eb; }
            h3, h4, h5 { color: #1e40af; margin-top: 16px; margin-bottom: 8px; }
            .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 28px; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .prescription { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 15px; border-radius: 5px; background-color: #f8fafc; }
            .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 12px; color: #6b7280; }
            
            /* Tables */
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9em; }
            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .data-table { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
            .data-table th { background-color: #eef2ff; color: #4338ca; }
            .data-table.compact td, .data-table.compact th { padding: 6px 8px; font-size: 0.85em; }
            
            /* Diagnosis-specific styling */
            .diagnosis-sections { display: flex; flex-direction: column; gap: 20px; }
            .card { background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .diagnosis-overview { background-color: #f0f9ff; border-color: #bae6fd; }
            .advanced-measurements { background-color: #f0fdfa; border-color: #99f6e4; }
            .pressure-distribution { background-color: #fffbeb; border-color: #fef3c7; }
            .arch-analysis { background-color: #f5f3ff; border-color: #ddd6fe; }
            
            /* Skin Tone Analysis styling */
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .skin-tone-analysis { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px; }
            .skin-type-card { margin-bottom: 12px; }
            .detailed-metrics, .clinical-relevance { background-color: #f9fafb; border-radius: 4px; padding: 8px 12px; margin-top: 12px; }
            .clinical-relevance { background-color: #eff6ff; border: 1px solid #bfdbfe; }
            
            /* Metrics Section */
            .metrics-section { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
            
            @media print {
              body { font-size: 11pt; }
              .section { page-break-inside: avoid; }
              .card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Foot Scan Report #${scanId}</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Patient: ${patient?.fullName || 'Unknown'}</p>
          </div>
          
          <div class="section">
            <h2>Scan Details</h2>
            <table>
              <tr><th>Scan Date</th><td>${new Date(scan.createdAt).toLocaleString()}</td></tr>
              <tr><th>Status</th><td>${scan.status}</td></tr>
              <tr><th>3D Model</th><td>${scan.modelUrl ? 'Available' : 'Not available'}</td></tr>
              <tr><th>Doctor Notes</th><td>${scan.doctorNotes || 'No notes available'}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>AI Diagnosis</h2>
            ${scan.diagnosisResult ? `
              <div class="diagnosis-sections">
                <!-- Basic Diagnosis Information -->
                <div class="diagnosis-overview card">
                  <h3>Overview</h3>
                  <p><strong>Condition:</strong> ${scan.diagnosisResult.condition_name || 'Not available'}</p>
                  <p><strong>Confidence:</strong> ${scan.diagnosisResult.confidence ? `${(scan.diagnosisResult.confidence * 100).toFixed(1)}%` : 'Not available'}</p>
                  <p>${scan.diagnosisResult.description || ''}</p>
                </div>
                
                <!-- Advanced Measurements -->
                ${scan.diagnosisResult.advanced_measurements ? `
                <div class="advanced-measurements card">
                  <h3>Advanced Clinical Measurements</h3>
                  
                  <!-- Leg Alignment Visualization -->
                  <div class="visualization">
                    <h4>Leg Alignment Visualization</h4>
                    ${generateAlignmentSvg(scan.diagnosisResult.advanced_measurements)}
                  </div>
                  
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Measurement</th>
                        <th>Value</th>
                        <th>Normal Range</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(scan.diagnosisResult.advanced_measurements).map(([key, data]: [string, any]) => `
                        <tr>
                          <td>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          <td>${typeof data.value === 'object' ? 
                            `Right: ${data.value.right || 'N/A'}, Left: ${data.value.left || 'N/A'}` : 
                            (data.value || 'N/A')} ${data.unit || ''}</td>
                          <td>${data.normal_range || 'N/A'}</td>
                          <td>${typeof data.interpretation === 'object' ? 
                            `Right: ${data.interpretation.right || 'N/A'}, Left: ${data.interpretation.left || 'N/A'}` : 
                            (data.interpretation || 'N/A')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
                ` : ''}
                
                <!-- Pressure Distribution -->
                ${scan.diagnosisResult.pressure_distribution ? `
                <div class="pressure-distribution card">
                  <h3>Pressure Distribution Analysis</h3>
                  <div class="metrics-grid">
                    <div class="metrics-section">
                      <h4>Regional Pressure</h4>
                      <table class="data-table">
                        <tbody>
                          <tr>
                            <td>Forefoot:</td>
                            <td>${scan.diagnosisResult.pressure_distribution.pressure_metrics?.forefoot_percentage?.toFixed(1) || 'N/A'}%</td>
                          </tr>
                          <tr>
                            <td>Midfoot:</td>
                            <td>${scan.diagnosisResult.pressure_distribution.pressure_metrics?.midfoot_percentage?.toFixed(1) || 'N/A'}%</td>
                          </tr>
                          <tr>
                            <td>Rearfoot:</td>
                            <td>${scan.diagnosisResult.pressure_distribution.pressure_metrics?.rearfoot_percentage?.toFixed(1) || 'N/A'}%</td>
                          </tr>
                          <tr>
                            <td>Medial:</td>
                            <td>${scan.diagnosisResult.pressure_distribution.pressure_metrics?.medial_percentage?.toFixed(1) || 'N/A'}%</td>
                          </tr>
                          <tr>
                            <td>Lateral:</td>
                            <td>${scan.diagnosisResult.pressure_distribution.pressure_metrics?.lateral_percentage?.toFixed(1) || 'N/A'}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <!-- Skin Tone Analysis -->
                    ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis ? `
                    <div class="skin-tone-analysis">
                      <h4>Advanced Skin Tone Analysis</h4>
                      <div class="skin-type-card">
                        <p><strong>Detected Skin Type:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.detected_skin_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p><strong>Melanin Index:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.melanin_index?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Vascular Visibility Index:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.vascular_visibility_index?.toFixed(2) || 'N/A'}</p>
                        <p><strong>Calibration Applied:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.calibration_applied ? 'Yes' : 'No'}</p>
                        
                        ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.calibration_profile ? `
                          <p><strong>Calibration Method:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.calibration_profile.method || 'N/A'}</p>
                          <p><strong>Enhancement Applied:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.calibration_profile.enhancement_applied || 'N/A'}</p>
                        ` : ''}
                      </div>
                      
                      ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.detailed_metrics ? `
                      <div class="detailed-metrics">
                        <h5>Detailed Vascular Metrics</h5>
                        <table class="data-table compact">
                          <tbody>
                            <tr>
                              <td>Hemoglobin Index:</td>
                              <td>${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.detailed_metrics.hemoglobin_index?.toFixed(2) || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td>R/G Ratio:</td>
                              <td>${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.detailed_metrics.r_g_ratio?.toFixed(2) || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      ` : ''}
                      
                      ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance ? `
                      <div class="clinical-relevance">
                        <h5>Clinical Relevance</h5>
                        <p>${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance.vascular_assessment_impact || ''}</p>
                        <p>${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance.pressure_reading_impact || ''}</p>
                        <p><strong>Recommendation:</strong> ${scan.diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance.recommended_calibration || ''}</p>
                      </div>
                      ` : ''}
                    </div>
                    ` : ''}
                  </div>
                </div>
                ` : ''}
                
                <!-- Arch Type Analysis -->
                ${scan.diagnosisResult.arch_type_analysis ? `
                <div class="arch-analysis card">
                  <h3>Arch Type Analysis</h3>
                  
                  <!-- Arch Type Visualization -->
                  <div class="visualization">
                    <h4>Arch Type Visualization</h4>
                    ${generateArchTypeSvg(scan.diagnosisResult.arch_type_analysis.arch_type || 'normal_arch')}
                  </div>
                  
                  <p><strong>Arch Type:</strong> ${scan.diagnosisResult.arch_type_analysis.arch_type || 'Not available'}</p>
                  <p><strong>Confidence:</strong> ${scan.diagnosisResult.arch_type_analysis.confidence ? `${(scan.diagnosisResult.arch_type_analysis.confidence * 100).toFixed(1)}%` : 'Not available'}</p>
                  <p>${scan.diagnosisResult.arch_type_analysis.description || ''}</p>
                  
                  ${scan.diagnosisResult.arch_type_analysis.measurements ? `
                  <div class="arch-measurements">
                    <h4>Arch Measurements</h4>
                    <table class="data-table">
                      <tbody>
                        ${Object.entries(scan.diagnosisResult.arch_type_analysis.measurements).slice(0, 5).map(([key, value]: [string, any]) => `
                          <tr>
                            <td>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</td>
                            <td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  ` : ''}
                </div>
                ` : ''}
              </div>
            ` : '<p>No diagnosis available</p>'}
          </div>
          
          ${prescriptions.length > 0 ? `
          <div class="section">
            <h2>Prescriptions</h2>
            ${prescriptions.map(p => `
              <div class="prescription">
                <h3>${p.title}</h3>
                <p>${p.description}</p>
                ${p.recommendedProduct ? `<p><strong>Recommended Product:</strong> ${p.recommendedProduct}</p>` : ''}
                ${p.recommendedExercises ? `<p><strong>Recommended Exercises:</strong> ${p.recommendedExercises}</p>` : ''}
                <p><small>Created on ${new Date(p.createdAt).toLocaleString()}</small></p>
              </div>
            `).join('')}
          </div>
          ` : '<div class="section"><h2>Prescriptions</h2><p>No prescriptions available</p></div>'}
          
          <div class="footer">
            <p>This report was generated by Barogrip. © ${new Date().getFullYear()} Barogrip Inc.</p>
          </div>
        </body>
        </html>
      `;
      
      // Write HTML file for now (in production you would generate a proper PDF)
      fs.writeFileSync(outputPath.replace('.pdf', '.html'), htmlContent);
      
      // For demo, returning the URL to the HTML file
      // In production, you would convert this to PDF using a library like PDFKit
      const fileUrl = `/api/files/output/${path.basename(outputPath.replace('.pdf', '.html'))}`;
      
      // Return different formats based on request
      const requestedFormat = (req.query.format as string) || 'json';
      
      if (requestedFormat === 'json') {
        return res.json({
          scanId,
          patientName: patient?.fullName,
          reportUrl: fileUrl,
          generated: new Date(),
          message: "Report generated successfully"
        });
      } else {
        // Redirect to download file
        return res.redirect(fileUrl);
      }
      
    } catch (error) {
      console.error("Error generating scan PDF:", error);
      res.status(500).json({ message: "Error generating report" });
    }
  }
);

// Generate a complete patient report (doctors only)
exportRouter.get('/patient-report/:patientId', 
  isAuthenticated, 
  hasRole(UserRole.DOCTOR),
  async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      // Get patient data
      const patient = await storage.getUser(patientId);
      if (!patient || patient.role !== UserRole.PATIENT) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get patient profile data
      const profile = await storage.getPatientProfile(patientId);
      
      // Get scans
      const scans = await storage.getPatientScans(patientId);
      
      // Get prescriptions
      const prescriptions = await storage.getPatientPrescriptions(patientId);
      
      // Generate filename
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
      const filename = `patient_${patientId}_report_${timestamp}.html`;
      const outputPath = path.join(__dirname, '../output', filename);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      
      // Create a comprehensive patient report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Patient Report - ${patient.fullName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.5; color: #333; }
            h1, h2 { color: #2563eb; }
            h3, h4, h5 { color: #1e40af; margin-top: 16px; margin-bottom: 8px; }
            .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 28px; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .card { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 15px; border-radius: 5px; background-color: #f8fafc; }
            .footer { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 12px; color: #6b7280; }
            
            /* Tables */
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9em; }
            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .data-table { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
            .data-table th { background-color: #eef2ff; color: #4338ca; }
            .data-table.compact td, .data-table.compact th { padding: 6px 8px; font-size: 0.85em; }
            .scan-table { margin-bottom: 20px; }
            
            /* Diagnosis-specific styling */
            .diagnosis-sections { display: flex; flex-direction: column; gap: 20px; }
            .diagnosis-overview { background-color: #f0f9ff; border-color: #bae6fd; }
            .advanced-measurements { background-color: #f0fdfa; border-color: #99f6e4; }
            .pressure-distribution { background-color: #fffbeb; border-color: #fef3c7; }
            .arch-analysis { background-color: #f5f3ff; border-color: #ddd6fe; }
            
            /* Skin Tone Analysis styling */
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .skin-tone-analysis { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px; }
            .skin-type-card { margin-bottom: 12px; }
            .detailed-metrics, .clinical-relevance { background-color: #f9fafb; border-radius: 4px; padding: 8px 12px; margin-top: 12px; }
            .clinical-relevance { background-color: #eff6ff; border: 1px solid #bfdbfe; }
            
            /* Metrics Section */
            .metrics-section { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
            
            /* Scan Detail Card */
            .scan-detail { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .scan-detail h3 { margin-top: 0; }
            .scan-detail.highlight { background-color: #f0f9ff; border-color: #bae6fd; }
            
            @media print {
              body { font-size: 11pt; }
              .section { page-break-inside: avoid; }
              .card, .scan-detail { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patient Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Generated by: ${req.user!.fullName}</p>
          </div>
          
          <div class="section">
            <h2>Patient Information</h2>
            <table>
              <tr><th>Name</th><td>${patient.fullName}</td></tr>
              <tr><th>Email</th><td>${patient.email}</td></tr>
              <tr><th>Date of Birth</th><td>${profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not specified'}</td></tr>
              <tr><th>Gender</th><td>${profile?.gender || 'Not specified'}</td></tr>
              <tr><th>Height</th><td>${profile?.height ? `${profile.height} cm` : 'Not specified'}</td></tr>
              <tr><th>Weight</th><td>${profile?.weight ? `${profile.weight} kg` : 'Not specified'}</td></tr>
              <tr><th>Medical Conditions</th><td>${profile?.medicalConditions || 'None specified'}</td></tr>
              <tr><th>Medications</th><td>${profile?.medications || 'None specified'}</td></tr>
              <tr><th>Account Created</th><td>${new Date(patient.createdAt).toLocaleDateString()}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>Scan History</h2>
            ${scans.length > 0 ? `
              <table class="scan-table">
                <thead>
                  <tr>
                    <th>Scan ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Diagnosis</th>
                    <th>Doctor Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${scans.map(scan => `
                    <tr>
                      <td>${scan.id}</td>
                      <td>${new Date(scan.createdAt).toLocaleDateString()}</td>
                      <td>${scan.status}</td>
                      <td>${scan.diagnosisResult ? 'Available' : 'None'}</td>
                      <td>${scan.doctorNotes || 'None'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <!-- Detailed Scan Information (Most Recent) -->
              ${scans.length > 0 && scans[0].diagnosisResult ? `
              <div class="scan-details">
                <h3>Latest Scan Analysis (Scan #${scans[0].id})</h3>
                
                <!-- Arch Type Analysis (if available) -->
                ${scans[0].diagnosisResult.arch_type_analysis ? `
                <div class="scan-detail">
                  <h4>Arch Type Analysis</h4>
                  
                  <!-- Add arch type visualization -->
                  <div class="visualization">
                    <h5>Arch Type Visualization</h5>
                    ${generateArchTypeSvg(scans[0].diagnosisResult.arch_type_analysis.arch_type || 'normal_arch')}
                  </div>
                  
                  <p><strong>Arch Type:</strong> ${scans[0].diagnosisResult.arch_type_analysis.arch_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not available'}</p>
                  <p><strong>Confidence:</strong> ${scans[0].diagnosisResult.arch_type_analysis.confidence ? `${(scans[0].diagnosisResult.arch_type_analysis.confidence * 100).toFixed(1)}%` : 'Not available'}</p>
                  <p>${scans[0].diagnosisResult.arch_type_analysis.description || ''}</p>
                </div>
                ` : ''}
                
                <!-- Skin Tone Analysis (if available) -->
                ${scans[0].diagnosisResult.pressure_distribution && scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis ? `
                <div class="scan-detail highlight">
                  <h4>Skin Tone Analysis & Vascular Assessment</h4>
                  <div class="metrics-grid">
                    <div class="skin-type-card">
                      <p><strong>Detected Skin Type:</strong> ${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.detected_skin_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p><strong>Description:</strong> ${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.description}</p>
                      <p><strong>Melanin Index:</strong> ${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.melanin_index?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Vascular Visibility Index:</strong> ${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.vascular_visibility_index?.toFixed(2) || 'N/A'}</p>
                    </div>
                    
                    <div class="clinical-relevance">
                      <h5>Clinical Significance</h5>
                      <p>${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance?.vascular_assessment_impact || ''}</p>
                      <p>${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance?.pressure_reading_impact || ''}</p>
                      <p><strong>Recommendation:</strong> ${scans[0].diagnosisResult.pressure_distribution.skin_tone_analysis.clinical_relevance?.recommended_calibration || 'Standard assessment techniques.'}</p>
                    </div>
                  </div>
                </div>
                ` : ''}
                
                <!-- Advanced Measurements (if available) -->
                ${scans[0].diagnosisResult.advanced_measurements ? `
                <div class="scan-detail">
                  <h4>Advanced Clinical Measurements</h4>
                  
                  <!-- Add leg alignment visualization -->
                  <div class="visualization">
                    <h5>Leg Alignment Visualization</h5>
                    ${generateAlignmentSvg(scans[0].diagnosisResult.advanced_measurements)}
                  </div>
                  
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Measurement</th>
                        <th>Value</th>
                        <th>Normal Range</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(scans[0].diagnosisResult.advanced_measurements).slice(0, 5).map(([key, data]: [string, any]) => `
                        <tr>
                          <td>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          <td>${typeof data.value === 'object' ? 
                            `Right: ${data.value.right || 'N/A'}, Left: ${data.value.left || 'N/A'}` : 
                            (data.value || 'N/A')} ${data.unit || ''}</td>
                          <td>${data.normal_range || 'N/A'}</td>
                          <td>${typeof data.interpretation === 'object' ? 
                            `Right: ${data.interpretation.right || 'N/A'}, Left: ${data.interpretation.left || 'N/A'}` : 
                            (data.interpretation || 'N/A')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <p><small>Showing 5 of ${Object.keys(scans[0].diagnosisResult.advanced_measurements).length} measurements. See full report for complete data.</small></p>
                </div>
                ` : ''}
              </div>
              ` : ''}
            ` : '<p>No scans recorded</p>'}
          </div>
          
          <div class="section">
            <h2>Prescriptions</h2>
            ${prescriptions.length > 0 ? `
              ${prescriptions.map(p => `
                <div class="card">
                  <h3>${p.title}</h3>
                  <p><strong>Date:</strong> ${new Date(p.createdAt).toLocaleDateString()}</p>
                  <p><strong>Doctor:</strong> ${p.doctor?.fullName || 'Unknown'}</p>
                  <p>${p.description}</p>
                  ${p.recommendedProduct ? `<p><strong>Recommended Product:</strong> ${p.recommendedProduct}</p>` : ''}
                  ${p.recommendedExercises ? `<p><strong>Recommended Exercises:</strong> ${p.recommendedExercises}</p>` : ''}
                </div>
              `).join('')}
            ` : '<p>No prescriptions recorded</p>'}
          </div>
          
          <div class="footer">
            <p>This report was generated by Barogrip. © ${new Date().getFullYear()} Barogrip Inc.</p>
            <p>CONFIDENTIAL: This document contains protected health information. Do not disclose without patient consent.</p>
          </div>
        </body>
        </html>
      `;
      
      // Write HTML file
      fs.writeFileSync(outputPath, htmlContent);
      
      // Return file URL
      const fileUrl = `/api/files/output/${path.basename(outputPath)}`;
      
      // Return different formats based on request
      const requestedFormat = (req.query.format as string) || 'json';
      
      if (requestedFormat === 'json') {
        return res.json({
          patientId,
          patientName: patient.fullName,
          reportUrl: fileUrl,
          generated: new Date(),
          message: "Patient report generated successfully"
        });
      } else {
        // Redirect to download file
        return res.redirect(fileUrl);
      }
      
    } catch (error) {
      console.error("Error generating patient report:", error);
      res.status(500).json({ message: "Error generating report" });
    }
  }
);

// Export prescriptions to CSV (patients can export their own, doctors can export any)
exportRouter.get('/prescriptions-csv/:patientId', 
  isAuthenticated,
  async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      // Check authorization - patients can only access their own data
      if (req.user!.role === UserRole.PATIENT && req.user!.id !== patientId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get patient data
      const patient = await storage.getUser(patientId);
      if (!patient || patient.role !== UserRole.PATIENT) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get prescriptions
      const prescriptions = await storage.getPatientPrescriptions(patientId);
      
      // Generate filename
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
      const filename = `prescriptions_${patientId}_${timestamp}.csv`;
      const outputPath = path.join(__dirname, '../output', filename);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      
      // Create CSV content
      let csvContent = "ID,Date,Doctor,Title,Description,Recommended Product,Recommended Exercises\n";
      
      prescriptions.forEach(p => {
        // Escape fields that might contain commas
        const escapeField = (field: string | null | undefined) => {
          if (!field) return '';
          // Replace double quotes with two double quotes and wrap in quotes
          return `"${field.replace(/"/g, '""')}"`;
        };
        
        csvContent += [
          p.id,
          new Date(p.createdAt).toLocaleDateString(),
          escapeField(p.doctor?.fullName || 'Unknown'),
          escapeField(p.title),
          escapeField(p.description),
          escapeField(p.recommendedProduct),
          escapeField(p.recommendedExercises)
        ].join(',') + '\n';
      });
      
      // Write CSV file
      fs.writeFileSync(outputPath, csvContent);
      
      // Return file URL
      const fileUrl = `/api/files/output/${path.basename(outputPath)}`;
      
      // Return different formats based on request
      const requestedFormat = (req.query.format as string) || 'json';
      
      if (requestedFormat === 'json') {
        return res.json({
          patientId,
          patientName: patient.fullName,
          reportUrl: fileUrl,
          recordCount: prescriptions.length,
          generated: new Date(),
          message: "Prescriptions exported successfully"
        });
      } else {
        // Redirect to download file
        return res.redirect(fileUrl);
      }
      
    } catch (error) {
      console.error("Error exporting prescriptions to CSV:", error);
      res.status(500).json({ message: "Error exporting prescriptions" });
    }
  }
);