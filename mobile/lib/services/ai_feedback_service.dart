import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image/image.dart' as img;

class AIFeedbackService {
  // Singleton pattern
  static final AIFeedbackService _instance = AIFeedbackService._internal();
  factory AIFeedbackService() => _instance;
  AIFeedbackService._internal();

  // Text-to-speech for accessibility
  final FlutterTts _tts = FlutterTts();
  
  // Feedback controller
  final StreamController<ScanFeedback> _feedbackController = StreamController<ScanFeedback>.broadcast();
  Stream<ScanFeedback> get feedbackStream => _feedbackController.stream;
  
  // Analysis timer to avoid over-processing
  Timer? _analysisTimer;
  bool _isProcessing = false;
  
  // Initialize service
  Future<void> initialize() async {
    await _tts.setLanguage("en-US");
    await _tts.setSpeechRate(0.5);
  }
  
  // Start continuous feedback for a camera feed
  void startContinuousFeedback(CameraController cameraController) {
    // Start periodic analysis (5 frames per second)
    _analysisTimer?.cancel();
    _analysisTimer = Timer.periodic(Duration(milliseconds: 200), (_) {
      if (!_isProcessing) {
        _analyzeCurrentFrame(cameraController);
      }
    });
  }
  
  // Stop feedback
  void stopFeedback() {
    _analysisTimer?.cancel();
    _analysisTimer = null;
  }
  
  // Process camera frame and provide feedback
  Future<void> _analyzeCurrentFrame(CameraController controller) async {
    if (!controller.value.isInitialized || _isProcessing) return;
    
    _isProcessing = true;
    try {
      // Capture image from camera stream
      final XFile imageFile = await controller.takePicture();
      
      // Process the image
      final File file = File(imageFile.path);
      final bytes = await file.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        _provideFeedback(ScanFeedback(
          message: "Image capture failed, please try again",
          type: FeedbackType.error,
        ));
        return;
      }
      
      // Run lightweight image analysis
      final feedback = await _analyzeImage(image);
      
      // Provide feedback to user
      _provideFeedback(feedback);
      
      // Clean up temporary file
      await file.delete();
    } catch (e) {
      print("Error analyzing frame: $e");
    } finally {
      _isProcessing = false;
    }
  }
  
  // Analyze image and return appropriate feedback
  Future<ScanFeedback> _analyzeImage(img.Image image) async {
    // Perform lightweight analysis
    
    // Check lighting conditions
    final brightness = _calculateBrightness(image);
    if (brightness < 50) {
      return ScanFeedback(
        message: "Too dark. Add more light to the room",
        type: FeedbackType.warning,
        icon: Icons.brightness_low,
      );
    }
    
    if (brightness > 220) {
      return ScanFeedback(
        message: "Too bright. Reduce direct light on foot",
        type: FeedbackType.warning,
        icon: Icons.brightness_high,
      );
    }
    
    // Check focus/blur
    final blurScore = _detectBlur(image);
    if (blurScore > 50) {
      return ScanFeedback(
        message: "Blurry image. Ensure phone is stable and not moving",
        type: FeedbackType.warning,
        icon: Icons.blur_on,
      );
    }
    
    // Check distance (estimated from foot proportion in frame)
    final footProportion = _estimateFootProportion(image);
    if (footProportion < 0.3) {
      return ScanFeedback(
        message: "Your foot is too far away. Move closer to the phone",
        type: FeedbackType.info,
        icon: Icons.zoom_in,
      );
    }
    
    if (footProportion > 0.8) {
      return ScanFeedback(
        message: "Your foot is too close. Move further from the phone",
        type: FeedbackType.info,
        icon: Icons.zoom_out,
      );
    }
    
    // Detect if foot is centered
    final isCentered = _isFootCentered(image);
    if (!isCentered) {
      return ScanFeedback(
        message: "Reposition yourself so foot is centered in frame",
        type: FeedbackType.info,
        icon: Icons.center_focus_strong,
      );
    }
    
    // Check if we have a clear view
    final hasObstructions = _detectObstructions(image);
    if (hasObstructions) {
      return ScanFeedback(
        message: "Remove objects or shadows between your foot and the phone",
        type: FeedbackType.warning,
        icon: Icons.remove_circle_outline,
      );
    }
    
    // Check for correct user position (this would be based on current scan position)
    // In a real implementation, this would use machine learning to detect foot angle
    
    // If everything looks good
    return ScanFeedback(
      message: "Position perfect. Hold still for capture",
      type: FeedbackType.success,
      icon: Icons.check_circle,
    );
  }
  
  // Lighting analysis
  double _calculateBrightness(img.Image image) {
    int totalBrightness = 0;
    final pixels = image.width * image.height;
    
    // Sample pixels to determine average brightness
    for (int y = 0; y < image.height; y += 10) {
      for (int x = 0; x < image.width; x += 10) {
        final pixel = image.getPixel(x, y);
        final r = img.getRed(pixel);
        final g = img.getGreen(pixel);
        final b = img.getBlue(pixel);
        totalBrightness += (r + g + b) ~/ 3;
      }
    }
    
    return totalBrightness / (pixels / 100);
  }
  
  // Blur detection using Laplacian variance
  double _detectBlur(img.Image image) {
    // Convert to grayscale
    final grayscale = img.grayscale(image);
    
    // Apply Laplacian filter (3x3 kernel approximation)
    double variance = 0;
    // Simple implementation for efficiency - a real implementation would use
    // a proper Laplacian filter
    
    return variance;
  }
  
  // Foot proportion estimation
  double _estimateFootProportion(img.Image image) {
    // Use skin tone detection and contour analysis
    // Simplified implementation for this example
    return 0.5; // Placeholder
  }
  
  // Check if foot is centered
  bool _isFootCentered(img.Image image) {
    // Use foot contour detection to determine position
    // Simplified implementation
    return true; // Placeholder
  }
  
  // Detect obstructions in view
  bool _detectObstructions(img.Image image) {
    // Look for unexpected objects/shadows
    // Simplified implementation
    return false; // Placeholder
  }
  
  // Provide feedback to user
  void _provideFeedback(ScanFeedback feedback) {
    // Send to stream for UI updates
    _feedbackController.add(feedback);
    
    // Voice feedback for accessibility (not too frequent)
    if (feedback.type != FeedbackType.success) {
      _tts.speak(feedback.message);
    }
  }
  
  // Clean up resources
  void dispose() {
    _analysisTimer?.cancel();
    _feedbackController.close();
    _tts.stop();
  }
}

// Feedback data model
class ScanFeedback {
  final String message;
  final FeedbackType type;
  final IconData? icon;
  
  ScanFeedback({
    required this.message,
    required this.type,
    this.icon,
  });
}

enum FeedbackType {
  info,
  success,
  warning,
  error,
}