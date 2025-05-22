class Prescription {
  final int id;
  final int scanId;
  final int doctorId;
  final int patientId;
  final String title;
  final String description;
  final String? recommendedProduct;
  final String? recommendedExercises;
  final String createdAt;
  final String updatedAt;
  final String? doctorName; // Not from the API, used for UI display

  Prescription({
    required this.id,
    required this.scanId,
    required this.doctorId,
    required this.patientId,
    required this.title,
    required this.description,
    this.recommendedProduct,
    this.recommendedExercises,
    required this.createdAt,
    required this.updatedAt,
    this.doctorName,
  });

  factory Prescription.fromJson(Map<String, dynamic> json) {
    return Prescription(
      id: json['id'],
      scanId: json['scanId'],
      doctorId: json['doctorId'],
      patientId: json['patientId'],
      title: json['title'],
      description: json['description'],
      recommendedProduct: json['recommendedProduct'],
      recommendedExercises: json['recommendedExercises'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      doctorName: json['doctorName'], // This field may not be in the API response
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'scanId': scanId,
      'doctorId': doctorId,
      'patientId': patientId,
      'title': title,
      'description': description,
      'recommendedProduct': recommendedProduct,
      'recommendedExercises': recommendedExercises,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
  
  String get formattedDate {
    final date = DateTime.parse(createdAt);
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
  
  // Helper methods to identify prescription types
  bool get hasProduct => recommendedProduct != null && recommendedProduct!.isNotEmpty;
  bool get hasExercises => recommendedExercises != null && recommendedExercises!.isNotEmpty;
}
