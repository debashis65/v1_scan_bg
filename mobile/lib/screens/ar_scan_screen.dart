import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:arkit_plugin/arkit_plugin.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../services/pose_estimation_service.dart';
import '../services/ai_feedback_service.dart';
import '../models/pose_alignment.dart';
import '../ar/guidance/ghost_model_overlay.dart';
import '../ar/guidance/guidance_controller.dart';
import '../ar/guidance/scan_guidance_overlay.dart';
import '../utilities/stability_detector.dart';

class ARScanScreen extends StatefulWidget {
  const ARScanScreen({Key? key}) : super(key: key);

  @override
  _ARScanScreenState createState() => _ARScanScreenState();
}

class _ARScanScreenState extends State<ARScanScreen> with WidgetsBindingObserver {
  // AR and Camera Controllers
  ARKitController? arKitController;
  CameraController? cameraController;
  List<CameraDescription> cameras = [];
  
  // Services
  PoseEstimationService? poseEstimationService;
  AIFeedbackService aiFeedbackService = AIFeedbackService();
  StabilityDetector stabilityDetector = StabilityDetector();
  GuidanceController guidanceController = GuidanceController();
  
  // AR Guidance
  late GhostModelOverlay ghostModelOverlay;
  
  // Scan State
  String currentScanPosition = 'setup'; // 'setup', 'front', 'left', 'right', 'back', 'top'
  List<File> capturedImages = [];
  bool isCapturing = false;
  bool isStable = false;
  bool isPoseAligned = false;
  String guidanceMessage = "Place your phone on a flat surface";
  
