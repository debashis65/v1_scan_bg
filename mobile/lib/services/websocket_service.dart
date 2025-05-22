import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:barogrip/config/api_config.dart';
import 'package:barogrip/services/auth_service.dart';

/// Service to handle WebSocket connections for real-time updates
class WebSocketService extends ChangeNotifier {
  WebSocketChannel? _channel;
  bool _isConnected = false;
  String? _scanStatus;
  Map<String, dynamic>? _scanData;
  String? _errorMessage;
  
  /// Get the current connection status
  bool get isConnected => _isConnected;
  
  /// Get the current scan status
  String? get scanStatus => _scanStatus;
  
  /// Get the scan data received via WebSocket
  Map<String, dynamic>? get scanData => _scanData;
  
  /// Get any error message from the connection
  String? get errorMessage => _errorMessage;
  
  /// Connect to the WebSocket server for scan updates
  void connectToScan(int scanId) {
    disconnect(); // Ensure no existing connection
    
    _errorMessage = null;
    
    AuthService().getToken().then((token) {
      if (token == null) {
        _errorMessage = 'Not authenticated';
        notifyListeners();
        return;
      }
      
      // Construct the WebSocket URL
      final wsUrl = Uri.parse('${ApiConfig.wsBaseUrl}/ws/scans/$scanId');
      
      try {
        // Create and connect to the WebSocket
        _channel = IOWebSocketChannel.connect(
          wsUrl,
          headers: {
            'Authorization': 'Bearer $token',
          },
        );
        
        _isConnected = true;
        notifyListeners();
        
        // Listen for messages
        _channel!.stream.listen(
          (dynamic message) {
            _handleMessage(message);
          },
          onError: (error) {
            _errorMessage = 'WebSocket error: $error';
            _isConnected = false;
            _channel = null;
            notifyListeners();
          },
          onDone: () {
            _isConnected = false;
            _channel = null;
            notifyListeners();
          },
        );
        
        // Send initial message to subscribe to updates
        _channel!.sink.add(json.encode({
          'type': 'subscribe',
          'scanId': scanId,
        }));
      } catch (e) {
        _errorMessage = 'Failed to connect: $e';
        _isConnected = false;
        _channel = null;
        notifyListeners();
      }
    });
  }
  
  /// Disconnect from the WebSocket server
  void disconnect() {
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
      _isConnected = false;
      notifyListeners();
    }
  }
  
  /// Handle incoming WebSocket messages
  void _handleMessage(dynamic message) {
    try {
      final data = json.decode(message);
      
      if (data['type'] == 'scan_update') {
        _scanStatus = data['status'];
        _scanData = data['data'];
        notifyListeners();
      } else if (data['type'] == 'error') {
        _errorMessage = data['message'];
        notifyListeners();
      }
    } catch (e) {
      _errorMessage = 'Failed to parse message: $e';
      notifyListeners();
    }
  }
  
  /// Send a message to the WebSocket server
  void sendMessage(Map<String, dynamic> message) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(json.encode(message));
    } else {
      _errorMessage = 'Not connected';
      notifyListeners();
    }
  }
  
  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}