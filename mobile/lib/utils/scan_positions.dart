/// Class representing a foot scanning position
class ScanPosition {
  final String name;
  final String description;
  final String? overlayPath;
  final int requiredDurationSeconds;
  
  const ScanPosition({
    required this.name,
    required this.description,
    this.overlayPath,
    this.requiredDurationSeconds = 0,
  });
}

/// Utility class for standard foot scanning positions
class ScanPositions {
  /// Standard set of scanning positions for complete foot analysis
  static const List<ScanPosition> standardPositions = [
    ScanPosition(
      name: "Top View",
      description: "Stand normally with your foot centered in the frame",
      overlayPath: "assets/images/top_view_overlay.png",
    ),
    ScanPosition(
      name: "Side View",
      description: "Place your foot sideways with arch visible",
      overlayPath: "assets/images/side_view_overlay.png",
    ),
    ScanPosition(
      name: "Arch View",
      description: "Position the arch of your foot in the center",
      overlayPath: "assets/images/arch_overlay.png",
    ),
    ScanPosition(
      name: "Heel View",
      description: "Show the back of your heel in the frame",
      overlayPath: "assets/images/heel_overlay.png",
    ),
  ];

  /// Set of scanning positions for quick scan (fewer positions)
  static const List<ScanPosition> quickScanPositions = [
    ScanPosition(
      name: "Top View",
      description: "Stand normally with your foot centered in the frame",
      overlayPath: "assets/images/top_view_overlay.png",
    ),
    ScanPosition(
      name: "Side View",
      description: "Place your foot sideways with arch visible",
      overlayPath: "assets/images/side_view_overlay.png",
    ),
  ];
  
  /// Position for pressure map scanning
  static const ScanPosition pressureMapPosition = ScanPosition(
    name: "Pressure Map",
    description: "Stand with full weight on your foot",
    overlayPath: "assets/images/pressure_overlay.png",
    requiredDurationSeconds: 3,
  );
}
