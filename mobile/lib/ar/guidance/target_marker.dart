import 'dart:math';
import 'package:flutter/material.dart';

enum TargetStatus {
  waiting,
  positioning,
  good,
  excellent,
}

class TargetMarker extends StatefulWidget {
  final TargetStatus status;
  final double size;
  final double footLength;
  final double footWidth;
  final bool isLeftFoot;
  final bool showMeasurements;
  
  const TargetMarker({
    Key? key,
    this.status = TargetStatus.waiting,
    this.size = 200.0,
    this.footLength = 26.0,
    this.footWidth = 10.0,
    this.isLeftFoot = true,
    this.showMeasurements = false,
  }) : super(key: key);

  @override
  State<TargetMarker> createState() => _TargetMarkerState();
}

class _TargetMarkerState extends State<TargetMarker> with SingleTickerProviderStateMixin {
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
    
    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    
    _rotateAnimation = Tween<double>(begin: -0.05, end: 0.05).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return _buildMarker();
      },
    );
  }
  
  Widget _buildMarker() {
    // Different marker appearances based on status
    switch (widget.status) {
      case TargetStatus.waiting:
        return _buildWaitingMarker();
      case TargetStatus.positioning:
        return _buildPositioningMarker();
      case TargetStatus.good:
        return _buildGoodMarker();
      case TargetStatus.excellent:
        return _buildExcellentMarker();
    }
  }
  
  Widget _buildWaitingMarker() {
    return SizedBox(
      width: widget.size,
      height: widget.size * 2,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Pulsing circle
          Transform.scale(
            scale: _pulseAnimation.value,
            child: Container(
              width: widget.size * 0.8,
              height: widget.size * 0.8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.6),
                  width: 2,
                ),
                color: Colors.white.withOpacity(0.1),
              ),
            ),
          ),
          
          // Center icon
          Icon(
            Icons.arrow_downward,
            color: Colors.white,
            size: widget.size * 0.3,
          ),
          
          // Text instructions
          Positioned(
            bottom: widget.size * 0.2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Place foot here',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildPositioningMarker() {
    return Transform.rotate(
      angle: _rotateAnimation.value,
      child: SizedBox(
        width: widget.size,
        height: widget.size * 2,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Foot outline
            CustomPaint(
              size: Size(widget.size, widget.size * 2),
              painter: FootShapePainter(
                isLeftFoot: widget.isLeftFoot,
                outlineColor: Colors.blue,
                fillColor: Colors.blue.withOpacity(0.2),
              ),
            ),
            
            // Measurement indicators if enabled
            if (widget.showMeasurements)
              _buildMeasurementIndicators(),
            
            // Positioning guides
            ..._buildPositioningGuides(),
          ],
        ),
      ),
    );
  }
  
  Widget _buildGoodMarker() {
    return SizedBox(
      width: widget.size,
      height: widget.size * 2,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Foot outline with good status
          CustomPaint(
            size: Size(widget.size, widget.size * 2),
            painter: FootShapePainter(
              isLeftFoot: widget.isLeftFoot,
              outlineColor: Colors.green,
              fillColor: Colors.green.withOpacity(0.2),
            ),
          ),
          
          // Measurement indicators if enabled
          if (widget.showMeasurements)
            _buildMeasurementIndicators(),
          
          // Success indicator
          Positioned(
            top: widget.size * 0.3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(
                    Icons.check_circle,
                    color: Colors.white,
                    size: 20,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Good Position',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildExcellentMarker() {
    return SizedBox(
      width: widget.size,
      height: widget.size * 2,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Base foot shape
          CustomPaint(
            size: Size(widget.size, widget.size * 2),
            painter: FootShapePainter(
              isLeftFoot: widget.isLeftFoot,
              outlineColor: Colors.green,
              fillColor: Colors.green.withOpacity(0.3),
              showDetails: true,
            ),
          ),
          
          // Animated success ring
          Transform.scale(
            scale: _pulseAnimation.value,
            child: Container(
              width: widget.size * 0.9,
              height: widget.size * 1.8,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(widget.size * 0.5),
                border: Border.all(
                  color: Colors.green.withOpacity(0.5),
                  width: 3,
                ),
              ),
            ),
          ),
          
          // Measurement indicators if enabled
          if (widget.showMeasurements)
            _buildMeasurementIndicators(),
          
          // Success label
          Positioned(
            top: widget.size * 0.3,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(
                    Icons.stars,
                    color: Colors.white,
                    size: 20,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Perfect!',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMeasurementIndicators() {
    return Stack(
      children: [
        // Length measurement
        Positioned(
          right: 0,
          top: widget.size * 0.5,
          bottom: widget.size * 0.5,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.height,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.footLength} cm',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Width measurement
        Positioned(
          left: widget.size * 0.3,
          top: widget.size * 0.8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.width_normal,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 4),
                Text(
                  '${widget.footWidth} cm',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  List<Widget> _buildPositioningGuides() {
    return [
      // Heel position guide
      Positioned(
        bottom: widget.size * 0.4,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.6),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.arrow_upward,
            color: Colors.white,
            size: 20,
          ),
        ),
      ),
      
      // Toe position guide
      Positioned(
        top: widget.size * 0.4,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.6),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.arrow_downward,
            color: Colors.white,
            size: 20,
          ),
        ),
      ),
      
      // Alignment instruction
      Positioned(
        bottom: widget.size * 0.2,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.6),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Text(
            'Align foot with outline',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    ];
  }
}

class FootShapePainter extends CustomPainter {
  final bool isLeftFoot;
  final Color outlineColor;
  final Color fillColor;
  final bool showDetails;
  
  FootShapePainter({
    required this.isLeftFoot,
    this.outlineColor = Colors.white,
    this.fillColor = Colors.transparent,
    this.showDetails = false,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final footHeight = size.height * 0.8;
    final footWidth = size.width * 0.6;
    
    // Flip the coordinates if it's a right foot
    if (!isLeftFoot) {
      canvas.scale(-1, 1);
      canvas.translate(-size.width, 0);
    }
    
    // Create the foot outline path
    final Path footPath = _createFootOutline(size, footWidth, footHeight);
    
    // Fill the foot shape
    final Paint fillPaint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;
    
    canvas.drawPath(footPath, fillPaint);
    
    // Draw the outline
    final Paint outlinePaint = Paint()
      ..color = outlineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    
    canvas.drawPath(footPath, outlinePaint);
    
    // Draw additional details if requested
    if (showDetails) {
      _drawFootDetails(canvas, size, footWidth, footHeight);
    }
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
      ..color = outlineColor.withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    
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
    
    // Draw ball of foot
    canvas.drawCircle(
      Offset(size.width / 2, size.height - footHeight * 0.75),
      footWidth * 0.1,
      Paint()
        ..color = outlineColor.withOpacity(0.2)
        ..style = PaintingStyle.fill
    );
    
    // Draw center line
    final centerPath = Path();
    centerPath.moveTo(size.width / 2, size.height - footHeight * 0.1);
    centerPath.lineTo(size.width / 2, size.height - footHeight);
    canvas.drawPath(centerPath, detailPaint);
  }
  
  @override
  bool shouldRepaint(covariant FootShapePainter oldDelegate) {
    return oldDelegate.isLeftFoot != isLeftFoot ||
           oldDelegate.outlineColor != outlineColor ||
           oldDelegate.fillColor != fillColor ||
           oldDelegate.showDetails != showDetails;
  }
}