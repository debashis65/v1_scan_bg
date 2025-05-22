import 'package:flutter/material.dart';
import '../models/scan_position.dart';

class ScanGuideOverlay extends StatelessWidget {
  final bool isFootDetected;
  final bool isStable;
  final double confidence;
  final ScanPosition scanPosition;
  final int capturedCount;
  final int totalPositions;

  const ScanGuideOverlay({
    Key? key,
    required this.isFootDetected,
    required this.isStable,
    required this.confidence,
    required this.scanPosition,
    required this.capturedCount,
    required this.totalPositions,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Foot position guide overlay
        Positioned.fill(
          child: CustomPaint(
            painter: FootGuidePainter(
              isFootDetected: isFootDetected,
              isStable: isStable,
              confidence: confidence,
            ),
          ),
        ),
        
        // Position instruction
        Positioned(
          bottom: 100,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Position title
                  Text(
                    scanPosition.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Position instruction
                  Text(
                    scanPosition.instruction,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        // Progress indicator
        Positioned(
          top: 20,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              width: 160,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Progress text
                  Text(
                    'Progress $capturedCount/$totalPositions',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Progress indicator
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: capturedCount / totalPositions,
                        backgroundColor: Colors.grey[800],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          capturedCount == totalPositions
                              ? Colors.green
                              : Colors.blue,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class FootGuidePainter extends CustomPainter {
  final bool isFootDetected;
  final bool isStable;
  final double confidence;

  FootGuidePainter({
    required this.isFootDetected,
    required this.isStable,
    required this.confidence,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    // Calculate guide rectangle
    final double centerX = size.width / 2;
    final double centerY = size.height / 2;
    final double rectWidth = size.width * 0.7;
    final double rectHeight = size.height * 0.6;
    final Rect guideRect = Rect.fromCenter(
      center: Offset(centerX, centerY),
      width: rectWidth,
      height: rectHeight,
    );

    // Determine color based on detection status
    if (isFootDetected) {
      if (isStable) {
        // Green guide for foot detected and stable
        paint.color = Colors.green.withOpacity(0.8);
      } else {
        // Yellow guide for foot detected but not stable
        paint.color = Colors.orange.withOpacity(0.8);
      }
    } else {
      // Red guide for no foot detected
      paint.color = Colors.red.withOpacity(0.5);
    }

    // Draw rounded rectangle guide
    canvas.drawRRect(
      RRect.fromRectAndRadius(guideRect, const Radius.circular(20)),
      paint,
    );

    // Add corner marks for better visibility
    const double cornerLength = 30.0;
    final Paint cornerPaint = Paint()
      ..color = paint.color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0;

    // Draw corner marks (top left)
    canvas.drawLine(
      Offset(guideRect.left, guideRect.top + cornerLength),
      Offset(guideRect.left, guideRect.top),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(guideRect.left, guideRect.top),
      Offset(guideRect.left + cornerLength, guideRect.top),
      cornerPaint,
    );

    // Draw corner marks (top right)
    canvas.drawLine(
      Offset(guideRect.right - cornerLength, guideRect.top),
      Offset(guideRect.right, guideRect.top),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(guideRect.right, guideRect.top),
      Offset(guideRect.right, guideRect.top + cornerLength),
      cornerPaint,
    );

    // Draw corner marks (bottom left)
    canvas.drawLine(
      Offset(guideRect.left, guideRect.bottom - cornerLength),
      Offset(guideRect.left, guideRect.bottom),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(guideRect.left, guideRect.bottom),
      Offset(guideRect.left + cornerLength, guideRect.bottom),
      cornerPaint,
    );

    // Draw corner marks (bottom right)
    canvas.drawLine(
      Offset(guideRect.right - cornerLength, guideRect.bottom),
      Offset(guideRect.right, guideRect.bottom),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(guideRect.right, guideRect.bottom),
      Offset(guideRect.right, guideRect.bottom - cornerLength),
      cornerPaint,
    );

    // Add confidence indicator if foot is detected
    if (isFootDetected) {
      final TextPainter textPainter = TextPainter(
        text: TextSpan(
          text: "${(confidence * 100).toFixed(0)}%",
          style: TextStyle(
            color: paint.color,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(
          guideRect.right - textPainter.width - 10,
          guideRect.top - 30,
        ),
      );
    }
  }

  @override
  bool shouldRepaint(FootGuidePainter oldDelegate) {
    return oldDelegate.isFootDetected != isFootDetected ||
        oldDelegate.isStable != isStable ||
        oldDelegate.confidence != confidence;
  }
}

extension DoubleExtension on double {
  String toFixed(int fractionDigits) {
    return toStringAsFixed(fractionDigits);
  }
}