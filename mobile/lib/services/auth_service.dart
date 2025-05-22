import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Authentication service for handling user login, registration, and token management
class AuthService with ChangeNotifier {
  final String _baseUrl = "https://api.barogrip.com"; // Base API URL
  bool _isAuthenticated = false;
  String? _token;
  String? _userId;
  String? _username;
  String? _email;
  String? _fullName;
  String? _role;

  // Getters
  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  String? get userId => _userId;
  String? get username => _username;
  String? get email => _email;
  String? get fullName => _fullName;
  String? get role => _role;

  /// Initialize the auth service and load stored token if available
  AuthService() {
    _loadToken();
  }

  /// Check if the user is logged in
  Future<bool> isLoggedIn() async {
    await _loadToken();
    return _isAuthenticated;
  }

  /// Load the authentication token from shared preferences
  Future<void> _loadToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('token');
      _userId = prefs.getString('userId');
      _username = prefs.getString('username');
      _email = prefs.getString('email');
      _fullName = prefs.getString('fullName');
      _role = prefs.getString('role');
      
      _isAuthenticated = _token != null;
      
      if (_isAuthenticated) {
        // Validate token with a quick API call
        try {
          final response = await http.get(
            Uri.parse('$_baseUrl/api/user'),
            headers: {
              'Authorization': 'Bearer $_token',
            },
          );
          
          if (response.statusCode != 200) {
            // Token is invalid, clear it
            await logout();
          }
        } catch (_) {
          // Keep the token if the API is unreachable
          // It will be validated when connectivity is restored
        }
      }
      
      notifyListeners();
    } catch (e) {
      _isAuthenticated = false;
      notifyListeners();
    }
  }

  /// Get the current authentication token
  Future<String?> getToken() async {
    if (_token == null) {
      await _loadToken();
    }
    return _token;
  }

  /// Login with username/email and password
  Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/login'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        _token = data['token'];
        _userId = data['id'].toString();
        _username = data['username'];
        _email = data['email'];
        _fullName = data['fullName'];
        _role = data['role'];
        _isAuthenticated = true;
        
        // Save to shared preferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('userId', _userId!);
        await prefs.setString('username', _username!);
        await prefs.setString('email', _email!);
        await prefs.setString('fullName', _fullName!);
        await prefs.setString('role', _role!);
        
        notifyListeners();
        return true;
      } else {
        _isAuthenticated = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isAuthenticated = false;
      notifyListeners();
      return false;
    }
  }

  /// Register a new user
  Future<bool> register({
    required String username,
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/register'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
          'fullName': fullName,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        
        _token = data['token'];
        _userId = data['id'].toString();
        _username = data['username'];
        _email = data['email'];
        _fullName = data['fullName'];
        _role = data['role'];
        _isAuthenticated = true;
        
        // Save to shared preferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('userId', _userId!);
        await prefs.setString('username', _username!);
        await prefs.setString('email', _email!);
        await prefs.setString('fullName', _fullName!);
        await prefs.setString('role', _role!);
        
        notifyListeners();
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Logout the current user
  Future<bool> logout() async {
    try {
      // Call logout API if needed
      if (_token != null) {
        try {
          await http.post(
            Uri.parse('$_baseUrl/api/logout'),
            headers: {
              'Authorization': 'Bearer $_token',
            },
          );
        } catch (_) {
          // Continue with local logout even if API call fails
        }
      }
      
      // Clear local storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('userId');
      await prefs.remove('username');
      await prefs.remove('email');
      await prefs.remove('fullName');
      await prefs.remove('role');
      
      // Reset state
      _token = null;
      _userId = null;
      _username = null;
      _email = null;
      _fullName = null;
      _role = null;
      _isAuthenticated = false;
      
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Update user profile
  Future<bool> updateProfile({
    String? fullName,
    String? email,
  }) async {
    try {
      if (_token == null) {
        return false;
      }
      
      final response = await http.put(
        Uri.parse('$_baseUrl/api/user/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          if (fullName != null) 'fullName': fullName,
          if (email != null) 'email': email,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (fullName != null) _fullName = fullName;
        if (email != null) _email = email;
        
        // Update shared preferences
        final prefs = await SharedPreferences.getInstance();
        if (fullName != null) await prefs.setString('fullName', fullName);
        if (email != null) await prefs.setString('email', email);
        
        notifyListeners();
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Change user password
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      if (_token == null) {
        return false;
      }
      
      final response = await http.post(
        Uri.parse('$_baseUrl/api/user/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
