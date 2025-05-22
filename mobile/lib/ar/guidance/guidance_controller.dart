import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lottie/lottie.dart';

/// Feedback types provided by the AR system
enum FeedbackType {
  /// Lighting conditions are insufficient
  lowLight,
  
  /// User is moving too quickly
  tooFast,
  
  /// Device has lost tracking
  lostTracking,
  
  /// Need to move to capture more angles
  needMoreAngles,
  
  /// Foot is not fully in frame
  footOutOfFrame,
  
  /// Good scanning progress
  goodProgress,
  
  /// Scan is complete
  scanComplete,
  
  /// Generic feedback
  generic,
  
  /// Phone is moving (should remain stationary)
  phoneMoving,
  
  /// User should hold steady
  holdSteady,
  
  /// User is too close to camera
  tooClose,
  
  /// User is too far from camera
  tooFar,
  
  /// Quality indicators
  goodQuality,
  poorQuality,
  
  /// Position guidance states
  moveToPosition1,
  moveToPosition2,
  moveToPosition3,
  moveToPosition4,
  moveToPosition5,
  
  /// Foot zone scanning states
  scanningTop,
  scanningBottom,
  scanningLeft,
  scanningRight,
  scanningInsideArch,
  scanningOutsideArch
}

/// Scan status states
enum ScanStatus {
  /// Scan has not been started yet
  notStarted,
  
  /// AR is initialized and ready to scan
  ready,
  
  /// Actively scanning
  scanning,
  
  /// Scan is paused
  paused,
  
  /// Scan is completed
  completed
}

/// Scan quality indicators
enum ScanQuality {
  /// Not enough data for a useful scan
  insufficient,
  
  /// Minimal viable scan quality
  poor,
  
  /// Average scan quality
  average,
  
  /// Good scan quality
  good,
  
  /// Excellent scan quality
  excellent
}

/// A widget that provides real-time AR scanning guidance
class GuidanceController extends StatefulWidget {
  /// Current scan status
  final ScanStatus scanStatus;
  
  /// Stream of feedback from the AR system
  final Stream<FeedbackType> feedbackStream;
  
  /// Current scan quality percentage (0-100)
  final int qualityPercentage;
  
  /// Current scan quality level
  final ScanQuality scanQuality;
  
  /// Whether scanning the left foot (true) or right foot (false)
  final bool isLeftFoot;
  
  const GuidanceController({
    Key? key,
    required this.scanStatus,
    required this.feedbackStream,
    required this.qualityPercentage,
    required this.scanQuality,
    required this.isLeftFoot,
  }) : super(key: key);

  @override
  State<GuidanceController> createState() => _GuidanceControllerState();
}

class _GuidanceControllerState extends State<GuidanceController> with SingleTickerProviderStateMixin {
  StreamSubscription<FeedbackType>? _feedbackSubscription;
  FeedbackType? _currentFeedback;
  late AnimationController _pulseAnimController;
  
  @override
  void initState() {
    super.initState();
    _pulseAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _feedbackSubscription = widget.feedbackStream.listen((feedback) {
      setState(() {
        _currentFeedback = feedback;
      });
    });
  }
  
