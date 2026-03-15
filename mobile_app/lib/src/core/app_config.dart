import 'package:flutter/foundation.dart';

class AppConfig {
  static const String _lanApiBase =
      'http://192.168.1.60/barangay-reservation-system/api';

  static String get apiBaseUrl {
    if (kIsWeb) {
      return _lanApiBase;
    }
    return _lanApiBase;
  }
}
