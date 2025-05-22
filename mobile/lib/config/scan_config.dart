import '../models/scan_position.dart';

class ScanConfig {
  static const List<ScanPosition> scanPositions = [
    ScanPosition(
      name: 'Top View',
      instruction: 'Position the camera directly above your foot',
      imagePath: 'assets/images/scan_positions/top_view.png',
      angleX: 0.0,
      angleY: 0.0,
      angleZ: 0.0,
    ),
    ScanPosition(
      name: 'Outer Side',
      instruction: 'Position the camera at the outer side of your foot',
      imagePath: 'assets/images/scan_positions/outer_side.png',
      angleX: 0.0,
      angleY: 90.0,
      angleZ: 0.0,
    ),
    ScanPosition(
      name: 'Inner Side',
      instruction: 'Position the camera at the inner side of your foot',
      imagePath: 'assets/images/scan_positions/inner_side.png',
      angleX: 0.0,
      angleY: -90.0,
      angleZ: 0.0,
    ),
    ScanPosition(
      name: 'Heel View',
      instruction: 'Position the camera behind your heel',
      imagePath: 'assets/images/scan_positions/heel_view.png',
      angleX: 0.0,
      angleY: 180.0,
      angleZ: 0.0,
    ),
    ScanPosition(
      name: 'Arch View',
      instruction: 'Position the camera to capture your arch from below',
      imagePath: 'assets/images/scan_positions/arch_view.png',
      angleX: 45.0,
      angleY: -90.0,
      angleZ: 0.0,
    ),
  ];
}