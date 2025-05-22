/// Model class representing a foot scan
class Scan {
  final int id;
  final int patientId;
  final String status;
  final String footSide;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? processedAt;
  final String? aiDiagnosis;
  final double? aiConfidence;
  final String? objUrl;
  final String? stlUrl;
  final String? thumbnailUrl;
  
  // Basic measurements
  final double? footLength;
  final double? footWidth;
  final double? archHeight;
  final double? instepHeight;
  
  // Advanced measurements
  final Map<String, dynamic>? advancedMeasurements;
  
  // Pressure distribution and skin tone analysis
  final Map<String, dynamic>? pressureDistribution;
  final Map<String, dynamic>? skinToneAnalysis;
  
  // Arch type analysis
  final Map<String, dynamic>? archAnalysis;
  
  // Vascular metrics
  final Map<String, dynamic>? vascularMetrics;
  
  final Map<String, dynamic>? metadata;
  final Map<String, dynamic>? aiData;
  
  Scan({
    required this.id,
    required this.patientId,
    required this.status,
    required this.footSide,
    required this.createdAt,
    this.updatedAt,
    this.processedAt,
    this.aiDiagnosis,
    this.aiConfidence,
    this.objUrl,
    this.stlUrl,
    this.thumbnailUrl,
    this.footLength,
    this.footWidth,
    this.archHeight,
    this.instepHeight,
    this.advancedMeasurements,
    this.pressureDistribution,
    this.skinToneAnalysis,
    this.archAnalysis,
    this.vascularMetrics,
    this.metadata,
    this.aiData,
  });
  
