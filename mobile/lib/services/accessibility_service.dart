import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:io';

/// Service to handle accessibility features in the app
class AccessibilityService extends ChangeNotifier {
  static final AccessibilityService _instance = AccessibilityService._internal();
  
  factory AccessibilityService() => _instance;
  
  AccessibilityService._internal() {
    _loadSettings();
    _initTTS();
  }
  
  late FlutterTts _flutterTts;
  bool _isHighContrastEnabled = false;
  bool _isTextToSpeechEnabled = false;
  bool _isLargeTextEnabled = false;
  double _textScaleFactor = 1.0;
  bool _isTTSInitialized = false;
  
  /// Whether high contrast mode is enabled
  bool get isHighContrastEnabled => _isHighContrastEnabled;
  
  /// Whether text-to-speech is enabled
  bool get isTextToSpeechEnabled => _isTextToSpeechEnabled;
  
  /// Whether large text mode is enabled
  bool get isLargeTextEnabled => _isLargeTextEnabled;
  
  /// Text scale factor for the app
  double get textScaleFactor => _textScaleFactor;
  
  /// Check if TTS is initialized and ready
  bool get isTTSInitialized => _isTTSInitialized;
  
  /// Initialize Text-to-Speech engine
  Future<void> _initTTS() async {
    _flutterTts = FlutterTts();
    
    try {
      await _flutterTts.setLanguage("en-US");
      await _flutterTts.setSpeechRate(0.5);
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);
      
      // Set TTS completion callback
      _flutterTts.setCompletionHandler(() {
        // Notify listeners when speech completes
        notifyListeners();
      });
      
      // Set TTS error callback
      _flutterTts.setErrorHandler((error) {
        print("TTS Error: $error");
        _isTTSInitialized = false;
        notifyListeners();
      });
      
      _isTTSInitialized = true;
    } catch (e) {
      print("TTS init error: $e");
      _isTTSInitialized = false;
    }
    
