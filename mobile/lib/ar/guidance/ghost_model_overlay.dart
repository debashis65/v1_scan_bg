import 'package:flutter/material.dart';
import 'package:arkit_plugin/arkit_plugin.dart';
import 'package:vector_math/vector_math_64.dart' as vector;
import 'dart:math' as math;
import '../models/foot_model.dart';
import '../utilities/ar_utilities.dart';

/// Provides animated ghost foot models as overlays to guide the user
/// during the scanning process
class GhostModelOverlay {
  final ARKitController? arController;
  ARKitNode? _ghostNode;
  ARKitNode? _targetPositionNode;
  bool _isAnimating = false;
  double _opacity = 0.5;
  final String _footModelPath = 'assets/models/foot_guidance_model.obj';
  
  GhostModelOverlay({required this.arController});

  /// Creates and shows a ghost foot model for the specified position
  /// with a subtle pulsing animation to draw attention
  Future<void> showGhostModelForPosition(String position) async {
    // Clear any existing guidance model
    hideGhostModel();
    
    if (arController == null) return;
    
    // Position and orientation parameters based on desired scanning position
    vector.Vector3 nodePosition;
    vector.Vector3 nodeScale = vector.Vector3(0.03, 0.03, 0.03);
    vector.Quaternion nodeRotation;
    
    // Set position and rotation based on the scanning position
    switch (position) {
      case 'front':
        nodePosition = vector.Vector3(0, -0.3, -0.5);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(0, 1, 0), 0);
        break;
      case 'left':
        nodePosition = vector.Vector3(-0.3, -0.3, -0.5);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(0, 1, 0), math.pi / 2);
        break;
      case 'right':
        nodePosition = vector.Vector3(0.3, -0.3, -0.5);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(0, 1, 0), -math.pi / 2);
        break;
      case 'back':
        nodePosition = vector.Vector3(0, -0.3, -0.3);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(0, 1, 0), math.pi);
        break;
      case 'top':
        nodePosition = vector.Vector3(0, -0.15, -0.5);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(1, 0, 0), -math.pi / 2);
        break;
      default:
        nodePosition = vector.Vector3(0, -0.3, -0.5);
        nodeRotation = vector.Quaternion.axisAngle(vector.Vector3(0, 1, 0), 0);
    }
    
    // Create the ghost model with semi-transparent material
    final material = ARKitMaterial(
      diffuse: ARKitMaterialProperty.color(
        Color.fromRGBO(100, 200, 255, _opacity),
      ),
      specular: ARKitMaterialProperty.color(Colors.white),
    );
    
    try {
      _ghostNode = ARKitNode(
        geometry: ARKitModelGeometry(path: _footModelPath),
        position: nodePosition,
        rotation: nodeRotation,
        scale: nodeScale,
        materials: [material],
      );
      
      arController?.add(_ghostNode!);
      
      // Create a small target indicator to show optimal positioning
      _targetPositionNode = ARKitNode(
        geometry: ARKitSphere(radius: 0.02),
        position: nodePosition,
        materials: [
          ARKitMaterial(
            diffuse: ARKitMaterialProperty.color(
              Colors.green.withOpacity(0.3),
            ),
            emission: ARKitMaterialProperty.color(
              Colors.green.withOpacity(0.3),
            ),
          )
        ],
      );
      
      arController?.add(_targetPositionNode!);
      
      // Start pulsing animation
      _startPulsingAnimation();
    } catch (e) {
      print('Error creating ghost model: $e');
    }
  }
  
  /// Hide the currently displayed ghost model
  void hideGhostModel() {
    _isAnimating = false;
    
    if (_ghostNode != null && arController != null) {
      arController?.remove(_ghostNode!.name);
      _ghostNode = null;
    }
    
    if (_targetPositionNode != null && arController != null) {
      arController?.remove(_targetPositionNode!.name);
      _targetPositionNode = null;
    }
  }
  
  /// Creates a subtle pulsing animation to help guide the user
  void _startPulsingAnimation() async {
    _isAnimating = true;
    bool increasing = false;
    
    while (_isAnimating && _ghostNode != null && arController != null) {
      // Update opacity for pulsing effect
      if (increasing) {
        _opacity += 0.01;
        if (_opacity >= 0.7) increasing = false;
      } else {
        _opacity -= 0.01;
        if (_opacity <= 0.3) increasing = true;
      }
      
      // Update ghost model material with new opacity
      final material = ARKitMaterial(
        diffuse: ARKitMaterialProperty.color(
          Color.fromRGBO(100, 200, 255, _opacity),
        ),
        specular: ARKitMaterialProperty.color(Colors.white),
      );
      
      try {
        _ghostNode?.materials = [material];
      } catch (e) {
        // Handle potential errors during animation
        print('Error updating ghost model: $e');
        break;
      }
      
      // Small delay for animation
      await Future.delayed(Duration(milliseconds: 50));
    }
  }
  
  /// Updates the ghost model color based on proximity to correct position
  /// Green indicates good positioning, yellow for fair, red for poor
  void updatePositionFeedback(double positionAccuracy) {
    if (_ghostNode == null || arController == null) return;
    
    Color feedbackColor;
    if (positionAccuracy > 0.8) {
      feedbackColor = Color.fromRGBO(20, 200, 50, _opacity); // Green for good
    } else if (positionAccuracy > 0.5) {
      feedbackColor = Color.fromRGBO(200, 200, 20, _opacity); // Yellow for fair
    } else {
      feedbackColor = Color.fromRGBO(200, 50, 50, _opacity); // Red for poor
    }
    
    final material = ARKitMaterial(
      diffuse: ARKitMaterialProperty.color(feedbackColor),
      specular: ARKitMaterialProperty.color(Colors.white),
    );
    
    try {
      _ghostNode?.materials = [material];
    } catch (e) {
      print('Error updating ghost model color: $e');
    }
  }
}