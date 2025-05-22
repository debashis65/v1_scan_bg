import 'package:vector_math/vector_math_64.dart';
import '../ar/common/ar_interface.dart';

enum FootSide {
  left,
  right
}

class FootModel {
  final FootSide side;
  final double length;
  final double width;
  final double archHeight;
  final double instepHeight;
  final String meshPath;
  final List<FootMeasurementPoint> measurementPoints;
  final ScanQuality scanQuality;
  final DateTime scanDate;

  FootModel({
    required this.side,
    required this.length,
    required this.width,
    required this.archHeight,
    required this.instepHeight,
    required this.meshPath,
    required this.measurementPoints,
    required this.scanQuality,
    required this.scanDate,
  });

  Map<String, dynamic> toJson() {
    return {
      'side': side.toString().split('.').last,
      'length': length,
      'width': width,
      'archHeight': archHeight,
      'instepHeight': instepHeight,
      'meshPath': meshPath,
      'scanQuality': scanQuality.toString().split('.').last,
      'scanDate': scanDate.toIso8601String(),
      'measurementPoints': measurementPoints.map((point) => {
        'x': point.position.x,
        'y': point.position.y,
        'z': point.position.z,
        'label': point.label,
        'description': point.description,
      }).toList(),
    };
  }

  factory FootModel.fromJson(Map<String, dynamic> json) {
    return FootModel(
      side: json['side'] == 'left' ? FootSide.left : FootSide.right,
      length: json['length'],
      width: json['width'],
      archHeight: json['archHeight'],
      instepHeight: json['instepHeight'],
      meshPath: json['meshPath'],
      scanQuality: _parseScanQuality(json['scanQuality']),
      scanDate: DateTime.parse(json['scanDate']),
      measurementPoints: (json['measurementPoints'] as List).map((pointJson) {
        return FootMeasurementPoint(
          position: Vector3(
            pointJson['x'],
            pointJson['y'],
            pointJson['z'],
          ),
          label: pointJson['label'],
          description: pointJson['description'],
        );
      }).toList(),
    );
  }

  static ScanQuality _parseScanQuality(String quality) {
    switch (quality) {
      case 'excellent':
        return ScanQuality.excellent;
      case 'good':
        return ScanQuality.good;
      case 'fair':
        return ScanQuality.fair;
      case 'poor':
        return ScanQuality.poor;
      default:
        return ScanQuality.insufficient;
    }
  }

  // Helper methods
  String get sideDisplay => side == FootSide.left ? 'Left' : 'Right';
  
  String get lengthDisplay => '${length.toStringAsFixed(1)} cm';
  
  String get widthDisplay => '${width.toStringAsFixed(1)} cm';
  
  String get archHeightDisplay => '${archHeight.toStringAsFixed(1)} cm';
  
  String get instepHeightDisplay => '${instepHeight.toStringAsFixed(1)} cm';
  
  String get scanQualityDisplay {
    switch (scanQuality) {
      case ScanQuality.excellent:
        return 'Excellent';
      case ScanQuality.good:
        return 'Good';
      case ScanQuality.fair:
        return 'Fair';
      case ScanQuality.poor:
        return 'Poor';
      default:
        return 'Insufficient';
    }
  }
  
  String get scanDateDisplay {
    return '${scanDate.year}-${scanDate.month.toString().padLeft(2, '0')}-${scanDate.day.toString().padLeft(2, '0')}';
  }
}