import 'package:flutter/material.dart';
import '../utils/scan_positions.dart';

class CameraOverlay extends StatelessWidget {
  final ScanPosition position;
  
  const CameraOverlay({
    Key? key,
    required this.position,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background overlay with transparent cutout
        _buildOverlay(),
        
        // Position guidance
        Positioned(
          bottom: 160,
          left: 20,
          right: 20,
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  position.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  position.description,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOverlay() {
    return CustomPaint(
      painter: OverlayPainter(
        position: position,
      ),
      child: Container(),
    );
  }
}

class OverlayPainter extends CustomPainter {
  final ScanPosition position;
  
  OverlayPainter({
    required this.position,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    // Calculate overlay shape based on position type
    Path overlayPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    
    // Create cutout path based on position
    Path cutoutPath = _getCutoutPath(size);
    
    // Combine paths using difference operation to create transparent cutout
    Path finalPath = Path.combine(
      PathOperation.difference,
      overlayPath,
      cutoutPath,
    );
    
    canvas.drawPath(finalPath, paint);
    
    // Draw cutout border for visibility
    Paint borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
      
    canvas.drawPath(cutoutPath, borderPaint);
  }
  
  Path _getCutoutPath(Size size) {
    // Default cutout is a rounded rectangle in the center
    final double width = size.width * 0.8;
    final double height = size.height * 0.4;
    final double left = (size.width - width) / 2;
    final double top = (size.height - height) / 2;
    
    // Different shapes based on the scan position
    switch (position.name) {
      case "Top View":
        // Wider rectangle for top view
        return Path()
          ..addRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(left, top, width, height),
              const Radius.circular(16),
            ),
          );
      
      case "Side View":
        // Taller rectangle for side view
        return Path()
          ..addRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(
                left,
                top - 40,
                width,
                height + 80,
              ),
              const Radius.circular(16),
            ),
          );
          
      case "Arch View":
        // Circular shape for arch view
        final double radius = size.width * 0.3;
        return Path()
          ..addOval(
            Rect.fromCenter(
              center: Offset(size.width / 2, size.height / 2),
              width: radius * 2,
              height: radius * 2,
            ),
          );
          
      case "Foot Detection":
        // Foot shaped cutout for detection
        return Path()
          ..addRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(
                left - 20,
                top - 20,
                width + 40,
                height + 40,
              ),
              const Radius.circular(24),
            ),
          );
      
      default:
        // Default rounded rectangle
        return Path()
          ..addRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(left, top, width, height),
              const Radius.circular(16),
            ),
          );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}
