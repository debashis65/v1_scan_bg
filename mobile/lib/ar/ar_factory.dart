import 'dart:io';
import 'package:barogrip/ar/common/ar_interface.dart';

/// Factory class for creating platform-specific AR implementations
class ARFactory {
  /// Create an appropriate AR interface based on the current platform
  static ARInterface createARInterface() {
    if (Platform.isIOS) {
      return ARKitInterface();
    } else if (Platform.isAndroid) {
      return ARCoreInterface();
    } else {
      throw UnsupportedError('AR is only supported on iOS and Android platforms');
    }
  }
}