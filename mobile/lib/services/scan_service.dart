import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:barogrip/config/api_config.dart';
import 'package:barogrip/models/scan.dart';
import 'package:barogrip/services/auth_service.dart';

/// Service for handling scan related operations
class ScanService {
  final String _baseUrl = ApiConfig.baseUrl;
  
  /// Upload a foot scan to the server
  /// 
  /// Parameters:
  /// - [meshFile] The 3D mesh file generated from the AR scan
  /// - [footData] Additional foot data captured during the scan
  /// - [footSide] Which foot (left/right)
  Future<Map<String, dynamic>> uploadFootScan(
    File meshFile,
    Map<String, dynamic> footData,
    String footSide,
  ) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      // Create a multipart request for the mesh file
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$_baseUrl/api/scans'),
      );
      
      // Add headers and authorization
      request.headers.addAll({
        'Authorization': 'Bearer $token',
      });
      
      // Add the mesh file
      request.files.add(await http.MultipartFile.fromPath(
        'mesh',
        meshFile.path,
      ));
      
      // Add metadata as fields
      request.fields['footSide'] = footSide;
      request.fields['metadata'] = json.encode(footData);
      
      // Send the request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to upload scan: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to upload scan: ${e.toString()}');
    }
  }
  
  /// Get a specific scan by ID
  Future<Scan> getScan(int scanId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/scans/$scanId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return Scan.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to load scan: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load scan: ${e.toString()}');
    }
  }
  
  /// Get all scans for the logged-in patient
  Future<List<Scan>> getMyScans() async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/patient/scans'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((scan) => Scan.fromJson(scan)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to load scans: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load scans: ${e.toString()}');
    }
  }
  
  /// Get scan images for a specific scan
  Future<List<Map<String, dynamic>>> getScanImages(int scanId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/scans/$scanId/images'),
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
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to load scan images: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load scan images: ${e.toString()}');
    }
  }
  
  /// Get all prescriptions for a specific scan
  Future<List<Map<String, dynamic>>> getScanPrescriptions(int scanId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/scans/$scanId/prescriptions'),
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
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to load prescriptions: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load prescriptions: ${e.toString()}');
    }
  }
  
  /// Get all consultations for a specific scan
  Future<List<Map<String, dynamic>>> getScanConsultations(int scanId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/scans/$scanId/consultations'),
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
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to load consultations: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load consultations: ${e.toString()}');
    }
  }
  
  /// Request a second opinion for a scan
  Future<Map<String, dynamic>> requestSecondOpinion(int scanId, String notes) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.post(
        Uri.parse('$_baseUrl/api/scans/$scanId/second-opinion'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'notes': notes,
        }),
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to request second opinion: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to request second opinion: ${e.toString()}');
    }
  }
  
  /// Get 3D model URLs for a scan
  Future<Map<String, String>> getScan3DModelUrls(int scanId) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      final response = await http.get(
        Uri.parse('$_baseUrl/api/scans/$scanId/model-urls'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'obj': data['objUrl'] ?? '',
          'stl': data['stlUrl'] ?? '',
          'thumbnail': data['thumbnailUrl'] ?? '',
        };
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else if (response.statusCode == 404) {
        throw Exception('Scan not found');
      } else {
        throw Exception('Failed to load 3D model URLs: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to load 3D model URLs: ${e.toString()}');
    }
  }
}
  /// Upload multiple scan images for a 3D foot scan
  /// 
  /// Parameters:
  /// - [images] List of image files captured during the scan
  Future<Map<String, dynamic>> uploadScanImages(List<File> images) async {
    try {
      final token = await AuthService().getToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }
      
      // Create a multipart request for the image files
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$_baseUrl/api/scans/images'),
      );
      
      // Add headers and authorization
      request.headers.addAll({
        'Authorization': 'Bearer $token',
      });
      
      // Add metadata as fields
      request.fields['footSide'] = 'both'; // Can be overridden if needed
      request.fields['scanType'] = 'multi-view';
      request.fields['imageCount'] = images.length.toString();
      
      // Add each image file
      for (int i = 0; i < images.length; i++) {
        request.files.add(await http.MultipartFile.fromPath(
          'image_$i',
          images[i].path,
        ));
      }
      
      // Send the request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized access');
      } else {
        throw Exception('Failed to upload scan images: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to upload scan images: ${e.toString()}');
    }
  }
