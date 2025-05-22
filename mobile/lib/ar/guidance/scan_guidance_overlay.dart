import 'dart:math';
import 'package:flutter/material.dart';
import '../common/ar_interface.dart';

class ScanGuidanceOverlay extends StatefulWidget {
  final ScanStatus scanStatus;
  final FeedbackType? feedbackType;
  final ScanQuality scanQuality;
  final int qualityPercentage;
  final bool isLeftFoot;
  
  const ScanGuidanceOverlay({
    Key? key,
    required this.scanStatus,
    this.feedbackType,
    required this.scanQuality,
    required this.qualityPercentage,
    required this.isLeftFoot,
  }) : super(key: key);

  @override
  State<ScanGuidanceOverlay> createState() => _ScanGuidanceOverlayState();
}

class _ScanGuidanceOverlayState extends State<ScanGuidanceOverlay> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _rotateAnimation;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this, 
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    
    _rotateAnimation = Tween<double>(begin: 0, end: 2 * pi).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.linear),
    );
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    if (widget.scanStatus != ScanStatus.scanning) {
      return const SizedBox.shrink();
    }
    
    return Stack(
      children: [
        // 1. Foot outline guide
        _buildFootOutlineGuide(),
        
        // 2. Directional guidance based on feedback
        if (widget.feedbackType != null)
          _buildDirectionalGuidance(widget.feedbackType!),
        
        // 3. Scan progress indicator
        Positioned(
          top: 16,
          right: 16,
          child: _buildScanProgressIndicator(),
        ),
        
        // 4. Quality zones visualization
        Positioned(
          bottom: 120,
          left: 0,
          right: 0,
          child: _buildQualityZonesVisualization(),
        ),
      ],
    );
  }
  
  Widget _buildFootOutlineGuide() {
    // Show a foot outline that adapts based on the feedback
    return Center(
      child: Opacity(
        opacity: 0.6,
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return Transform.scale(
              scale: _getSuggestedScale(),
              child: CustomPaint(
                size: const Size(200, 400),
                painter: FootOutlinePainter(
                  isLeftFoot: widget.isLeftFoot,
                  highlightedZone: _getHighlightedZone(),
                  pulseFactor: _pulseAnimation.value,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
  
  double _getSuggestedScale() {
    // Adjust the scale based on the feedback (too close/far)
    if (widget.feedbackType == FeedbackType.tooClose) {
      return 0.8; // Make outline smaller to suggest moving away
    } else if (widget.feedbackType == FeedbackType.tooFar) {
      return 1.2; // Make outline larger to suggest moving closer
    } else {
      return 1.0; // Normal scale
    }
  }
  
  FootZone _getHighlightedZone() {
    // Determine which part of the foot to highlight based on feedback
    switch (widget.feedbackType) {
      case FeedbackType.scanningTop:
        return FootZone.top;
      case FeedbackType.scanningBottom:
        return FootZone.bottom;
      case FeedbackType.scanningLeft:
        return FootZone.left;
      case FeedbackType.scanningRight:
        return FootZone.right;
      case FeedbackType.scanningInsideArch:
        return FootZone.insideArch;
      case FeedbackType.scanningOutsideArch:
        return FootZone.outsideArch;
      default:
        return FootZone.none;
    }
  }
  
  Widget _buildDirectionalGuidance(FeedbackType feedback) {
    // Show animated arrows or instructions based on the feedback
    IconData icon = Icons.help_outline;
    Color color = Colors.blue;
    String message = '';
    bool showRotation = false;
    bool showPulse = false;
    
    switch (feedback) {
      case FeedbackType.tooClose:
        icon = Icons.person;
        color = Colors.orange;
        message = 'Step back from the phone';
        showPulse = true;
        break;
      case FeedbackType.tooFar:
        icon = Icons.person;
        color = Colors.orange;
        message = 'Step closer to the phone';
        showPulse = true;
        break;
      case FeedbackType.tooFast:
        icon = Icons.accessibility_new;
        color = Colors.orange;
        message = 'Move more slowly';
        break;
      case FeedbackType.holdSteady:
        icon = Icons.accessibility;
        color = Colors.orange;
        message = 'Stand still';
        showPulse = true;
        break;
      case FeedbackType.phoneMoving:
        icon = Icons.vibration;
        color = Colors.red;
        message = 'Phone is moving! Keep it stable';
        showPulse = true;
        break;
      case FeedbackType.moveToPosition1:
        icon = Icons.arrow_forward;
        color = Colors.blue;
        message = 'Stand directly in front of foot';
        showPulse = true;
        break;
      case FeedbackType.moveToPosition2:
        icon = Icons.arrow_forward;
        color = Colors.blue;
        message = 'Move to the left side of foot';
        showPulse = true;
        break;
      case FeedbackType.moveToPosition3:
        icon = Icons.arrow_forward;
        color = Colors.blue;
        message = 'Move to the right side of foot';
        showPulse = true;
        break;
      case FeedbackType.moveToPosition4:
        icon = Icons.arrow_forward;
        color = Colors.blue;
        message = 'Move behind the foot';
        showPulse = true;
        break;
      case FeedbackType.moveToPosition5:
        icon = Icons.arrow_downward;
        color = Colors.blue;
        message = 'Position above the foot';
        showPulse = true;
        break;
      case FeedbackType.scanComplete:
        icon = Icons.check_circle;
        color = Colors.green;
        message = 'Complete!';
        showPulse = true;
        break;
      case FeedbackType.lowLight:
        icon = Icons.wb_sunny;
        color = Colors.deepOrange;
        message = 'Need better lighting in room';
        showPulse = true;
        break;
      case FeedbackType.goodQuality:
        icon = Icons.thumb_up;
        color = Colors.green;
        message = 'Good quality!';
        break;
      case FeedbackType.poorQuality:
        icon = Icons.thumb_down;
        color = Colors.red;
        message = 'Need better scan';
        showPulse = true;
        break;
      case FeedbackType.needMoreAngles:
        icon = Icons.rotate_90_degrees_ccw;
        color = Colors.orange;
        message = 'Move to a different position';
        showRotation = true;
        break;
      case FeedbackType.scanningLeft:
      case FeedbackType.scanningRight:
      case FeedbackType.scanningTop:
      case FeedbackType.scanningBottom:
      case FeedbackType.scanningInsideArch:
      case FeedbackType.scanningOutsideArch:
        // These zones are highlighted in the foot outline
        return const SizedBox.shrink();
      default:
        return const SizedBox.shrink();
    }
    
    return Positioned(
      top: 100,
      left: 0,
      right: 0,
      child: Column(
        children: [
          AnimatedBuilder(
            animation: _animationController,
            builder: (context, child) {
              return Transform.scale(
                scale: showPulse ? _pulseAnimation.value : 1.0,
                child: Transform.rotate(
                  angle: showRotation ? _rotateAnimation.value : 0.0,
                  child: Icon(
                    icon,
                    color: color,
                    size: 64,
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              message,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildScanProgressIndicator() {
    // Show a circular progress with quality indicator
    Color progressColor;
    
    if (widget.scanQuality == ScanQuality.excellent) {
      progressColor = Colors.green;
    } else if (widget.scanQuality == ScanQuality.good) {
      progressColor = Colors.lightGreen;
    } else if (widget.scanQuality == ScanQuality.fair) {
      progressColor = Colors.orange;
    } else if (widget.scanQuality == ScanQuality.poor) {
      progressColor = Colors.deepOrange;
    } else {
      progressColor = Colors.grey;
    }
    
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: widget.qualityPercentage / 100,
                  strokeWidth: 8,
                  backgroundColor: Colors.grey.withOpacity(0.2),
                  valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                ),
                Text(
                  '${widget.qualityPercentage}%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.scanQuality.toString().split('.').last,
            style: TextStyle(
              color: progressColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildQualityZonesVisualization() {
    // Show which parts of the foot have been scanned well
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildZoneIndicator('Top', _isZoneScanned(FootZone.top)),
            _buildZoneIndicator('Bottom', _isZoneScanned(FootZone.bottom)),
            _buildZoneIndicator('Left', _isZoneScanned(FootZone.left)),
            _buildZoneIndicator('Right', _isZoneScanned(FootZone.right)),
            _buildZoneIndicator('Arch', _isZoneScanned(FootZone.insideArch)),
          ],
        ),
      ),
    );
  }
  
  Widget _buildZoneIndicator(String label, bool isScanned) {
    return Column(
      children: [
        Icon(
          isScanned ? Icons.check_circle : Icons.circle_outlined,
          color: isScanned ? Colors.green : Colors.grey,
          size: 24,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: isScanned ? Colors.green : Colors.grey,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
  
  bool _isZoneScanned(FootZone zone) {
    // In a real app, this would check which zones have been scanned
    // For demo, we'll return a simple check based on quality percentage
    final threshold = widget.qualityPercentage;
    
    switch (zone) {
      case FootZone.top:
        return threshold > 30;
      case FootZone.bottom:
        return threshold > 40;
      case FootZone.left:
        return threshold > 50;
      case FootZone.right:
        return threshold > 60;
      case FootZone.insideArch:
        return threshold > 70;
      case FootZone.outsideArch:
        return threshold > 80;
      case FootZone.none:
        return false;
    }
  }
}

enum FootZone {
  none,
  top,
  bottom,
  left,
  right,
  insideArch,
  outsideArch,
}

class FootOutlinePainter extends CustomPainter {
  final bool isLeftFoot;
  final FootZone highlightedZone;
  final double pulseFactor;
  
  FootOutlinePainter({
    required this.isLeftFoot,
    required this.highlightedZone,
    this.pulseFactor = 1.0,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final footHeight = size.height * 0.9;
    final footWidth = size.width * 0.5;
    
    // Flip the coordinates if it's a right foot
    if (!isLeftFoot) {
      canvas.scale(-1, 1);
      canvas.translate(-size.width, 0);
    }
    
    final Path outsidePath = _createFootOutline(size, footWidth, footHeight);
    final Paint outlinePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;
    
    // Draw the main outline
    canvas.drawPath(outsidePath, outlinePaint);
    
    // Draw highlighted zones if needed
    if (highlightedZone != FootZone.none) {
      final highlightPath = _createZonePath(highlightedZone, size, footWidth, footHeight);
      final highlightPaint = Paint()
        ..color = Colors.blue.withOpacity(0.3 * pulseFactor)
        ..style = PaintingStyle.fill;
      
      canvas.drawPath(highlightPath, highlightPaint);
      
      // Draw zone outline with pulsing effect
      final zonePaint = Paint()
        ..color = Colors.blue
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0 * pulseFactor;
      
      canvas.drawPath(highlightPath, zonePaint);
    }
    
    // Draw foot details (arch, etc.)
    _drawFootDetails(canvas, size, footWidth, footHeight);
  }
  
  Path _createFootOutline(Size size, double footWidth, double footHeight) {
    final path = Path();
    
    // Start from heel
    path.moveTo(size.width / 2 - footWidth / 2, size.height - footHeight * 0.1);
    
    // Outside edge of foot
    path.quadraticBezierTo(
      size.width / 2 - footWidth * 0.6, size.height - footHeight * 0.3, 
      size.width / 2 - footWidth * 0.5, size.height - footHeight * 0.5
    );
    
    path.quadraticBezierTo(
      size.width / 2 - footWidth * 0.45, size.height - footHeight * 0.7,
      size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.8
    );
    
    // Toe area
    path.quadraticBezierTo(
      size.width / 2 - footWidth * 0.1, size.height - footHeight * 0.95,
      size.width / 2, size.height - footHeight
    );
    
    path.quadraticBezierTo(
      size.width / 2 + footWidth * 0.1, size.height - footHeight * 0.95,
      size.width / 2 + footWidth * 0.3, size.height - footHeight * 0.8
    );
    
    // Inside edge of foot
    path.quadraticBezierTo(
      size.width / 2 + footWidth * 0.4, size.height - footHeight * 0.65,
      size.width / 2 + footWidth * 0.35, size.height - footHeight * 0.5
    );
    
    path.quadraticBezierTo(
      size.width / 2 + footWidth * 0.3, size.height - footHeight * 0.3,
      size.width / 2 + footWidth / 2, size.height - footHeight * 0.1
    );
    
    // Heel
    path.quadraticBezierTo(
      size.width / 2, size.height,
      size.width / 2 - footWidth / 2, size.height - footHeight * 0.1
    );
    
    return path;
  }
  
  void _drawFootDetails(Canvas canvas, Size size, double footWidth, double footHeight) {
    final Paint detailPaint = Paint()
      ..color = Colors.white.withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    
    // Draw arch
    final archPath = Path();
    archPath.moveTo(size.width / 2 + footWidth * 0.35, size.height - footHeight * 0.5);
    archPath.quadraticBezierTo(
      size.width / 2 + footWidth * 0.2, size.height - footHeight * 0.4,
      size.width / 2, size.height - footHeight * 0.5
    );
    archPath.quadraticBezierTo(
      size.width / 2 - footWidth * 0.2, size.height - footHeight * 0.6,
      size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.5
    );
    
    canvas.drawPath(archPath, detailPaint);
    
    // Draw toe lines
    for (int i = 1; i <= 5; i++) {
      final toeX = size.width / 2 - footWidth * 0.3 + (i * footWidth * 0.15);
      final toePath = Path();
      toePath.moveTo(toeX, size.height - footHeight * 0.8);
      toePath.lineTo(toeX, size.height - footHeight * (0.9 + i * 0.02));
      canvas.drawPath(toePath, detailPaint);
    }
  }
  
  Path _createZonePath(FootZone zone, Size size, double footWidth, double footHeight) {
    final path = Path();
    
    switch (zone) {
      case FootZone.top:
        // Top of foot (instep)
        path.moveTo(size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.7);
        path.quadraticBezierTo(
          size.width / 2, size.height - footHeight * 0.8,
          size.width / 2 + footWidth * 0.3, size.height - footHeight * 0.7
        );
        path.lineTo(size.width / 2 + footWidth * 0.2, size.height - footHeight * 0.5);
        path.quadraticBezierTo(
          size.width / 2, size.height - footHeight * 0.4,
          size.width / 2 - footWidth * 0.2, size.height - footHeight * 0.5
        );
        path.close();
        break;
        
      case FootZone.bottom:
        // Bottom of foot (sole)
        path.moveTo(size.width / 2 - footWidth * 0.4, size.height - footHeight * 0.2);
        path.lineTo(size.width / 2 - footWidth * 0.4, size.height - footHeight * 0.8);
        path.quadraticBezierTo(
          size.width / 2 - footWidth * 0.1, size.height - footHeight * 0.95,
          size.width / 2, size.height - footHeight
        );
        path.quadraticBezierTo(
          size.width / 2 + footWidth * 0.1, size.height - footHeight * 0.95,
          size.width / 2 + footWidth * 0.4, size.height - footHeight * 0.8
        );
        path.lineTo(size.width / 2 + footWidth * 0.4, size.height - footHeight * 0.2);
        path.quadraticBezierTo(
          size.width / 2, size.height - footHeight * 0.1,
          size.width / 2 - footWidth * 0.4, size.height - footHeight * 0.2
        );
        break;
        
      case FootZone.left:
        // Left side of foot (outer edge for left foot)
        path.moveTo(size.width / 2 - footWidth * 0.5, size.height - footHeight * 0.5);
        path.quadraticBezierTo(
          size.width / 2 - footWidth * 0.6, size.height - footHeight * 0.3,
          size.width / 2 - footWidth / 2, size.height - footHeight * 0.1
        );
        path.quadraticBezierTo(
          size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.2,
          size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.5
        );
        path.close();
        break;
        
      case FootZone.right:
        // Right side of foot (inner edge for left foot)
        path.moveTo(size.width / 2 + footWidth * 0.35, size.height - footHeight * 0.5);
        path.quadraticBezierTo(
          size.width / 2 + footWidth * 0.3, size.height - footHeight * 0.3,
          size.width / 2 + footWidth / 2, size.height - footHeight * 0.1
        );
        path.quadraticBezierTo(
          size.width / 2 + footWidth * 0.3, size.height - footHeight * 0.2,
          size.width / 2 + footWidth * 0.2, size.height - footHeight * 0.5
        );
        path.close();
        break;
        
      case FootZone.insideArch:
        // Inside arch
        path.moveTo(size.width / 2 + footWidth * 0.35, size.height - footHeight * 0.5);
        path.quadraticBezierTo(
          size.width / 2 + footWidth * 0.2, size.height - footHeight * 0.4,
          size.width / 2, size.height - footHeight * 0.5
        );
        path.quadraticBezierTo(
          size.width / 2 + footWidth * 0.1, size.height - footHeight * 0.55,
          size.width / 2 + footWidth * 0.2, size.height - footHeight * 0.6
        );
        path.close();
        break;
        
      case FootZone.outsideArch:
        // Outside arch
        path.moveTo(size.width / 2 - footWidth * 0.3, size.height - footHeight * 0.5);
        path.quadraticBezierTo(
          size.width / 2 - footWidth * 0.1, size.height - footHeight * 0.6,
          size.width / 2, size.height - footHeight * 0.5
        );
        path.quadraticBezierTo(
          size.width / 2 - footWidth * 0.1, size.height - footHeight * 0.4,
          size.width / 2 - footWidth * 0.2, size.height - footHeight * 0.45
        );
        path.close();
        break;
        
      case FootZone.none:
        // Empty path
        break;
    }
    
    return path;
  }
  
  @override
  bool shouldRepaint(covariant FootOutlinePainter oldDelegate) {
    return oldDelegate.isLeftFoot != isLeftFoot ||
           oldDelegate.highlightedZone != highlightedZone ||
           oldDelegate.pulseFactor != pulseFactor;
  }
}