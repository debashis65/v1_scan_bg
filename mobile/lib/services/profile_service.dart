import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:barogrip/services/auth_service.dart';
import 'package:barogrip/config/api_config.dart';

class ProfileService {
  final String _baseUrl = ApiConfig.baseUrl;
  
  Future<Map<String, dynamic>> getProfileData() async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/patient/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to load profile data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load profile data: ${e.toString()}');
    }
  }
  
  Future<Map<String, dynamic>> updateProfileData(Map<String, dynamic> profileData) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.put(
        Uri.parse('$_baseUrl/api/patient/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(profileData),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to update profile: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to update profile: ${e.toString()}');
    }
  }
  
  Future<Map<String, dynamic>> getDoctorDetails(int doctorId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/doctors/$doctorId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else if (response.statusCode == 404) {
        throw Exception('Doctor not found');
      } else {
        throw Exception('Failed to load doctor details: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load doctor details: ${e.toString()}');
    }
  }
  
  Future<List<Map<String, dynamic>>> getMyDoctors() async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/patient/doctors'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to load doctors: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load doctors: ${e.toString()}');
    }
  }
  
  Future<Map<String, dynamic>> updateNotificationSettings(Map<String, dynamic> settings) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.put(
        Uri.parse('$_baseUrl/api/patient/notification-settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(settings),
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to update notification settings: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to update notification settings: ${e.toString()}');
    }
  }
  
  Future<Map<String, dynamic>> getNotificationSettings() async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/patient/notification-settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to load notification settings: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load notification settings: ${e.toString()}');
    }
  }
  
  Future<bool> updateProfileImage(String imagePath) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      // Create a multipart request
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$_baseUrl/api/patient/profile/image'),
      );
      
      // Add headers
      request.headers.addAll({
        'Authorization': 'Bearer $token',
      });
      
      // Add the file
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        imagePath,
      ));
      
      // Send the request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to update profile image: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to update profile image: ${e.toString()}');
    }
  }
}