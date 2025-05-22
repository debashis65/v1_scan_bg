import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:haptic_feedback/haptic_feedback.dart';
import 'package:lottie/lottie.dart';

import '../services/foot_detection_service.dart';
import '../widgets/scan_guide_overlay.dart';
import '../widgets/camera_controls.dart';
import '../config/scan_config.dart';
import '../models/scan_position.dart';

class ScanCameraScreen extends StatefulWidget {
  const ScanCameraScreen({Key? key}) : super(key: key);

  @override
  _ScanCameraScreenState createState() => _ScanCameraScreenState();
}

class _ScanCameraScreenState extends State<ScanCameraScreen> with TickerProviderStateMixin {
  late CameraController _cameraController;
  late FootDetectionService _footDetectionService;
  bool _isCameraInitialized = false;
  bool _isCapturing = false;
  bool _isStable = false;
  bool _isFootDetected = false;
  String _footDetectionMessage = "Preparing camera...";
  String _footType = "unknown";
  String _imageQuality = "unknown";
  double _detectionConfidence = 0.0;
  List<String> _capturedImagePaths = [];
  int _currentPositionIndex = 0;
  StreamSubscription? _stabilitySubscription;
  
  // Animation controllers
  late AnimationController _successAnimController;
  late AnimationController _scanningAnimController;
  
  // List of required scan positions
  final List<ScanPosition> _scanPositions = ScanConfig.scanPositions;

  @override
  void initState() {
    super.initState();
    
    // Initialize services
    _footDetectionService = FootDetectionService();
    
    // Initialize animation controllers
    _successAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    
    _scanningAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    
    // Initialize camera
    _initializeCamera();
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _successAnimController.dispose();
    _scanningAnimController.dispose();
    _stabilitySubscription?.cancel();
    _footDetectionService.stopPeriodicValidation();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    // Get available cameras
    final cameras = await availableCameras();
    final rearCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.back,
      orElse: () => cameras.first,
    );
    
    // Initialize controller
    _cameraController = CameraController(
      rearCamera,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    
    // Initialize the controller
    await _cameraController.initialize();
    
    if (mounted) {
      setState(() {
        _isCameraInitialized = true;
        _footDetectionMessage = "Looking for feet...";
      });
      
      // Start stability monitoring
      _monitorStability();
      
      // Start foot detection
      _startFootDetection();
    }
  }
  
  void _monitorStability() {
    _stabilitySubscription = _footDetectionService.monitorStability().listen((isStable) {
      if (mounted && _isStable != isStable) {
        setState(() {
          _isStable = isStable;
          
          // Update guidance message
          if (isStable) {
            if (_isFootDetected) {
              _footDetectionMessage = "Device stable. Foot detected!";
              HapticFeedback.success();
            } else {
              _footDetectionMessage = "Device stable. Position your foot in the frame.";
            }
          } else {
            _footDetectionMessage = "Hold the device still...";
          }
        });
      }
    });
  }
  
  void _startFootDetection() {
    if (!_isCameraInitialized) return;
    
    // Start periodic validation
    _footDetectionService.startPeriodicValidation(
      _cameraController,
      (result) {
        if (mounted) {
          setState(() {
            _isFootDetected = result['isValid'] ?? false;
            _footDetectionMessage = result['message'] ?? "Looking for feet...";
            _detectionConfidence = result['confidence'] ?? 0.0;
            _footType = result['footType'] ?? "unknown";
            _imageQuality = result['imageQuality'] ?? "unknown";
            
            // Show appropriate guidance
            if (_isFootDetected) {
              if (_isStable) {
                _footDetectionMessage = "Foot detected! Ready to capture.";
              } else {
                _footDetectionMessage = "Foot detected! Hold the device still...";
              }
            } else {
              _footDetectionMessage = "No foot detected. Please center your foot in the frame.";
            }
          });
        }
      },
    );
  }

