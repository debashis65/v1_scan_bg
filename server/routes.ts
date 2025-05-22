import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { setupAuth, isAuthenticated, hasRole, validateResourceToken } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { emailService } from "./email";
import {
  processScan,
  registerScanSocket,
  notifyScanProcessed,
  updateScanStatus,
} from "./scan-processor";
import { exportRouter } from "./export-routes";
import multer from "multer";
import { randomUUID } from "crypto";
import { hashPassword } from "./auth";
import { eq, and, desc, or, isNull, sql, like, ne, asc } from "drizzle-orm";
import { users, apiKeys, patientProfiles, scans, doctorProfiles } from "../shared/schema";
import { UserRole, ScanStatus, ErrorType } from "../shared/constants";
import { PressureHeatmapGenerator, Point } from "./utils/heatmap-generator";
import * as fs from "fs";
import { promisify } from "util";
import { createCanvas, loadImage } from "canvas";

// Function to validate if an image contains a foot using a simpler image processing approach
async function validateFootDetection(imagePath: string): Promise<{
  isFootDetected: boolean;
  confidence: number;
  footType?: string;
  imageQuality?: string;
}> {
  try {
    // Load the image
    const image = await loadImage(imagePath);
    
    // Create canvas with the same dimensions as the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the image on the canvas
    ctx.drawImage(image, 0, 0);
    
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate the brightness histogram to detect skin tones
    const brightness = new Array(256).fill(0);
    let totalPixels = 0;
    
    // Calculate brightness for each pixel and populate histogram
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (simple average)
      const value = Math.floor((r + g + b) / 3);
      brightness[value]++;
      totalPixels++;
    }
    
    // Analyze histogram to detect skin tones (skin typically has brightness values in middle range)
    // Foot images usually have a large portion (> 15%) of pixels in the skin tone range
    const skinToneStart = 80;
    const skinToneEnd = 200;
    
    let skinTonePixels = 0;
    for (let i = skinToneStart; i <= skinToneEnd; i++) {
      skinTonePixels += brightness[i];
    }
    
    const skinToneRatio = skinTonePixels / totalPixels;
    
    // Simple analysis - if enough skin tone pixels are present, we'll assume it's a foot
    const isFootByColor = skinToneRatio > 0.15;
    
    // Analyze aspect ratio of the non-background area of the image (simplified approach)
    // Most foot pictures have a specific aspect ratio
    let footAspectRatioConfidence = 0.5; // Default middle confidence
    
    if (image.width / image.height > 0.6 && image.width / image.height < 1.8) {
      footAspectRatioConfidence = 0.8;
    }
    
    // Combine color analysis and aspect ratio for overall detection
    const isFootDetected = isFootByColor;
    const confidence = isFootByColor ? 0.7 * skinToneRatio + 0.3 * footAspectRatioConfidence : 0.1;
    
    // Determine image quality based on average brightness and contrast
    let sumBrightness = 0;
    for (let i = 0; i < 256; i++) {
      sumBrightness += i * brightness[i];
    }
    const avgBrightness = sumBrightness / totalPixels;
    
    // Calculate standard deviation for contrast
    let sumSquaredDiff = 0;
    for (let i = 0; i < 256; i++) {
      sumSquaredDiff += brightness[i] * Math.pow(i - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(sumSquaredDiff / totalPixels);
    
    // Determine image quality based on brightness and contrast
    let imageQuality = "poor";
    if (stdDev > 40 && avgBrightness > 50 && avgBrightness < 200) {
      imageQuality = "good";
    } else if (stdDev > 20 && avgBrightness > 30 && avgBrightness < 220) {
      imageQuality = "acceptable";
    }
    
    // Use a heuristic for foot type based on brightness distribution
    // This is highly simplified and would be replaced with actual ML model in production
    let footType = "unknown";
    if (isFootDetected && confidence > 0.6) {
      const midToneBrightness = brightness.slice(100, 150).reduce((a, b) => a + b, 0) / totalPixels;
      const darkBrightness = brightness.slice(50, 100).reduce((a, b) => a + b, 0) / totalPixels;
      
      if (midToneBrightness > 0.3) {
        footType = "flat";
      } else if (darkBrightness > 0.2) {
        footType = "high arch";
      } else {
        footType = "normal";
      }
    }
    
    return {
      isFootDetected,
      confidence,
      footType: isFootDetected ? footType : undefined,
      imageQuality
    };
  } catch (error) {
    console.error("Error in foot detection:", error);
    return {
      isFootDetected: false,
      confidence: 0,
      imageQuality: "error"
    };
  }
}

// Setup file upload
const storage_engine = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    // Ensure uploads directory exists
    try {
      require("fs").mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      console.error("Error creating uploads directory:", err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + "-" + randomUUID();
    cb(null, uniquePrefix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_engine,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);
  
  // Serve static files from uploads and output directories
  app.use('/api/files/uploads', express.static(path.join(__dirname, '../uploads')));
  app.use('/api/files/output', express.static(path.join(__dirname, '../output')));
  app.use('/sample', express.static(path.join(__dirname, '../client/public/sample')));
  
  // Use export routes
  app.use('/api/export', exportRouter);

  // Add simple welcome route
  app.get("/", (req, res) => {
    res.json({
      name: "Barogrip API",
      version: "1.0.0",
      description: "3D foot scanning platform with AI diagnosis capabilities",
      endpoints: [
        "/api/health",
        "/api/user",
        "/api/login",
        "/api/register",
        "/api/logout",
        "/api/patient/*",
        "/api/doctor/*",
        "/api/scans/*",
        "/api/prescriptions/*",
        "/api/export/scan-pdf/:scanId",
        "/api/export/patient-report/:patientId",
        "/api/export/prescriptions-csv/:patientId"
      ]
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle subscription to scan updates
        if (data.type === "subscribe" && data.scanId) {
          registerScanSocket(data.scanId, ws);
          ws.send(JSON.stringify({ type: "subscribed", scanId: data.scanId }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
  });

  // ----- Patient Profile Routes -----
  
  // Get current patient profile
  app.get("/api/patient/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getPatientProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update patient profile
  app.put("/api/patient/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.updatePatientProfile(req.user!.id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ----- Doctor Profile Routes -----
  
  // Get current doctor profile
  app.get("/api/doctor/profile", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const profile = await storage.getDoctorProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update doctor profile
  app.put("/api/doctor/profile", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const profile = await storage.updateDoctorProfile(req.user!.id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ----- Scan Routes -----
  
  // Validate foot detection in image using existing canvas library
  app.post(
    "/api/validate-foot-detection",
    isAuthenticated,
    upload.single("image"),
    async (req, res) => {
      try {
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ 
            success: false, 
            message: "No image uploaded" 
          });
        }
        
        // Get the uploaded image path
        const imagePath = path.join(__dirname, "..", file.path);
        
        try {
          // Use the shared canvas-based implementation from our existing heatmap generator
          // to perform foot detection analysis
          const image = await loadImage(imagePath);
          
          // Create canvas with the same dimensions as the image
          const canvas = createCanvas(image.width, image.height);
          const ctx = canvas.getContext('2d');
          
          // Draw the image on the canvas
          ctx.drawImage(image, 0, 0);
          
          // Get the image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Calculate the brightness histogram to detect skin tones
          const brightness = new Array(256).fill(0);
          let totalPixels = 0;
          
          // Calculate brightness for each pixel and populate histogram
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate brightness (simple average)
            const value = Math.floor((r + g + b) / 3);
            brightness[value]++;
            totalPixels++;
          }
          
          // Analyze histogram to detect skin tones (skin typically has brightness values in middle range)
          // Foot images usually have a large portion (> 15%) of pixels in the skin tone range
          const skinToneStart = 80;
          const skinToneEnd = 200;
          
          let skinTonePixels = 0;
          for (let i = skinToneStart; i <= skinToneEnd; i++) {
            skinTonePixels += brightness[i];
          }
          
          const skinToneRatio = skinTonePixels / totalPixels;
          
          // Simple analysis - if enough skin tone pixels are present, we'll assume it's a foot
          const isFootByColor = skinToneRatio > 0.15;
          
          // Analyze aspect ratio of the non-background area of the image (simplified approach)
          // Most foot pictures have a specific aspect ratio
          let footAspectRatioConfidence = 0.5; // Default middle confidence
          
          if (image.width / image.height > 0.6 && image.width / image.height < 1.8) {
            footAspectRatioConfidence = 0.8;
          }
          
          // Combine color analysis and aspect ratio for overall detection
          const isFootDetected = isFootByColor;
          const confidence = isFootByColor ? 0.7 * skinToneRatio + 0.3 * footAspectRatioConfidence : 0.1;
          
          // Determine image quality based on average brightness and contrast
          let sumBrightness = 0;
          for (let i = 0; i < 256; i++) {
            sumBrightness += i * brightness[i];
          }
          const avgBrightness = sumBrightness / totalPixels;
          
          // Calculate standard deviation for contrast
          let sumSquaredDiff = 0;
          for (let i = 0; i < 256; i++) {
            sumSquaredDiff += brightness[i] * Math.pow(i - avgBrightness, 2);
          }
          const stdDev = Math.sqrt(sumSquaredDiff / totalPixels);
          
          // Determine image quality based on brightness and contrast
          let imageQuality = "poor";
          if (stdDev > 40 && avgBrightness > 50 && avgBrightness < 200) {
            imageQuality = "good";
          } else if (stdDev > 20 && avgBrightness > 30 && avgBrightness < 220) {
            imageQuality = "acceptable";
          }
          
          // Use a heuristic for foot type based on brightness distribution
          let footType = "unknown";
          if (isFootDetected && confidence > 0.6) {
            const midToneBrightness = brightness.slice(100, 150).reduce((a, b) => a + b, 0) / totalPixels;
            const darkBrightness = brightness.slice(50, 100).reduce((a, b) => a + b, 0) / totalPixels;
            
            if (midToneBrightness > 0.3) {
              footType = "flat";
            } else if (darkBrightness > 0.2) {
              footType = "high arch";
            } else {
              footType = "normal";
            }
          }
          
          if (isFootDetected) {
            res.status(200).json({
              success: true,
              isFootDetected: true,
              confidence,
              message: "Foot detected successfully",
              footType: footType || "unknown",
              imageQuality
            });
          } else {
            res.status(200).json({
              success: true,
              isFootDetected: false,
              confidence,
              message: "No foot detected in the image",
              recommendations: [
                "Make sure your foot is fully visible in the frame",
                "Ensure adequate lighting",
                "Position the camera at the recommended distance"
              ]
            });
          }
          
          // Clean up the temporary image
          fs.unlinkSync(imagePath);
          
        } catch (validationError) {
          console.error("Error during foot validation:", validationError);
          res.status(200).json({
            success: false,
            isFootDetected: false,
            message: "Error processing image",
            error: validationError instanceof Error ? validationError.message : "Unknown error"
          });
          
          // Clean up the temporary image even if validation fails
          try {
            fs.unlinkSync(imagePath);
          } catch (cleanupError) {
            console.error("Error cleaning up image file:", cleanupError);
          }
        }
      } catch (error) {
        console.error("Error handling foot detection validation:", error);
        res.status(500).json({ 
          success: false, 
          message: "Server error during foot detection validation" 
        });
      }
    }
  );

  // Upload scan images
  app.post(
    "/api/scans",
    isAuthenticated,
    upload.array("images", 12),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }
        
        // Create new scan
        const scan = await storage.createScan({
          patientId: req.user!.id,
          status: "pending",
        });
        
        // Store image paths
        const imageUrls = await Promise.all(
          files.map(async (file, index) => {
            const imagePath = `/uploads/${file.filename}`;
            
            // Add to scan images
            await storage.addScanImage({
              scanId: scan.id,
              imageUrl: imagePath,
              position: `position_${index}`,
            });
            
            return imagePath;
          })
        );
        
        // Start processing scan in the background
        processScan(scan.id, imageUrls).catch(console.error);
        
        res.status(201).json({
          scanId: scan.id,
          status: scan.status,
          message: "Scan created and processing started",
        });
      } catch (error) {
        console.error("Error uploading scan:", error);
        res.status(500).json({ message: "Server error" });
      }
    }
  );

  // Get all scans for current patient
  app.get("/api/patient/scans", isAuthenticated, async (req, res) => {
    try {
      const scans = await storage.getPatientScans(req.user!.id);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get recent scans for doctor (all scans)
  app.get("/api/doctor/recent-scans", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      // For demo purposes, get all recent scans from all patients
      const recentScans = await storage.getRecentScans(20); // Get last 20 scans
      res.json(recentScans);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get specific scan
  app.get("/api/scans/:id", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(scan);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get detailed scan advanced measurements 
  app.get("/api/scans/:id/advanced", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check if diagnosis details exist
      if (!scan.aiDiagnosisDetails) {
        return res.status(404).json({ 
          message: "No advanced measurements available for this scan",
          scan_id: scanId
        });
      }
      
      // Extract advanced measurements from the diagnosis details
      const details = scan.aiDiagnosisDetails as any;
      const advancedData = {
        scan_id: scanId,
        timestamp: scan.updatedAt,
        advanced_measurements: details.advanced_measurements || null,
        pressure_distribution: details.pressure_distribution || null,
        arch_type_analysis: details.arch_type_analysis || null,
        validation_results: details.validation_results || null
      };
      
      res.json(advancedData);
    } catch (error) {
      console.error(`Error fetching advanced measurements for scan ${req.params.id}:`, error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get specific measurement model data
  app.get("/api/scans/:id/model/:modelName", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const modelName = req.params.modelName;
      
      // Validate modelName
      const validModels = [
        'advanced_measurements', 
        'pressure_distribution', 
        'arch_type_analysis'
      ];
      
      if (!validModels.includes(modelName)) {
        return res.status(400).json({ 
          message: `Invalid model name. Must be one of: ${validModels.join(', ')}` 
        });
      }
      
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check if diagnosis details exist
      if (!scan.aiDiagnosisDetails) {
        return res.status(404).json({ 
          message: "No advanced measurements available for this scan",
          scan_id: scanId
        });
      }
      
      // Get the specific model data
      const details = scan.aiDiagnosisDetails as any;
      const modelData = details[modelName];
      
      if (!modelData) {
        return res.status(404).json({ 
          message: `No ${modelName} data available for this scan`,
          scan_id: scanId
        });
      }
      
      res.json({
        scan_id: scanId,
        timestamp: scan.updatedAt,
        model_name: modelName,
        data: modelData
      });
    } catch (error) {
      console.error(`Error fetching model data for scan ${req.params.id}:`, error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get scan images
  app.get("/api/scans/:id/images", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const images = await storage.getScanImages(scanId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Update scan (doctor only)
  app.put("/api/scans/:id", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Update scan with doctor notes and doctorId
      const updatedScan = await storage.updateScan(scanId, {
        ...req.body,
        doctorId: req.user!.id,
      });
      
      res.json(updatedScan);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ----- Prescription Routes -----
  
  // Create prescription (doctor only)
  app.post("/api/prescriptions", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const { scanId, patientId, title, description, recommendedProduct, recommendedExercises } = req.body;
      
      // Validate required fields
      if (!scanId || !patientId || !title || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Create prescription
      const prescription = await storage.createPrescription({
        scanId,
        patientId,
        doctorId: req.user!.id,
        title,
        description,
        recommendedProduct,
        recommendedExercises,
      });
      
      // Get patient and doctor info for email
      const patient = await storage.getUser(patientId);
      
      if (patient && patient.email) {
        // Send notification email
        await emailService.sendNewPrescriptionNotification(
          patient.email,
          patient.fullName,
          req.user!.fullName,
          title
        );
      }
      
      res.status(201).json(prescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get prescriptions for scan
  app.get("/api/scans/:id/prescriptions", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan's prescriptions
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const prescriptions = await storage.getScanPrescriptions(scanId);
      res.json(prescriptions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get all prescriptions for current patient
  app.get("/api/patient/prescriptions", isAuthenticated, async (req, res) => {
    try {
      const prescriptions = await storage.getPatientPrescriptions(req.user!.id);
      res.json(prescriptions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ----- Consultation/Video Chat Routes -----
  
  // Create a consultation appointment
  app.post("/api/consultations", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const { patientId, scheduledTime, duration, platform, notes, scanId } = req.body;
      
      if (!patientId || !scheduledTime) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get doctor profile to get meeting links
      const doctorProfile = await storage.getDoctorProfile(req.user!.id);
      if (!doctorProfile) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }
      
      // Get meeting link based on preferred platform
      let meetingLink;
      if (platform === "zoom" && doctorProfile.zoomLink) {
        meetingLink = doctorProfile.zoomLink;
      } else if (doctorProfile.googleMeetLink) {
        meetingLink = doctorProfile.googleMeetLink;
      } else {
        return res.status(400).json({ 
          message: "No meeting link available. Please set up your meeting links in your profile."
        });
      }
      
      // Create consultation
      const consultation = await storage.createConsultation({
        doctorId: req.user!.id,
        patientId,
        scheduledTime: new Date(scheduledTime),
        duration: duration || 30, // Default to 30 minutes
        meetingLink,
        platform: platform || doctorProfile.preferredConsultationPlatform || "google_meet",
        notes,
        scanId,
        status: "scheduled",
      });
      
      // Get patient info for email
      const patient = await storage.getUser(patientId);
      
      if (patient && patient.email) {
        // Send notification email
        await emailService.sendNewPrescriptionNotification(
          patient.email,
          patient.fullName,
          req.user!.fullName,
          `Video Consultation Scheduled for ${new Date(scheduledTime).toLocaleString()}`
        );
      }
      
      res.status(201).json(consultation);
    } catch (error) {
      console.error("Error creating consultation:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get doctor's consultations
  app.get("/api/doctor/consultations", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const consultations = await storage.getDoctorConsultations(req.user!.id);
      res.json(consultations);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get patient's consultations
  app.get("/api/patient/consultations", isAuthenticated, async (req, res) => {
    try {
      const consultations = await storage.getPatientConsultations(req.user!.id);
      res.json(consultations);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update consultation status
  app.put("/api/consultations/:id", isAuthenticated, async (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      const consultation = await storage.getConsultation(consultationId);
      
      if (!consultation) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      
      // Check if user is authorized (must be doctor or the patient)
      if (req.user!.role !== UserRole.DOCTOR && consultation.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedConsultation = await storage.updateConsultation(consultationId, req.body);
      res.json(updatedConsultation);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update doctor's consultation settings (meeting links)
  app.put("/api/doctor/consultation-settings", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const { googleMeetLink, zoomLink, preferredConsultationPlatform } = req.body;
      
      // Update doctor profile
      const updatedProfile = await storage.updateDoctorProfile(req.user!.id, {
        googleMeetLink,
        zoomLink,
        preferredConsultationPlatform
      });
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // ----- API Key Management Routes -----
  
  // Get all API keys for the current user
  app.get("/api/api-keys", isAuthenticated, async (req, res) => {
    try {
      // Query the database for user's API keys
      const userApiKeys = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, req.user!.id))
        .orderBy(desc(apiKeys.createdAt));
      
      // Filter out sensitive information
      const safeKeys = userApiKeys.map(key => ({
        id: key.id,
        description: key.description,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed,
        expiresAt: key.expiresAt,
        permissions: key.permissions,
        // Only show the first and last 4 characters of the API key for security
        maskedKey: key.apiKey ? `${key.apiKey.substring(0, 4)}...${key.apiKey.substring(key.apiKey.length - 4)}` : null
      }));
      
      res.json(safeKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Generate new API key
  app.post("/api/api-keys", isAuthenticated, async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Generate new API key
      const apiKey = await storage.generateApiKey(req.user!.id, description);
      
      res.status(201).json({ 
        message: "API key created successfully", 
        apiKey, 
        description,
        note: "IMPORTANT: This is the only time this API key will be shown in full. Please save it securely." 
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      res.status(500).json({ message: "Error generating API key" });
    }
  });
  
  // Revoke API key
  app.post("/api/api-keys/:key/revoke", isAuthenticated, async (req, res) => {
    try {
      const apiKeyValue = req.params.key;
      
      // First verify this API key belongs to the current user
      const keyResults = await db
        .select()
        .from(apiKeys)
        .where(and(
          eq(apiKeys.apiKey, apiKeyValue),
          eq(apiKeys.userId, req.user!.id)
        ));
      
      if (!keyResults || keyResults.length === 0) {
        return res.status(404).json({ message: "API key not found or does not belong to you" });
      }
      
      // Revoke the key
      const revoked = await storage.revokeApiKey(apiKeyValue);
      
      if (!revoked) {
        return res.status(500).json({ message: "Failed to revoke API key" });
      }
      
      res.json({ message: "API key revoked successfully" });
    } catch (error) {
      console.error("Error revoking API key:", error);
      res.status(500).json({ message: "Error revoking API key" });
    }
  });
  
  // ----- Doctor-specific Routes -----
  
  // Get all patients (doctors only)
  app.get("/api/patients", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      // Get all users with role='patient'
      const patients = await db
        .select()
        .from(users)
        .where(eq(users.role, UserRole.PATIENT));
      
      // Get patient profiles for these users
      const patientIds = patients.map(patient => patient.id);
      const profiles = patientIds.length > 0 
        ? await db
            .select()
            .from(patientProfiles)
            .where(or(...patientIds.map(id => eq(patientProfiles.userId, id))))
        : [];
      
      // Combine user data with profile data
      const patientsWithProfiles = patients.map(patient => {
        const profile = profiles.find(profile => profile.userId === patient.id);
        const { password, ...patientWithoutPassword } = patient;
        return {
          ...patientWithoutPassword,
          profile: profile || null
        };
      });
      
      res.json(patientsWithProfiles);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get patient details (doctors only)
  app.get("/api/patients/:id", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Get patient
      const [patient] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, patientId),
          eq(users.role, UserRole.PATIENT)
        ));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Get patient profile
      const [profile] = await db
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId));
      
      // Remove password
      const { password, ...patientWithoutPassword } = patient;
      
      res.json({
        ...patientWithoutPassword,
        profile: profile || null
      });
    } catch (error) {
      console.error("Error fetching patient details:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get patient scans (doctors only)
  app.get("/api/patients/:id/scans", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Check if patient exists
      const patient = await storage.getUser(patientId);
      if (!patient || patient.role !== UserRole.PATIENT) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const scans = await storage.getPatientScans(patientId);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint for scan processor to send incremental status updates
  app.post("/api/processor/scan-status", async (req, res) => {
    try {
      const { scanId, status, message } = req.body;
      
      if (!scanId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Update scan status in database
      await storage.updateScan(scanId, { status });
      
      // Send WebSocket update to connected clients
      updateScanStatus(scanId, status, { message });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating scan status:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Callback endpoint for scan processor to report scan completion
  app.post("/api/processor/scan-complete", async (req, res) => {
    try {
      const { scanId, objPath, stlPath, thumbnailPath, aiResults } = req.body;
      
      if (!scanId || !aiResults) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const updatedScan = await notifyScanProcessed(
        scanId,
        objPath,
        stlPath,
        thumbnailPath,
        aiResults
      );
      
      res.json({ success: true, scan: updatedScan });
    } catch (error) {
      console.error("Error updating scan status:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Endpoint for scan processor to get patient data for a scan
  app.get("/api/processor/patient-data/:scanId", async (req, res) => {
    try {
      const scanId = parseInt(req.params.scanId);
      
      if (isNaN(scanId)) {
        return res.status(400).json({ message: "Invalid scan ID" });
      }
      
      // Get scan from database to find the patient
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Get patient profile
      const patientProfile = await storage.getPatientProfile(scan.patientId);
      
      if (!patientProfile) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      
      // Get the user data for basic information
      const user = await storage.getUser(scan.patientId);
      
      // Create patient context object with all available data
      const patientData = {
        // Basic information
        userId: scan.patientId,
        fullName: user?.fullName,
        
        // Medical information from patient profile
        age: patientProfile.age,
        gender: patientProfile.gender,
        height: patientProfile.height,
        weight: patientProfile.weight,
        shoeSize: patientProfile.shoeSize,
        shoeSizeUnit: patientProfile.shoeSizeUnit,
        usedOrthopedicInsoles: patientProfile.usedOrthopedicInsoles,
        hasDiabetes: patientProfile.hasDiabetes,
        hasHeelSpur: patientProfile.hasHeelSpur,
        footPain: patientProfile.footPain,
      };
      
      res.json(patientData);
    } catch (error) {
      console.error("Error fetching patient data:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ----- Pressure Heatmap Routes -----

  // Generate heatmap image for a scan
  app.post("/api/scans/:id/heatmap/:foot", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const footSide = req.params.foot as 'left' | 'right';
      
      // Validate footSide parameter
      if (footSide !== 'left' && footSide !== 'right') {
        return res.status(400).json({ 
          message: "Invalid foot side parameter. Must be 'left' or 'right'" 
        });
      }
      
      // Get scan
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get pressure data from scan or request body
      let pressurePoints: Point[] = [];
      
      // First, try to get from request body if provided
      if (req.body?.pressurePoints && Array.isArray(req.body.pressurePoints)) {
        pressurePoints = req.body.pressurePoints;
      }
      // If not in request body, try to get from scan data
      else if (scan.pressureDataPoints) {
        const allPoints = scan.pressureDataPoints as any;
        if (allPoints[footSide] && Array.isArray(allPoints[footSide])) {
          pressurePoints = allPoints[footSide];
        }
      }
      
      // If no pressure data found, use standard distribution
      if (!pressurePoints || pressurePoints.length === 0) {
        pressurePoints = PressureHeatmapGenerator.createStandardPressurePoints(footSide);
      }
      
      // Ensure output directory exists
      const outputDir = path.join(__dirname, "../output/heatmaps");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Generate heatmap
      const { filePath, dataUrl } = await PressureHeatmapGenerator.generateAndSaveScanHeatmap(
        scanId,
        pressurePoints,
        footSide,
        outputDir
      );
      
      // Update scan with heatmap URLs
      const heatmapUrl = `/api/files/output/heatmaps/${path.basename(filePath)}`;
      
      const updatedScan = await storage.updateScan(scanId, {
        ...(footSide === 'left' ? { leftPressureHeatmapUrl: heatmapUrl } : { rightPressureHeatmapUrl: heatmapUrl }),
        updatedAt: new Date()
      });
      
      res.json({
        success: true,
        scanId,
        footSide,
        heatmapUrl,
        dataUrl,
        pressurePointsCount: pressurePoints.length
      });
    } catch (error) {
      console.error(`Error generating heatmap for scan ${req.params.id}:`, error);
      res.status(500).json({ message: "Error generating heatmap", error: String(error) });
    }
  });
  
  // Get pressure data for a scan
  app.get("/api/scans/:id/pressure-data/:foot", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const footSide = req.params.foot as 'left' | 'right';
      
      // Validate footSide parameter
      if (footSide !== 'left' && footSide !== 'right') {
        return res.status(400).json({ 
          message: "Invalid foot side parameter. Must be 'left' or 'right'" 
        });
      }
      
      // Get scan
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // If the scan has pressure data, return it
      if (scan.pressureDataPoints) {
        const allPoints = scan.pressureDataPoints as any;
        if (allPoints[footSide] && Array.isArray(allPoints[footSide])) {
          return res.json({
            scanId,
            footSide,
            pressurePoints: allPoints[footSide]
          });
        }
      }
      
      // If no pressure data found, return standard distribution
      const standardPoints = PressureHeatmapGenerator.createStandardPressurePoints(footSide);
      res.json({
        scanId,
        footSide,
        pressurePoints: standardPoints,
        isStandardDistribution: true
      });
    } catch (error) {
      console.error(`Error fetching pressure data for scan ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching pressure data", error: String(error) });
    }
  });
  
  // Get heatmap for a scan
  app.get("/api/scans/:id/heatmap/:foot", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const footSide = req.params.foot as 'left' | 'right';
      
      // Validate footSide parameter
      if (footSide !== 'left' && footSide !== 'right') {
        return res.status(400).json({ 
          message: "Invalid foot side parameter. Must be 'left' or 'right'" 
        });
      }
      
      // Get scan
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check if heatmap already exists
      const heatmapUrl = footSide === 'left' ? scan.leftPressureHeatmapUrl : scan.rightPressureHeatmapUrl;
      
      if (heatmapUrl) {
        return res.json({
          scanId,
          footSide,
          heatmapUrl,
          exists: true
        });
      }
      
      // If not, return information that it needs to be generated
      res.json({
        scanId,
        footSide,
        exists: false,
        message: "Heatmap not generated yet. Use POST to generate."
      });
    } catch (error) {
      console.error(`Error fetching heatmap for scan ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching heatmap", error: String(error) });
    }
  });
  
  // Get diagnostic report for a scan
  app.get("/api/scans/:id/report", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to view this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Path to the scan's analysis results JSON file
      const analysisDir = path.join(__dirname, "../output");
      const resultsPath = path.join(analysisDir, "analysis_results.json");
      
      // Check if analysis results file exists
      if (!fs.existsSync(resultsPath)) {
        return res.status(404).json({
          scanId,
          exists: false,
          message: "Analysis results not found"
        });
      }
      
      // Read the analysis results to get the report path
      const analysisResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      if (!analysisResults.diagnostic_report || !analysisResults.diagnostic_report.path) {
        return res.json({
          scanId,
          exists: false,
          message: "Diagnostic report not generated yet"
        });
      }
      
      // Convert the relative path in the analysis results to an absolute path
      const relativeReportPath = analysisResults.diagnostic_report.path;
      
      // Check if the report file exists
      if (!fs.existsSync(path.resolve(analysisDir, relativeReportPath))) {
        return res.json({
          scanId,
          exists: false,
          message: "Diagnostic report file not found"
        });
      }
      
      // Create a URL for accessing the report through the static file route
      // The path will be something like ../output/reports/scan_123_report.pdf
      // We need to convert it to /api/files/output/reports/scan_123_report.pdf
      const reportFileName = path.basename(relativeReportPath);
      const reportUrl = `/api/files/output/reports/${reportFileName}`;
      
      return res.json({
        scanId,
        reportUrl,
        exists: true,
        generatedAt: analysisResults.diagnostic_report.generated_at
      });
    } catch (error) {
      console.error(`Error fetching diagnostic report for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error fetching diagnostic report", 
        error: String(error)
      });
    }
  });

  // ----- Scan Version Routes -----
  
  // Get scan version history
  app.get("/api/scans/:id/versions", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      
      // Check if scan exists and user has access
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get version history
      const versions = await storage.getScanVersions(scanId);
      
      // Map versions to a more client-friendly format
      const formattedVersions = versions.map(version => ({
        versionNumber: version.versionNumber,
        changedBy: version.changedBy,
        changeReason: version.changeReason,
        createdAt: version.createdAt,
        id: version.id
      }));
      
      res.json(formattedVersions);
    } catch (error) {
      console.error(`Error getting scan versions for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error getting scan versions", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Create a new version of a scan (before making changes)
  app.post("/api/scans/:id/versions", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Change reason is required" });
      }
      
      // Check if scan exists
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Create a new version
      const version = await storage.createScanVersion(scanId, req.user!.id, reason);
      
      res.status(201).json({
        versionNumber: version.versionNumber,
        changedBy: version.changedBy,
        changeReason: version.changeReason,
        createdAt: version.createdAt,
        id: version.id
      });
    } catch (error) {
      console.error(`Error creating scan version for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error creating scan version", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get specific version details
  app.get("/api/scans/:id/versions/:versionNumber", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const versionNumber = parseInt(req.params.versionNumber);
      
      // Check if scan exists and user has access
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get the specific version
      const version = await storage.getScanVersion(scanId, versionNumber);
      
      if (!version) {
        return res.status(404).json({ message: `Version ${versionNumber} not found` });
      }
      
      res.json(version);
    } catch (error) {
      console.error(`Error getting scan version ${req.params.versionNumber} for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error getting scan version", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Restore a scan version
  app.post("/api/scans/:id/versions/:versionNumber/restore", isAuthenticated, hasRole(UserRole.DOCTOR), async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const versionNumber = parseInt(req.params.versionNumber);
      
      // Check if scan exists
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Restore the version
      const restoredScan = await storage.restoreScanVersion(scanId, versionNumber, req.user!.id);
      
      if (!restoredScan) {
        return res.status(404).json({ message: `Version ${versionNumber} could not be restored` });
      }
      
      res.json({
        message: `Successfully restored scan to version ${versionNumber}`,
        scan: restoredScan
      });
    } catch (error) {
      console.error(`Error restoring scan version ${req.params.versionNumber} for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error restoring scan version", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Compare two versions of a scan
  app.get("/api/scans/:id/versions/compare", isAuthenticated, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const version1 = parseInt(req.query.v1 as string);
      const version2 = parseInt(req.query.v2 as string);
      
      if (isNaN(version1) || isNaN(version2)) {
        return res.status(400).json({ message: "Invalid version numbers. Provide v1 and v2 query parameters." });
      }
      
      // Check if scan exists and user has access
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }
      
      // Check if user is authorized to access this scan
      if (req.user!.role === UserRole.PATIENT && scan.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Compare the versions
      const differences = await storage.compareScanVersions(scanId, version1, version2);
      
      res.json({
        scanId,
        version1,
        version2,
        differences
      });
    } catch (error) {
      console.error(`Error comparing scan versions for scan ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error comparing scan versions", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}