  @override
  void dispose() {
    _feedbackSubscription?.cancel();
    _pulseAnimController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Only show foot outline guide when in ready or scanning state
        if (widget.scanStatus == ScanStatus.ready || widget.scanStatus == ScanStatus.scanning)
          _buildFootGuideOverlay(),
        
        // Feedback message panel
        if (_currentFeedback != null && widget.scanStatus == ScanStatus.scanning)
          _buildFeedbackMessage(),
        
        // Quality indicator
        if (widget.scanStatus == ScanStatus.scanning)
          _buildQualityIndicator(),
      ],
    );
  }
  
  Widget _buildFootGuideOverlay() {
    return Center(
      child: AnimatedOpacity(
        opacity: widget.scanStatus == ScanStatus.ready ? 0.8 : 0.3,
        duration: const Duration(milliseconds: 300),
        child: Container(
          width: MediaQuery.of(context).size.width * 0.7,
          height: MediaQuery.of(context).size.height * 0.5,
          decoration: BoxDecoration(
            border: Border.all(
              color: Colors.white,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Foot outline SVG
              Transform.scale(
                scale: 0.9,
                child: Transform.flip(
                  flipX: widget.isLeftFoot,
                  child: SvgPicture.asset(
                    'assets/foot_outline.svg',
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ),
              
              // Pulsing animation
              FadeTransition(
                opacity: Tween<double>(begin: 0.2, end: 0.7).animate(_pulseAnimController),
                child: Container(
                  width: double.infinity,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Theme.of(context).primaryColor,
                      width: 3,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildFeedbackMessage() {
    Color backgroundColor;
    Color textColor = Colors.white;
    IconData icon;
    String message;
    
    switch (_currentFeedback!) {
      case FeedbackType.lowLight:
        backgroundColor = Colors.orange;
        icon = Icons.light_mode;
        message = 'Need more light in the room';
        break;
      case FeedbackType.tooFast:
        backgroundColor = Colors.orange;
        icon = Icons.accessibility_new;
        message = 'Move more slowly';
        break;
      case FeedbackType.lostTracking:
        backgroundColor = Colors.red;
        icon = Icons.gps_off;
        message = 'Lost tracking - make sure phone is on textured surface';
        break;
      case FeedbackType.needMoreAngles:
        backgroundColor = Colors.blue;
        icon = Icons.rotate_90_degrees_ccw;
        message = 'Move to a different position';
        break;
      case FeedbackType.footOutOfFrame:
        backgroundColor = Colors.orange;
        icon = Icons.crop_free;
        message = 'Position your foot in frame';
        break;
      case FeedbackType.goodProgress:
        backgroundColor = Colors.green;
        icon = Icons.thumb_up;
        message = 'Good progress!';
        break;
      case FeedbackType.scanComplete:
        backgroundColor = Colors.green;
        icon = Icons.check_circle;
        message = 'Scan complete!';
        break;
      case FeedbackType.phoneMoving:
        backgroundColor = Colors.red;
        icon = Icons.vibration;
        message = 'Phone moving! Keep it stable on surface';
        break;
      case FeedbackType.holdSteady:
        backgroundColor = Colors.orange;
        icon = Icons.accessibility;
        message = 'Hold steady while we capture';
        break;
      case FeedbackType.tooClose:
        backgroundColor = Colors.orange;
        icon = Icons.person;
        message = 'Step back from the phone';
        break;
      case FeedbackType.tooFar:
        backgroundColor = Colors.orange;
        icon = Icons.person;
        message = 'Step closer to the phone';
        break;
      case FeedbackType.goodQuality:
        backgroundColor = Colors.green;
        icon = Icons.thumb_up;
        message = 'Good quality capture!';
        break;
      case FeedbackType.poorQuality:
        backgroundColor = Colors.red;
        icon = Icons.thumb_down;
        message = 'Quality is low - ensure foot is clearly visible';
        break;
      case FeedbackType.moveToPosition1:
        backgroundColor = Colors.blue;
        icon = Icons.arrow_forward;
        message = 'Stand directly in front of foot';
        break;
      case FeedbackType.moveToPosition2:
        backgroundColor = Colors.blue;
        icon = Icons.arrow_forward;
        message = 'Move to the left side of foot';
        break;
      case FeedbackType.moveToPosition3:
        backgroundColor = Colors.blue;
        icon = Icons.arrow_forward;
        message = 'Move to the right side of foot';
        break;
      case FeedbackType.moveToPosition4:
        backgroundColor = Colors.blue;
        icon = Icons.arrow_forward;
        message = 'Move behind the foot';
        break;
      case FeedbackType.moveToPosition5:
        backgroundColor = Colors.blue;
        icon = Icons.arrow_downward;
        message = 'Position above the foot';
        break;
      default:
        backgroundColor = Colors.blue;
        icon = Icons.info;
        message = 'Move around your foot';
    }
    
    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: backgroundColor.withOpacity(0.9),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: textColor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildQualityIndicator() {
    final Color qualityColor = _getQualityColor();
    
    return Positioned(
      bottom: 100,
      left: 16,
      right: 16,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Scan Quality: ',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  shadows: [
                    Shadow(
                      color: Colors.black,
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
              Text(
                _getQualityText(),
                style: TextStyle(
                  color: qualityColor,
                  fontWeight: FontWeight.bold,
                  shadows: const [
                    Shadow(
                      color: Colors.black,
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              height: 10,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Stack(
                children: [
                  FractionallySizedBox(
                    widthFactor: widget.qualityPercentage / 100,
                    child: Container(
                      decoration: BoxDecoration(
                        color: qualityColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
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
  
  String _getQualityText() {
    switch (widget.scanQuality) {
      case ScanQuality.insufficient:
        return 'Insufficient';
      case ScanQuality.poor:
        return 'Poor';
      case ScanQuality.average:
        return 'Average';
      case ScanQuality.good:
        return 'Good';
      case ScanQuality.excellent:
        return 'Excellent';
    }
  }
  
  Color _getQualityColor() {
    switch (widget.scanQuality) {
      case ScanQuality.insufficient:
        return Colors.red;
      case ScanQuality.poor:
        return Colors.orange;
      case ScanQuality.average:
        return Colors.yellow;
      case ScanQuality.good:
        return Colors.lightGreen;
      case ScanQuality.excellent:
        return Colors.green;
    }
  }
}