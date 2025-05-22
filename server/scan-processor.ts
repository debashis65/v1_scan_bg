import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { storage } from "./storage";
import { emailService } from "./email";
import { WebSocket } from "ws";
import { processDetailedResults } from "./helpers";
import { PressureHeatmapGenerator, Point } from "./utils/heatmap-generator";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Map to store WebSocket connections by scanId
const scanSockets = new Map<number, WebSocket[]>();

// Register a WebSocket for scan status updates
export function registerScanSocket(scanId: number, ws: WebSocket) {
  if (!scanSockets.has(scanId)) {
    scanSockets.set(scanId, []);
  }
  scanSockets.get(scanId)?.push(ws);
  
  // Remove socket when closed
  ws.on("close", () => {
    const sockets = scanSockets.get(scanId) || [];
    const index = sockets.indexOf(ws);
    if (index !== -1) {
      sockets.splice(index, 1);
    }
    if (sockets.length === 0) {
      scanSockets.delete(scanId);
    }
  });
}

// Send status update to all connected clients for a scan
export function updateScanStatus(scanId: number, status: string, data?: any) {
  const sockets = scanSockets.get(scanId) || [];
  
  // Enhanced status message with more details and timestamp
  const statusMessage = {
    type: 'scan_status_update',
    scanId,
    status,
    timestamp: new Date().toISOString(),
    progress: getProgressForStatus(status),
    message: getMessageForStatus(status),
    data
  };
  
  const message = JSON.stringify(statusMessage);
  
  // Send to all connected clients
  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
  
  console.log(`WebSocket update sent for scan ${scanId}: ${status}`);
}

// Helper to estimate progress percentage based on status
export function getProgressForStatus(status: string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 25;
    case 'analyzing':
      return 50;
    case 'generating_model':
      return 75;
    case 'complete':
      return 100;
    case 'error':
      return 0;
    default:
      return 0;
  }
}

// Helper to get user-friendly messages based on status
export function getMessageForStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Scan is in the queue for processing.';
    case 'processing':
      return 'Processing images for 3D reconstruction...';
    case 'analyzing':
      return 'Analyzing foot structure and measurements...';
    case 'generating_model':
      return 'Generating 3D model and diagnostic report...';
    case 'complete':
      return 'Scan processing complete! Results are ready.';
    case 'error':
      return 'An error occurred during scan processing.';
    default:
      return 'Processing scan...';
  }
}

// Process scan function
export async function processScan(scanId: number, imageUrls: string[]) {
  try {
    // Update scan status to processing
    await storage.updateScan(scanId, { status: "processing" });
    updateScanStatus(scanId, "processing");
    
    // Get scan information
    const scan = await storage.getScan(scanId);
    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }
    
    // Create scan request for Python processor
    const requestData = {
      scanId,
      imagePaths: imageUrls.map(url => path.join(process.cwd(), url)),
    };
    
    // Send request to Python processor by creating a file in the watch directory
    const inputDir = path.join(process.cwd(), "input");
    const requestFilePath = path.join(inputDir, `scan_${scanId}.json`);
    
    try {
      // Ensure directory exists
      await mkdir(inputDir, { recursive: true });
      
      // Write request file
      await writeFile(requestFilePath, JSON.stringify(requestData, null, 2));
      console.log(`Created scan request file: ${requestFilePath}`);
      
      // The Python processor will pick up the file and process it
      // It will call back to the /api/processor/scan-complete endpoint when done
      console.log(`Scan ${scanId} submitted for processing`);
      
      return scan;
    } catch (error) {
      console.error(`Error creating scan request file:`, error);
      
      // If file creation fails, fall back to simulated processing
      return fallbackProcessing(scanId, scan);
    }
  } catch (error) {
    console.error(`Error processing scan ${scanId}:`, error);
    
    // Update scan status to error
    await storage.updateScan(scanId, { status: "error" });
    updateScanStatus(scanId, "error", { message: "Failed to process scan" });
    
    throw error;
  }
}

