class ApiConfig {
  // Base URL for API endpoints
  static const String baseUrl = "https://api.barogrip.com";
  
  // API timeout values
  static const int connectTimeoutSeconds = 10;
  static const int receiveTimeoutSeconds = 30;
  
  // API endpoints
  static const String login = "/api/auth/login";
  static const String register = "/api/auth/register";
  static const String validateFootDetection = "/api/validate-foot-detection";
  static const String uploadScan = "/api/scans";
  static const String getScan = "/api/scans/";
  static const String getPatientScans = "/api/patient/scans";
}