  /// Create a Scan from a JSON object
  factory Scan.fromJson(Map<String, dynamic> json) {
    // Extract advanced data from aiData if not explicitly provided
    Map<String, dynamic>? aiDataMap = json['aiData'];
    
    // Extract nested advanced data from aiData if available
    Map<String, dynamic>? advancedMeasurementsMap = json['advancedMeasurements'];
    Map<String, dynamic>? pressureDistributionMap = json['pressureDistribution'];
    Map<String, dynamic>? skinToneAnalysisMap = json['skinToneAnalysis'];
    Map<String, dynamic>? archAnalysisMap = json['archAnalysis'];
    Map<String, dynamic>? vascularMetricsMap = json['vascularMetrics'];
    
    // If advanced data is not directly in the JSON but is in aiData, extract it
    if (aiDataMap != null) {
      if (advancedMeasurementsMap == null && aiDataMap['advanced_measurements'] != null) {
        advancedMeasurementsMap = aiDataMap['advanced_measurements'];
      }
      
      if (pressureDistributionMap == null && aiDataMap['pressure_distribution'] != null) {
        pressureDistributionMap = aiDataMap['pressure_distribution'];
      }
      
      if (skinToneAnalysisMap == null && aiDataMap['skin_tone_analysis'] != null) {
        skinToneAnalysisMap = aiDataMap['skin_tone_analysis'];
      }
      
      if (archAnalysisMap == null && aiDataMap['arch_analysis'] != null) {
        archAnalysisMap = aiDataMap['arch_analysis'];
      }
      
      if (vascularMetricsMap == null && aiDataMap['vascular_metrics'] != null) {
        vascularMetricsMap = aiDataMap['vascular_metrics'];
      }
    }
    
    return Scan(
      id: json['id'],
      patientId: json['patientId'],
      status: json['status'],
      footSide: json['footSide'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      processedAt: json['processedAt'] != null ? DateTime.parse(json['processedAt']) : null,
      aiDiagnosis: json['aiDiagnosis'],
      aiConfidence: json['aiConfidence'] != null ? json['aiConfidence'].toDouble() : null,
      objUrl: json['objUrl'],
      stlUrl: json['stlUrl'],
      thumbnailUrl: json['thumbnailUrl'],
      footLength: json['footLength'] != null ? json['footLength'].toDouble() : null,
      footWidth: json['footWidth'] != null ? json['footWidth'].toDouble() : null,
      archHeight: json['archHeight'] != null ? json['archHeight'].toDouble() : null,
      instepHeight: json['instepHeight'] != null ? json['instepHeight'].toDouble() : null,
      advancedMeasurements: advancedMeasurementsMap,
      pressureDistribution: pressureDistributionMap,
      skinToneAnalysis: skinToneAnalysisMap,
      archAnalysis: archAnalysisMap,
      vascularMetrics: vascularMetricsMap,
      metadata: json['metadata'],
      aiData: aiDataMap,
    );
  }
  
  /// Convert the scan to a JSON object
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'status': status,
      'footSide': footSide,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'processedAt': processedAt?.toIso8601String(),
      'aiDiagnosis': aiDiagnosis,
      'aiConfidence': aiConfidence,
      'objUrl': objUrl,
      'stlUrl': stlUrl,
      'thumbnailUrl': thumbnailUrl,
      'footLength': footLength,
      'footWidth': footWidth,
      'archHeight': archHeight,
      'instepHeight': instepHeight,
      'advancedMeasurements': advancedMeasurements,
      'pressureDistribution': pressureDistribution,
      'skinToneAnalysis': skinToneAnalysis,
      'archAnalysis': archAnalysis,
      'vascularMetrics': vascularMetrics,
      'metadata': metadata,
      'aiData': aiData,
    };
  }
  
  /// Get a visual status indicator color code
  String getStatusColor() {
    switch (status.toLowerCase()) {
      case 'processing':
      case 'analyzing':
      case 'generating_model':
        return 'orange';
      case 'error':
        return 'red';
      case 'complete':
        return 'green';
      default:
        return 'grey';
    }
  }
  
  /// Get a human-readable status text
  String getStatusText() {
    switch (status.toLowerCase()) {
      case 'processing':
        return 'Processing Images';
      case 'analyzing':
        return 'AI Analysis';
      case 'generating_model':
        return 'Generating 3D Model';
      case 'error':
        return 'Processing Failed';
      case 'complete':
        return 'Complete';
      default:
        return 'Pending';
    }
  }
  
  /// Get a descriptive text for the foot side
  String getFootSideText() {
    return footSide.toLowerCase() == 'left' ? 'Left Foot' : 'Right Foot';
  }
  
  /// Get a formatted date string
  String getFormattedDate() {
    final date = processedAt ?? updatedAt ?? createdAt;
    return '${date.day}/${date.month}/${date.year}';
  }
  
  /// Get a specific advanced measurement value
  dynamic getAdvancedMeasurement(String key, {String subKey = ''}) {
    if (advancedMeasurements == null) return null;
    if (subKey.isEmpty) {
      return advancedMeasurements![key];
    } else {
      final mainValue = advancedMeasurements![key];
      if (mainValue is Map<String, dynamic>) {
        return mainValue[subKey];
      }
      return null;
    }
  }
  
  /// Get a specific skin tone analysis value
  dynamic getSkinToneValue(String key) {
    if (skinToneAnalysis == null) return null;
    return skinToneAnalysis![key];
  }
  
  /// Get the Fitzpatrick skin type
  String? getFitzpatrickType() {
    if (skinToneAnalysis == null) return null;
    return skinToneAnalysis!['fitzpatrick_type']?.toString();
  }
  
  /// Get skin tone RGB values
  Map<String, int>? getSkinToneRGB() {
    if (skinToneAnalysis == null || skinToneAnalysis!['rgb_values'] == null) return null;
    final rgb = skinToneAnalysis!['rgb_values'] as Map<dynamic, dynamic>;
    return {
      'r': rgb['r'] as int,
      'g': rgb['g'] as int,
      'b': rgb['b'] as int,
    };
  }
  
  /// Get vascular visibility score
  double? getVascularVisibilityScore() {
    if (vascularMetrics == null) return null;
    final score = vascularMetrics!['visibility_score'];
    if (score is double) return score;
    if (score is int) return score.toDouble();
    return null;
  }
  
  /// Get arch type
  String? getArchType() {
    if (archAnalysis == null) return null;
    return archAnalysis!['arch_type']?.toString();
  }
  
  /// Get pressure points as a list
  List<Map<String, dynamic>>? getPressurePoints() {
    if (pressureDistribution == null || pressureDistribution!['pressure_points'] == null) {
      return null;
    }
    final points = pressureDistribution!['pressure_points'] as List<dynamic>;
    return points.map((point) => point as Map<String, dynamic>).toList();
  }
  
  /// Check if has advanced data
  bool hasAdvancedData() {
    return advancedMeasurements != null || 
           skinToneAnalysis != null || 
           archAnalysis != null || 
           vascularMetrics != null ||
           pressureDistribution != null;
  }
}