    notifyListeners();
  }
  
  /// Load saved accessibility settings
  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      _isHighContrastEnabled = prefs.getBool('high_contrast_enabled') ?? false;
      _isTextToSpeechEnabled = prefs.getBool('text_to_speech_enabled') ?? false;
      _isLargeTextEnabled = prefs.getBool('large_text_enabled') ?? false;
      _textScaleFactor = prefs.getDouble('text_scale_factor') ?? 1.0;
      
      notifyListeners();
    } catch (e) {
      print("Error loading accessibility settings: $e");
    }
  }
  
  /// Save the current accessibility settings
  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      await prefs.setBool('high_contrast_enabled', _isHighContrastEnabled);
      await prefs.setBool('text_to_speech_enabled', _isTextToSpeechEnabled);
      await prefs.setBool('large_text_enabled', _isLargeTextEnabled);
      await prefs.setDouble('text_scale_factor', _textScaleFactor);
    } catch (e) {
      print("Error saving accessibility settings: $e");
    }
  }
  
  /// Toggle high contrast mode
  Future<void> toggleHighContrast() async {
    _isHighContrastEnabled = !_isHighContrastEnabled;
    await _saveSettings();
    
    // Provide haptic feedback
    HapticFeedback.mediumImpact();
    
    // Speak change if TTS is enabled
    if (_isTextToSpeechEnabled && _isTTSInitialized) {
      speak("High contrast mode ${_isHighContrastEnabled ? 'enabled' : 'disabled'}");
    }
    
    notifyListeners();
  }
  
  /// Toggle text-to-speech functionality
  Future<void> toggleTextToSpeech() async {
    _isTextToSpeechEnabled = !_isTextToSpeechEnabled;
    await _saveSettings();
    
    // Provide haptic feedback
    HapticFeedback.mediumImpact();
    
    // Initialize TTS engine if enabling and not already initialized
    if (_isTextToSpeechEnabled && !_isTTSInitialized) {
      await _initTTS();
    }
    
    // Speak change if enabling TTS
    if (_isTextToSpeechEnabled && _isTTSInitialized) {
      speak("Text to speech ${_isTextToSpeechEnabled ? 'enabled' : 'disabled'}");
    }
    
    notifyListeners();
  }
  
  /// Toggle large text mode
  Future<void> toggleLargeText() async {
    _isLargeTextEnabled = !_isLargeTextEnabled;
    _textScaleFactor = _isLargeTextEnabled ? 1.3 : 1.0;
    await _saveSettings();
    
    // Provide haptic feedback
    HapticFeedback.mediumImpact();
    
    // Speak change if TTS is enabled
    if (_isTextToSpeechEnabled && _isTTSInitialized) {
      speak("Large text mode ${_isLargeTextEnabled ? 'enabled' : 'disabled'}");
    }
    
    notifyListeners();
  }
  
  /// Set the text scale factor directly
  Future<void> setTextScaleFactor(double factor) async {
    _textScaleFactor = factor.clamp(0.8, 2.0); // Restrict to reasonable range
    _isLargeTextEnabled = _textScaleFactor > 1.1;
    await _saveSettings();
    
    // Provide haptic feedback
    HapticFeedback.selectionClick();
    
    notifyListeners();
  }
  
  /// Speak text using TTS
  Future<void> speak(String text) async {
    if (!_isTextToSpeechEnabled || !_isTTSInitialized) return;
    
    try {
      // Stop any ongoing speech
      await stop();
      
      // Speak the new text
      await _flutterTts.speak(text);
    } catch (e) {
      print("TTS speak error: $e");
    }
  }
  
  /// Stop any ongoing TTS playback
  Future<void> stop() async {
    if (!_isTTSInitialized) return;
    
    try {
      await _flutterTts.stop();
    } catch (e) {
      print("TTS stop error: $e");
    }
  }
  
  /// Get the high-contrast color theme
  ThemeData getHighContrastTheme() {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.black,
      primaryColor: Colors.yellow, // High contrast primary color
      colorScheme: const ColorScheme.dark(
        primary: Colors.yellow,
        secondary: Colors.white,
        error: Colors.red,
        background: Colors.black,
        surface: Color(0xFF121212),
        onPrimary: Colors.black,
        onSecondary: Colors.black,
        onSurface: Colors.white,
        onBackground: Colors.white,
        onError: Colors.white,
        brightness: Brightness.dark,
      ),
      // Form fields
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF222222),
        border: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.white, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.white, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.yellow, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        labelStyle: const TextStyle(color: Colors.white),
      ),
      // Cards
      cardTheme: CardTheme(
        color: const Color(0xFF222222),
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Colors.white, width: 1.5),
        ),
      ),
      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.yellow,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.yellow,
          side: const BorderSide(color: Colors.yellow, width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        ),
      ),
      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.black,
        foregroundColor: Colors.yellow,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.yellow),
      ),
      // Text themes
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: Colors.yellow,
          fontWeight: FontWeight.bold,
        ),
        headlineMedium: TextStyle(
          color: Colors.yellow,
          fontWeight: FontWeight.bold,
        ),
        headlineSmall: TextStyle(
          color: Colors.yellow,
          fontWeight: FontWeight.bold,
        ),
        titleLarge: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
        titleMedium: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
        titleSmall: TextStyle(
          color: Colors.white,
        ),
        bodyLarge: TextStyle(
          color: Colors.white,
        ),
        bodyMedium: TextStyle(
          color: Colors.white,
        ),
        bodySmall: TextStyle(
          color: Colors.white,
        ),
      ),
      // Bottom navigation bar
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.black,
        selectedItemColor: Colors.yellow,
        unselectedItemColor: Colors.white,
      ),
      // Icon theme
      iconTheme: const IconThemeData(
        color: Colors.yellow,
      ),
    );
  }
  
  /// Get the regular theme with the brand orange color
  ThemeData getRegularTheme() {
    return ThemeData(
      primaryColor: const Color(0xFFFFA000),
      colorScheme: ColorScheme.fromSwatch(
        primarySwatch: Colors.orange,
        accentColor: const Color(0xFFFFA000),
      ),
      // Keep the rest of your regular theme
    );
  }
  
  @override
  void dispose() {
    if (_isTTSInitialized) {
      _flutterTts.stop();
    }
    super.dispose();
  }
}