class User {
  final int id;
  final String username;
  final String email;
  final String fullName;
  final String role;
  final String createdAt;
  final String updatedAt;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      fullName: json['fullName'],
      role: json['role'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'fullName': fullName,
      'role': role,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class PatientProfile {
  final int id;
  final int userId;
  final int? age;
  final String? gender;
  final double? height;
  final double? weight;
  final String? shoeSize;
  final String? shoeSizeUnit;
  final bool usedOrthopedicInsoles;
  final bool hasDiabetes;
  final bool hasHeelSpur;
  final String? footPain;
  final String createdAt;
  final String updatedAt;

  PatientProfile({
    required this.id,
    required this.userId,
    this.age,
    this.gender,
    this.height,
    this.weight,
    this.shoeSize,
    this.shoeSizeUnit,
    required this.usedOrthopedicInsoles,
    required this.hasDiabetes,
    required this.hasHeelSpur,
    this.footPain,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PatientProfile.fromJson(Map<String, dynamic> json) {
    return PatientProfile(
      id: json['id'],
      userId: json['userId'],
      age: json['age'],
      gender: json['gender'],
      height: json['height']?.toDouble(),
      weight: json['weight']?.toDouble(),
      shoeSize: json['shoeSize'],
      shoeSizeUnit: json['shoeSizeUnit'],
      usedOrthopedicInsoles: json['usedOrthopedicInsoles'] ?? false,
      hasDiabetes: json['hasDiabetes'] ?? false,
      hasHeelSpur: json['hasHeelSpur'] ?? false,
      footPain: json['footPain'],
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'age': age,
      'gender': gender,
      'height': height,
      'weight': weight,
      'shoeSize': shoeSize,
      'shoeSizeUnit': shoeSizeUnit,
      'usedOrthopedicInsoles': usedOrthopedicInsoles,
      'hasDiabetes': hasDiabetes,
      'hasHeelSpur': hasHeelSpur,
      'footPain': footPain,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
