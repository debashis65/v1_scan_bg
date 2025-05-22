import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Service for handling device sensor data and analysis
class SensorService with ChangeNotifier {
  // Motion detection thresholds
  static const double _accelerometerThreshold = 0.5; // g-force
  static const double _gyroscopeThreshold = 0.2; // rad/s
  
  // Light detection settings
  static const double _lowLightThreshold = 10.0; // lux
  
  // Sensor data buffers
  final List<AccelerometerEvent> _accelerometerBuffer = [];
  final List<GyroscopeEvent> _gyroscopeBuffer = [];
  final List<double> _lightBuffer = [];
  
  // Buffer sizes
  static const int _bufferSize = 10;
  
  // Sensor subscriptions
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSubscription;
  StreamSubscription<double>? _lightSubscription;
  
  // Latest sensor values
  AccelerometerEvent? _lastAccelerometerValue;
  GyroscopeEvent? _lastGyroscopeValue;
  double _lastLightValue = 100.0; // Default to normal light
  
  // Public accessors for latest values
  AccelerometerEvent? get lastAccelerometerValue => _lastAccelerometerValue;
  GyroscopeEvent? get lastGyroscopeValue => _lastGyroscopeValue;
  double get lastLightValue => _lastLightValue;
  
  // Motion detection state
  bool _isMoving = false;
  bool get isMoving => _isMoving;
  
  // Light detection state
  bool _isLowLight = false;
  bool get isLowLight => _isLowLight;
  
  /// Constructor
  SensorService() {
    _initSensors();
  }
  
  /// Initialize all sensor subscriptions
  void _initSensors() {
    // Listen to accelerometer events
    _accelerometerSubscription = accelerometerEvents.listen((AccelerometerEvent event) {
      _lastAccelerometerValue = event;
      _accelerometerBuffer.add(event);
      if (_accelerometerBuffer.length > _bufferSize) {
        _accelerometerBuffer.removeAt(0);
      }
      _updateMotionState();
    });
    
    // Listen to gyroscope events
    _gyroscopeSubscription = gyroscopeEvents.listen((GyroscopeEvent event) {
      _lastGyroscopeValue = event;
      _gyroscopeBuffer.add(event);
      if (_gyroscopeBuffer.length > _bufferSize) {
        _gyroscopeBuffer.removeAt(0);
      }
      _updateMotionState();
    });
    
    // In a real implementation, we would listen to light sensor events
    // This is a simulation for this example
    _simulateLightSensor();
  }
  
  /// Simulate light sensor events since not all devices have light sensors
  void _simulateLightSensor() {
    // Use a timer to simulate light sensor reading
    Timer.periodic(Duration(seconds: 1), (timer) {
      // Simulate light value between 5 and 200 lux
      // In a real implementation, this would use the actual light sensor
      _lastLightValue = 100.0; // Default to normal light
      
      _lightBuffer.add(_lastLightValue);
      if (_lightBuffer.length > _bufferSize) {
        _lightBuffer.removeAt(0);
      }
      
      _updateLightState();
      notifyListeners();
    });
  }
  
  /// Update motion detection state based on recent sensor data
  void _updateMotionState() {
    if (_accelerometerBuffer.isEmpty || _gyroscopeBuffer.isEmpty) {
      _isMoving = false;
      return;
    }
    
    // Calculate standard deviation of accelerometer data (all axes)
    final accelStdDev = _calculateStandardDeviation(_accelerometerBuffer);
    
    // Calculate standard deviation of gyroscope data (all axes)
    final gyroStdDev = _calculateStandardDeviation(_gyroscopeBuffer);
    
    // Determine if the device is moving based on sensor variability
    _isMoving = accelStdDev > _accelerometerThreshold || gyroStdDev > _gyroscopeThreshold;
    
    notifyListeners();
  }
  
  /// Update light detection state based on recent sensor data
  void _updateLightState() {
    if (_lightBuffer.isEmpty) {
      _isLowLight = false;
      return;
    }
    
    // Calculate average light level
    final avgLight = _lightBuffer.reduce((a, b) => a + b) / _lightBuffer.length;
    
    // Determine if the environment has low light
    _isLowLight = avgLight < _lowLightThreshold;
    
    notifyListeners();
  }
  
  /// Calculate standard deviation of sensor data
  double _calculateStandardDeviation(List<dynamic> sensorEvents) {
    if (sensorEvents.isEmpty) return 0.0;
    
    // Extract all axis values and calculate variance
    List<double> values = [];
    
    for (final event in sensorEvents) {
      if (event is AccelerometerEvent) {
        values.addAll([event.x, event.y, event.z]);
      } else if (event is GyroscopeEvent) {
        values.addAll([event.x, event.y, event.z]);
      }
    }
    
    // Calculate mean
    final mean = values.reduce((a, b) => a + b) / values.length;
    
    // Calculate sum of squared differences
    double sumSquaredDiff = 0;
    for (final value in values) {
      sumSquaredDiff += (value - mean) * (value - mean);
    }
    
    // Calculate standard deviation
    return (sumSquaredDiff / values.length).abs();
  }
  
  /// Check if the device is currently in motion
  /// This method can be called from outside the service
  Future<bool> isDeviceMoving() async {
    // Use the latest calculated state
    return _isMoving;
  }
  
  /// Check if the environment has low light
  /// This method can be called from outside the service
  Future<bool> isLowLightEnvironment() async {
    // Use the latest calculated state
    return _isLowLight;
  }
  
  /// Dispose of all resources
  @override
  void dispose() {
    _accelerometerSubscription?.cancel();
    _gyroscopeSubscription?.cancel();
    _lightSubscription?.cancel();
    super.dispose();
  }
}