  Future<void> _captureImage() async {
    if (_isCapturing || !_isStable || !_isFootDetected) return;
    
    setState(() {
      _isCapturing = true;
      _footDetectionMessage = "Capturing image...";
    });
    
    try {
      // Play capture animation
      _successAnimController.forward().then((_) => _successAnimController.reset());
      
      // Capture the image
      final XFile image = await _cameraController.takePicture();
      
      // Add to captured images
      setState(() {
        _capturedImagePaths.add(image.path);
        _isCapturing = false;
        
        // Update position index
        if (_currentPositionIndex < _scanPositions.length - 1) {
          _currentPositionIndex++;
          _footDetectionMessage = "Great! Now ${_scanPositions[_currentPositionIndex].instruction}";
        } else {
          // All positions captured, proceed to upload
          _footDetectionMessage = "Scan complete! Processing images...";
          _proceedToUpload();
        }
      });
      
      // Give success feedback
      HapticFeedback.success();
    } catch (e) {
      setState(() {
        _isCapturing = false;
        _footDetectionMessage = "Error capturing image. Please try again.";
      });
      
      // Give error feedback
      HapticFeedback.error();
    }
  }
  
  void _proceedToUpload() {
    // Here we would upload the captured images to the server
    // This is just a placeholder implementation
    Future.delayed(const Duration(seconds: 2), () {
      // Navigate to results screen or show upload progress
      // For this demo, we'll just reset the state
      setState(() {
        _capturedImagePaths = [];
        _currentPositionIndex = 0;
        _footDetectionMessage = "Scan uploaded! Ready for a new scan.";
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isCameraInitialized) {
      return Scaffold(
        body: Container(
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera preview
          Positioned.fill(
            child: AspectRatio(
              aspectRatio: _cameraController.value.aspectRatio,
              child: CameraPreview(_cameraController),
            ),
          ),
          
          // Foot detection overlay
          ScanGuideOverlay(
            isFootDetected: _isFootDetected,
            isStable: _isStable,
            confidence: _detectionConfidence,
            scanPosition: _scanPositions[_currentPositionIndex],
            capturedCount: _capturedImagePaths.length,
            totalPositions: _scanPositions.length,
          ),
          
          // Status indicators
          Positioned(
            top: 60,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Column(
                children: [
                  // Status message
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_isFootDetected && _isStable)
                          const Icon(Icons.check_circle, color: Colors.green, size: 20)
                        else if (_isFootDetected)
                          SpinKitPulse(
                            color: Colors.orange,
                            size: 20,
                            controller: _scanningAnimController,
                          )
                        else
                          SpinKitPulse(
                            color: Colors.blue,
                            size: 20,
                            controller: _scanningAnimController,
                          ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _footDetectionMessage,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Additional status info
                  if (_isFootDetected)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildStatusChip(
                            "Foot Type: $_footType",
                            _footType != "unknown" ? Colors.green : Colors.grey,
                          ),
                          const SizedBox(width: 8),
                          _buildStatusChip(
                            "Quality: $_imageQuality",
                            _imageQuality == "good" 
                                ? Colors.green 
                                : _imageQuality == "acceptable" 
                                    ? Colors.orange 
                                    : Colors.red,
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Camera controls
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: CameraControls(
              onCapture: _captureImage,
              isCapturing: _isCapturing,
              isReadyToCapture: _isFootDetected && _isStable && !_isCapturing,
              capturedCount: _capturedImagePaths.length,
              totalCount: _scanPositions.length,
              onCancel: () => Navigator.of(context).pop(),
            ),
          ),
          
          // Success animation
          if (_isCapturing)
            Positioned.fill(
              child: Center(
                child: Lottie.asset(
                  'assets/animations/capture_success.json',
                  controller: _successAnimController,
                  onLoaded: (composition) {
                    _successAnimController.duration = composition.duration;
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
  
  Widget _buildStatusChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.6)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}