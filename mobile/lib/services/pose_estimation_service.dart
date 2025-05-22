import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';
import '../models/pose_alignment.dart';

/// Service that implements Google's ML Kit pose detection (BlazePose)
/// for tracking user position and providing real-time positioning feedback
class PoseEstimationService {
  final PoseDetector _poseDetector = PoseDetector(
    options: PoseDetectorOptions(
      mode: PoseDetectionMode.stream,
      modelType: PoseDetectionModel.accurate,
    ),
  );
  
  bool _isBusy = false;
  CameraController? _cameraController;
  StreamController<PoseAlignment> _poseAlignmentController = 
      StreamController<PoseAlignment>.broadcast();
  
  Stream<PoseAlignment> get poseAlignmentStream => _poseAlignmentController.stream;
  
  /// Initialize the pose detector and camera
  Future<void> initialize(CameraDescription cameraDescription) async {
    _cameraController = CameraController(
      cameraDescription,
      ResolutionPreset.high,
      enableAudio: false,
    );
    
    try {
      await _cameraController!.initialize();
      _cameraController!.startImageStream((CameraImage image) {
        if (!_isBusy) {
          _isBusy = true;
          _processImage(image);
        }
      });
    } catch (e) {
      print('Error initializing camera: $e');
    }
  }
  
  /// Process camera image and detect poses
  Future<void> _processImage(CameraImage image) async {
    final WriteBuffer allBytes = WriteBuffer();
    for (final Plane plane in image.planes) {
      allBytes.putUint8List(plane.bytes);
    }
    final bytes = allBytes.done().buffer.asUint8List();
    
    final Size imageSize = Size(
      image.width.toDouble(), 
      image.height.toDouble(),
    );
    
    final InputImageRotation imageRotation = InputImageRotation.rotation0deg;
    
    final InputImageFormat inputImageFormat = InputImageFormat.nv21;
    
    final inputImageData = InputImageMetadata(
      size: imageSize,
      rotation: imageRotation,
      format: inputImageFormat,
      bytesPerRow: image.planes[0].bytesPerRow,
    );
    
    final inputImage = InputImage.fromBytes(
      bytes: bytes,
      metadata: inputImageData,
    );
    
    try {
      final List<Pose> poses = await _poseDetector.processImage(inputImage);
      if (poses.isNotEmpty) {
        final PoseAlignment alignment = _analyzePoseForScanningPosition(poses.first);
        _poseAlignmentController.add(alignment);
      }
    } catch (e) {
      print('Error processing image: $e');
    } finally {
      _isBusy = false;
    }
  }
  
  /// Analyze detected pose to determine if user is in correct position for scanning
  PoseAlignment _analyzePoseForScanningPosition(Pose pose) {
    final Map<PoseLandmarkType, PoseLandmark> landmarks = pose.landmarks;
    
    // Get key landmarks for positioning analysis
    final PoseLandmark? leftShoulder = landmarks[PoseLandmarkType.leftShoulder];
    final PoseLandmark? rightShoulder = landmarks[PoseLandmarkType.rightShoulder];
    final PoseLandmark? leftHip = landmarks[PoseLandmarkType.leftHip];
    final PoseLandmark? rightHip = landmarks[PoseLandmarkType.rightHip];
    final PoseLandmark? leftAnkle = landmarks[PoseLandmarkType.leftAnkle];
    final PoseLandmark? rightAnkle = landmarks[PoseLandmarkType.rightAnkle];
    
    // Default values for alignment metrics
    double anteriorAlignment = 0.0;  // Forward-backward alignment
    double lateralAlignment = 0.0;   // Side-to-side alignment
    double verticalAlignment = 0.0;  // Up-down alignment
    double overallAlignment = 0.0;
    String guidanceMessage = "Position yourself to match the guide";
    
    if (leftShoulder != null && rightShoulder != null && 
        leftHip != null && rightHip != null && 
        leftAnkle != null && rightAnkle != null) {
      
      // Calculate shoulder alignment (check if person is facing camera properly)
      final shoulderDiff = (leftShoulder.z - rightShoulder.z).abs();
      anteriorAlignment = 1.0 - min(shoulderDiff / 0.2, 1.0);
      
      // Calculate lateral alignment (centered in frame)
      final centerX = (leftShoulder.x + rightShoulder.x) / 2;
      lateralAlignment = 1.0 - min((centerX - 0.5).abs() / 0.3, 1.0);
      
      // Calculate vertical alignment (proper height in frame)
      final topY = min(leftShoulder.y, rightShoulder.y);
      final bottomY = max(leftAnkle.y, rightAnkle.y);
      final heightRatio = (bottomY - topY) / 0.7; // expected to fill ~70% of frame
      verticalAlignment = 1.0 - min((heightRatio - 1.0).abs() / 0.3, 1.0);
      
      // Calculate overall alignment score
      overallAlignment = (anteriorAlignment * 0.4 + 
                         lateralAlignment * 0.3 + 
                         verticalAlignment * 0.3);
      
      // Generate specific guidance message based on alignment issues
      if (overallAlignment < 0.6) {
        if (anteriorAlignment < 0.5) {
          guidanceMessage = "Turn to face the guide position directly";
        } else if (lateralAlignment < 0.5) {
          guidanceMessage = "Move to center yourself with the guide";
        } else if (verticalAlignment < 0.5) {
          guidanceMessage = "Adjust your distance from the camera";
        }
      } else if (overallAlignment < 0.8) {
        guidanceMessage = "Almost there! Make minor adjustments";
      } else {
        guidanceMessage = "Great position! Hold still for capture";
      }
    }
    
    return PoseAlignment(
      anteriorAlignment: anteriorAlignment,
      lateralAlignment: lateralAlignment,
      verticalAlignment: verticalAlignment,
      overallAlignment: overallAlignment,
      guidanceMessage: guidanceMessage,
    );
  }
  
  /// Dispose resources when finished
  void dispose() {
    _poseDetector.close();
    _cameraController?.dispose();
    _poseAlignmentController.close();
  }
  
  double min(double a, double b) => a < b ? a : b;
  double max(double a, double b) => a > b ? a : b;
}