  // Timers and Streams
  Timer? stabilityCheckTimer;
  StreamSubscription<PoseAlignment>? poseSubscription;
  StreamSubscription<AccelerometerEvent>? accelerometerSubscription;
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
    _initializeStabilityDetection();
  }
  
  @override
  void dispose() {
    arKitController?.dispose();
    cameraController?.dispose();
    poseEstimationService?.dispose();
    stabilityCheckTimer?.cancel();
    poseSubscription?.cancel();
    accelerometerSubscription?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
  
  Future<void> _initializeCamera() async {
    try {
      cameras = await availableCameras();
      if (cameras.isNotEmpty) {
        final CameraDescription camera = cameras.firstWhere(
          (camera) => camera.lensDirection == CameraLensDirection.back,
          orElse: () => cameras.first,
        );
        
        cameraController = CameraController(
          camera,
          ResolutionPreset.high,
          enableAudio: false,
        );
        
        await cameraController!.initialize();
        
        // Initialize pose estimation service
        poseEstimationService = PoseEstimationService();
        await poseEstimationService!.initialize(camera);
        
        // Listen to pose alignment updates
        poseSubscription = poseEstimationService!.poseAlignmentStream.listen(_handlePoseUpdate);
        
        setState(() {});
      }
    } catch (e) {
      print('Error initializing camera: $e');
    }
  }
  
  void _initializeStabilityDetection() {
    // Monitor accelerometer to detect if phone is stable on surface
    accelerometerSubscription = accelerometerEvents.listen((AccelerometerEvent event) {
      final isCurrentlyStable = stabilityDetector.isStable(event);
      
      if (isCurrentlyStable != isStable) {
        setState(() {
          isStable = isCurrentlyStable;
          if (!isStable) {
            guidanceMessage = "Phone moved! Place it back on a flat surface";
          } else if (currentScanPosition == 'setup') {
            guidanceMessage = "Great! Phone is stable. Preparing scan...";
            // After stability is confirmed, proceed to first scan position
            Future.delayed(Duration(seconds: 2), () {
              if (isStable) {
                _proceedToNextScanPosition();
              }
            });
          }
        });
      }
    });
  }
  
  void _handlePoseUpdate(PoseAlignment poseAlignment) {
    if (currentScanPosition == 'setup') return; // No pose guidance during setup
    
    setState(() {
      isPoseAligned = poseAlignment.isAlignmentGoodForCapture;
      guidanceMessage = poseAlignment.guidanceMessage;
    });
    
    // Update ghost model color based on alignment
    ghostModelOverlay.updatePositionFeedback(poseAlignment.overallAlignment);
    
    // If pose is aligned properly and the phone is stable, capture automatically
    if (isPoseAligned && isStable && !isCapturing) {
      _captureImage();
    }
  }
  
  void _onARKitViewCreated(ARKitController controller) {
    arKitController = controller;
    ghostModelOverlay = GhostModelOverlay(arController: arKitController);
    
    // Initial setup phase - no ghost model yet
    if (currentScanPosition != 'setup') {
      ghostModelOverlay.showGhostModelForPosition(currentScanPosition);
    }
  }
  
  Future<void> _captureImage() async {
    if (isCapturing || cameraController == null || !cameraController!.value.isInitialized) {
      return;
    }
    
    setState(() {
      isCapturing = true;
      guidanceMessage = "Hold still, capturing image...";
    });
    
    try {
      final XFile imageFile = await cameraController!.takePicture();
      final File savedImage = File(imageFile.path);
      
      setState(() {
        capturedImages.add(savedImage);
        guidanceMessage = "Capture successful!";
      });
      
      // Provide haptic feedback
      HapticFeedback.heavyImpact();
      
      // Check if we have completed all positions
      if (_isAllPositionsCaptured()) {
        _finishScan();
      } else {
        // Proceed to next position after a short delay
        Future.delayed(Duration(seconds: 1), () {
          _proceedToNextScanPosition();
        });
      }
    } catch (e) {
      setState(() {
        guidanceMessage = "Error capturing image. Try again.";
        isCapturing = false;
      });
      print('Error capturing image: $e');
    }
  }
  
  void _proceedToNextScanPosition() {
    String nextPosition;
    
    // Determine next position in the sequence
    switch (currentScanPosition) {
      case 'setup':
        nextPosition = 'front';
        break;
      case 'front':
        nextPosition = 'left';
        break;
      case 'left':
        nextPosition = 'right';
        break;
      case 'right':
        nextPosition = 'back';
        break;
      case 'back':
        nextPosition = 'top';
        break;
      default:
        nextPosition = 'front'; // Restart sequence if needed
    }
    
    setState(() {
      currentScanPosition = nextPosition;
      isCapturing = false;
      isPoseAligned = false;
      guidanceMessage = "Move to the ${nextPosition.toUpperCase()} position";
    });
    
    // Update AR guidance for new position
    if (arKitController != null) {
      ghostModelOverlay.showGhostModelForPosition(nextPosition);
    }
  }
  
  bool _isAllPositionsCaptured() {
    // Check if we have captured all 5 required positions
    return capturedImages.length >= 5;
  }
  
  void _finishScan() {
    setState(() {
      guidanceMessage = "Scan complete! Processing your images...";
    });
    
    // Upload images for processing
    _uploadImages();
  }
  
  Future<void> _uploadImages() async {
    try {
      final result = await aiFeedbackService.uploadScanImages(capturedImages);
      
      if (result.success) {
        // Navigate to results page with scan ID
        Navigator.pushReplacementNamed(
          context, 
          '/scan_results',
          arguments: {'scanId': result.scanId},
        );
      } else {
        // Show error
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: ${result.message}')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // AR View
          Positioned.fill(
            child: ARKitSceneView(
              onARKitViewCreated: _onARKitViewCreated,
              enablePanRecognizer: false,
              enableRotationRecognizer: false,
              enableTapRecognizer: false,
            ),
          ),
          
          // Scan Guidance Overlay
          ScanGuidanceOverlay(
            currentPosition: currentScanPosition,
            isStable: isStable,
            isPoseAligned: isPoseAligned,
            guidanceMessage: guidanceMessage,
            capturedCount: capturedImages.length,
            totalPositions: 5,
          ),
          
          // Cancel button
          Positioned(
            top: 40,
            left: 20,
            child: SafeArea(
              child: IconButton(
                icon: Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}