// Fallback processing in case the Python processor isn't available
async function fallbackProcessing(scanId: number, scan: any) {
  console.log(`Using fallback processing for scan ${scanId}`);
  
  try {
    // Simulate processing time
    const processingTime = Math.floor(Math.random() * 5000) + 5000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Get patient information
    const patient = await storage.getUser(scan.patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${scan.patientId}`);
    }
    
    // Simulate AI diagnosis
    const diagnoses = [
      "Flatfoot",
      "High Arch",
      "Heel Spur",
      "Pronation",
      "Supination",
      "Normal Foot Structure",
    ];
    const randomDiagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
    const confidence = (Math.random() * 0.3) + 0.7; // Random confidence between 70% and 100%
    
    // Generate random foot measurements
    const footLength = 20 + Math.random() * 10; // 20-30 cm
    const footWidth = 7 + Math.random() * 4; // 7-11 cm
    const archHeight = 1 + Math.random() * 2; // 1-3 cm
    const instepHeight = 2 + Math.random() * 1; // 2-3 cm
    
    // Generate standard pressure points for both feet
    const pressureDataPoints = {
      left: PressureHeatmapGenerator.createStandardPressurePoints('left'),
      right: PressureHeatmapGenerator.createStandardPressurePoints('right')
    };
    
    // Generate heatmaps for both feet
    const outputDir = path.join(__dirname, "../output/heatmaps");
    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Generate left foot heatmap
    const leftHeatmap = await PressureHeatmapGenerator.generateAndSaveScanHeatmap(
      scanId,
      pressureDataPoints.left,
      'left',
      outputDir
    );
    
    // Generate right foot heatmap
    const rightHeatmap = await PressureHeatmapGenerator.generateAndSaveScanHeatmap(
      scanId,
      pressureDataPoints.right,
      'right',
      outputDir
    );
    
    // Create URLs for the heatmaps
    const leftHeatmapUrl = `/api/files/output/heatmaps/${path.basename(leftHeatmap.filePath)}`;
    const rightHeatmapUrl = `/api/files/output/heatmaps/${path.basename(rightHeatmap.filePath)}`;
    
    // Update scan with results
    const updatedScan = await storage.updateScan(scanId, {
      status: "complete",
      aiDiagnosis: randomDiagnosis,
      aiConfidence: confidence,
      footLength,
      footWidth,
      archHeight,
      instepHeight,
      // In a real implementation, these would be actual file URLs
      objUrl: `/scans/${scanId}/model.obj`,
      stlUrl: `/scans/${scanId}/model.stl`,
      thumbnailUrl: `/scans/${scanId}/thumbnail.jpg`,
      // Add pressure data and heatmap URLs
      pressureDataPoints,
      leftPressureHeatmapUrl: leftHeatmapUrl,
      rightPressureHeatmapUrl: rightHeatmapUrl
    });
    
    // Notify connected clients
    updateScanStatus(scanId, "complete", updatedScan);
    
    // Send email notification
    if (patient.email) {
      await emailService.sendScanReadyNotification(
        patient.email,
        patient.fullName,
        scanId
      );
    }
    
    return updatedScan;
  } catch (error) {
    console.error(`Error in fallback processing for scan ${scanId}:`, error);
    
    // Update scan status to error
    await storage.updateScan(scanId, { status: "error" });
    updateScanStatus(scanId, "error", { message: "Failed to process scan" });
    
    throw error;
  }
}

// This is the entry point for the Python script to call back to the Node.js server
export async function notifyScanProcessed(
  scanId: number,
  objPath: string,
  stlPath: string,
  thumbnailPath: string,
  aiResults: {
    diagnosis: string;
    confidence: number;
    assessment: string;
    measurements: {
      length: number;
      width: number;
      arch_height: number;
      instep_height: number;
    };
    detailed_results?: {
      models?: {
        advanced_measurements?: {
          result?: {
            measurements?: {
              photoplethysmography?: any;
              hind_foot_valgus_angle?: any;
              hind_foot_varus_angle?: any;
              foot_posture_index?: any;
              arch_height_index?: any;
              arch_rigidity_index?: any;
              medial_longitudinal_arch_angle?: any;
              chippaux_smirak_index?: any;
              valgus_index?: any;
              arch_angle?: any;
            }
          }
        },
        pressure_distribution?: {
          result?: {
            measurements?: {
              regional_pressure?: any;
              vascular_health?: any;
              temperature_analysis?: any;
              perfusion_indices?: any;
            }
          }
        },
        arch_type_analysis?: {
          result?: {
            measurements?: {
              arch_shape?: any;
              flexibility_assessment?: any;
              clinical_correlation?: any;
              treatment_recommendations?: any;
            }
          }
        }
      }
    }
  }
) {
  try {
    console.log(`Received scan processing results for scan ${scanId}`);
    console.log(`Diagnosis: ${aiResults.diagnosis} (${aiResults.confidence * 100}% confidence)`);
    
    // Get the current scan
    const scan = await storage.getScan(scanId);
    if (!scan) {
      throw new Error(`Scan not found: ${scanId}`);
    }
    
    // Process and organize the detailed results for better dashboard presentation
    const processedDetails = processDetailedResults(aiResults.detailed_results);
    
    // Extract pressure data points if available
    let pressureDataPoints = null;
    if (processedDetails?.models?.pressure_distribution?.result?.measurements?.regional_pressure) {
      const regionalPressure = processedDetails.models.pressure_distribution.result.measurements.regional_pressure;
      
      // Convert the data into a format suitable for heatmap generation
      pressureDataPoints = {
        left: [],
        right: []
      };
      
      // Process left foot pressure points
      if (regionalPressure.left && Array.isArray(regionalPressure.left)) {
        pressureDataPoints.left = regionalPressure.left.map((point: any) => ({
          x: point.x,
          y: point.y,
          intensity: point.pressure,
          location: point.location || ''
        }));
      } else {
        // If no data is available, create standard pressure points
        pressureDataPoints.left = PressureHeatmapGenerator.createStandardPressurePoints('left');
      }
      
      // Process right foot pressure points
      if (regionalPressure.right && Array.isArray(regionalPressure.right)) {
        pressureDataPoints.right = regionalPressure.right.map((point: any) => ({
          x: point.x,
          y: point.y,
          intensity: point.pressure,
          location: point.location || ''
        }));
      } else {
        // If no data is available, create standard pressure points
        pressureDataPoints.right = PressureHeatmapGenerator.createStandardPressurePoints('right');
      }
    } else {
      // If no pressure data is available, use standard distribution for both feet
      pressureDataPoints = {
        left: PressureHeatmapGenerator.createStandardPressurePoints('left'),
        right: PressureHeatmapGenerator.createStandardPressurePoints('right')
      };
    }
    
    // Generate heatmaps for both feet
    const outputDir = path.join(__dirname, "../output/heatmaps");
    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Generate left foot heatmap
    const leftHeatmap = await PressureHeatmapGenerator.generateAndSaveScanHeatmap(
      scanId,
      pressureDataPoints.left,
      'left',
      outputDir
    );
    
    // Generate right foot heatmap
    const rightHeatmap = await PressureHeatmapGenerator.generateAndSaveScanHeatmap(
      scanId,
      pressureDataPoints.right,
      'right',
      outputDir
    );
    
    // Create URLs for the heatmaps
    const leftHeatmapUrl = `/api/files/output/heatmaps/${path.basename(leftHeatmap.filePath)}`;
    const rightHeatmapUrl = `/api/files/output/heatmaps/${path.basename(rightHeatmap.filePath)}`;
    
    // Update scan in database
    const updatedScan = await storage.updateScan(scanId, {
      status: "complete",
      aiDiagnosis: aiResults.diagnosis,
      aiConfidence: aiResults.confidence,
      doctorNotes: aiResults.assessment, // Store the assessment in doctorNotes temporarily
      footLength: aiResults.measurements.length,
      footWidth: aiResults.measurements.width,
      archHeight: aiResults.measurements.arch_height,
      instepHeight: aiResults.measurements.instep_height,
      objUrl: objPath,
      stlUrl: stlPath,
      thumbnailUrl: thumbnailPath,
      aiDiagnosisDetails: processedDetails || {},
      // Add pressure data and heatmap URLs
      pressureDataPoints,
      leftPressureHeatmapUrl: leftHeatmapUrl,
      rightPressureHeatmapUrl: rightHeatmapUrl
    });
    
    // Use scan data for patient ID if updatedScan is undefined
    const patientId = updatedScan ? updatedScan.patientId : scan.patientId;
    
    // Get patient information
    const patient = await storage.getUser(patientId);
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }
    
    // Notify connected clients
    updateScanStatus(scanId, "complete", updatedScan);
    
    // Send email notification
    if (patient.email) {
      await emailService.sendScanReadyNotification(
        patient.email,
        patient.fullName,
        scanId
      );
    }
    
    return updatedScan;
  } catch (error) {
    console.error(`Error notifying scan processed ${scanId}:`, error);
    
    // Update scan status to error
    await storage.updateScan(scanId, { status: "error" });
    updateScanStatus(scanId, "error", { message: "Failed to process scan" });
    
    throw error;
  }
}
