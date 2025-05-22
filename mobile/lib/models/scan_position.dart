class ScanPosition {
  final String name;
  final String instruction;
  final String imagePath;
  final double angleX;
  final double angleY;
  final double angleZ;
  
  const ScanPosition({
    required this.name,
    required this.instruction,
    required this.imagePath,
    this.angleX = 0.0,
    this.angleY = 0.0,
    this.angleZ = 0.0,
  });
}