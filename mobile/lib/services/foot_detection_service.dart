import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'package:camera/camera.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:haptic_feedback/haptic_feedback.dart';

import '../config/api_config.dart';
import '../models/api_response.dart';

class FootDetectionService {
  final Dio _dio;
  bool _isProcessing = false;
  Timer? _validationTimer;
  
  // Sensor threshold values for stable positioning
  static const double _accelerometerThreshold = 0.3; // Threshold for considering device stable
  static const int _stableTimeThresholdMs = 1500; // Time the device needs to be stable to trigger scan
  DateTime? _stableStartTime;
  
  // Singleton pattern
  static final FootDetectionService _instance = FootDetectionService._internal();
  
  factory FootDetectionService() {
    return _instance;
  }
  
  FootDetectionService._internal() : _dio = Dio() {
    _dio.options.headers['Content-Type'] = 'multipart/form-data';
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
  }
  
  /// Start monitoring device stability using the accelerometer
  /// Returns a stream that emits stability status
  Stream<bool> monitorStability() {
    final controller = StreamController<bool>();
    
    // Listen to accelerometer events
    final subscription = accelerometerEvents.listen((AccelerometerEvent event) {
      // Calculate magnitude of movement (ignoring gravity by using difference from 9.8)
      final double movement = (event.x.abs() + (event.y - 9.8).abs() + event.z.abs()) / 3;
      
      // Device is considered stable if movement is below threshold
      final bool isStable = movement < _accelerometerThreshold;
      
      // Track stability duration
      if (isStable) {
        if (_stableStartTime == null) {
          _stableStartTime = DateTime.now();
        }
        
        // Check if device has been stable long enough
        final stableDuration = DateTime.now().difference(_stableStartTime!).inMilliseconds;
        if (stableDuration >= _stableTimeThresholdMs) {
          controller.add(true);
        } else {
          controller.add(false);
        }
      } else {
        // Reset stable time if device moves
        _stableStartTime = null;
        controller.add(false);
      }
    });
    
    // Clean up when the stream is closed
    controller.onCancel = () {
      subscription.cancel();
      _stableStartTime = null;
    };
    
    return controller.stream;
  }
  
  /// Validate if the image contains a foot
  /// Returns a future with validation result
  Future<Map<String, dynamic>> validateFootDetection(XFile imageFile) async {
    if (_isProcessing) {
      return {'isValid': false, 'message': 'Another validation is in progress'};
    }
    
    _isProcessing = true;
    
    try {
      // Create form data
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(
          imageFile.path,
          filename: 'foot_scan.jpg',
        ),
      });
      
      // Get token
      final token = await _getAuthToken();
      if (token == null) {
        _isProcessing = false;
        return {'isValid': false, 'message': 'Authentication failed'};
      }
      
      // Send request to server
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/api/validate-foot-detection',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );
      
      final Map<String, dynamic> result = response.data;
      
      // Give haptic feedback based on result
      if (result['isFootDetected'] == true) {
        HapticFeedback.success();
      } else {
        HapticFeedback.error();
      }
      
      _isProcessing = false;
      return {
        'isValid': result['isFootDetected'] ?? false,
        'confidence': result['confidence'] ?? 0.0,
        'message': result['message'] ?? 'Unknown validation result',
        'recommendations': result['recommendations'] ?? [],
        'footType': result['footType'],
        'imageQuality': result['imageQuality'],
      };
    } catch (e) {
      debugPrint('Error validating foot detection: $e');
      _isProcessing = false;
      return {
        'isValid': false,
        'message': 'Failed to validate image: ${e.toString()}',
      };
    }
  }

  /// Check if the camera is pointed at a foot at regular intervals
  /// Calls the callback with validation results
  void startPeriodicValidation(
    CameraController cameraController,
    Function(Map<String, dynamic>) callback,
  ) {
    if (_validationTimer != null) {
      stopPeriodicValidation();
    }
    
    _validationTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      try {
        // Capture image
        final XFile image = await cameraController.takePicture();
        
        // Validate foot detection
        final result = await validateFootDetection(image);
        
        // Call callback with result
        callback(result);
        
        // Clean up temporary image
        try {
          await File(image.path).delete();
        } catch (e) {
          debugPrint('Error deleting temporary image: $e');
        }
      } catch (e) {
        debugPrint('Error during periodic validation: $e');
        callback({
          'isValid': false,
          'message': 'Error during validation: ${e.toString()}',
        });
      }
    });
  }

  /// Stop periodic validation
  void stopPeriodicValidation() {
    _validationTimer?.cancel();
    _validationTimer = null;
  }

  // Get authentication token for API requests
  Future<String?> _getAuthToken() async {
    // This would normally retrieve token from secure storage
    // For this implementation, we'll return a placeholder
    try {
      // Implementation would depend on your auth system
      return 'auth_token_placeholder';
    } catch (e) {
      debugPrint('Error getting auth token: $e');
      return null;
    }
  }
}