import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../common/ar_interface.dart';

class GuidanceAnimator extends StatefulWidget {
  final FeedbackType feedbackType;
  final VoidCallback? onComplete;
  final double size;
  
  const GuidanceAnimator({
    Key? key,
    required this.feedbackType,
    this.onComplete,
    this.size = 120.0,
  }) : super(key: key);

  @override
  State<GuidanceAnimator> createState() => _GuidanceAnimatorState();
}

class _GuidanceAnimatorState extends State<GuidanceAnimator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _rotateAnimation;
  late Animation<double> _pulseAnimation;
  late Animation<double> _moveAnimation;
  
  @override
  void initState() {
    super.initState();
    
    // Create animation controller with appropriate duration based on animation type
    _controller = AnimationController(
      vsync: this,
      duration: _getAnimationDuration(),
    );
    
    // Create the appropriate animations based on feedback type
    _setupAnimations();
    
    // Start animation
    if (_isLoopedAnimation()) {
      _controller.repeat(reverse: _shouldReverseAnimation());
    } else {
      _controller.forward().then((_) {
        if (widget.onComplete != null) {
          widget.onComplete!();
        }
      });
    }
  }
  
  @override
  void didUpdateWidget(GuidanceAnimator oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // If feedback type changes, reset animations
    if (oldWidget.feedbackType != widget.feedbackType) {
      _controller.duration = _getAnimationDuration();
      _setupAnimations();
      
      _controller.reset();
      if (_isLoopedAnimation()) {
        _controller.repeat(reverse: _shouldReverseAnimation());
      } else {
        _controller.forward();
      }
    }
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
  
  Duration _getAnimationDuration() {
    // Adjust animation duration based on feedback type
    switch (widget.feedbackType) {
      case FeedbackType.moveAround:
      case FeedbackType.needMoreAngles:
        return const Duration(seconds: 3); // Slow rotation
      
      case FeedbackType.tooFast:
        return const Duration(milliseconds: 1500); // Show "slow down" at medium speed
      
      case FeedbackType.holdSteady:
        return const Duration(milliseconds: 500); // Quick pulse for "hold steady"
      
      case FeedbackType.scanComplete:
        return const Duration(seconds: 1); // Celebratory animation
        
      default:
        return const Duration(seconds: 2); // Default duration
    }
  }
  
  bool _isLoopedAnimation() {
    // Determine if animation should loop
    switch (widget.feedbackType) {
      case FeedbackType.scanComplete:
      case FeedbackType.goodDistance:
        return false; // These animations play once
      default:
        return true; // Most animations loop
    }
  }
  
  bool _shouldReverseAnimation() {
    // Determine if animation should reverse when looping
    switch (widget.feedbackType) {
      case FeedbackType.moveAround:
      case FeedbackType.needMoreAngles:
        return false; // Continuous rotation
      
      case FeedbackType.tooFast:
      case FeedbackType.holdSteady:
      case FeedbackType.tooClose:
      case FeedbackType.tooFar:
        return true; // Pulse animations should reverse
        
      default:
        return true;
    }
  }
  
  void _setupAnimations() {
    // Setup appropriate animations based on feedback type
    _rotateAnimation = Tween<double>(
      begin: 0.0,
      end: 2 * pi,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    
    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    
    _moveAnimation = Tween<double>(
      begin: -20.0,
      end: 20.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }
  
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return _buildAnimatedContent();
      },
    );
  }
  
  Widget _buildAnimatedContent() {
    switch (widget.feedbackType) {
      case FeedbackType.moveAround:
      case FeedbackType.needMoreAngles:
        return _buildRotationAnimation();
        
      case FeedbackType.tooClose:
        return _buildZoomAnimation(isZoomingOut: true);
        
      case FeedbackType.tooFar:
        return _buildZoomAnimation(isZoomingOut: false);
        
      case FeedbackType.tooFast:
        return _buildSlowDownAnimation();
        
      case FeedbackType.holdSteady:
        return _buildHoldSteadyAnimation();
        
      case FeedbackType.scanComplete:
        return _buildCompletionAnimation();
        
      case FeedbackType.lowLight:
        return _buildLowLightAnimation();
        
      case FeedbackType.scanningLeft:
      case FeedbackType.scanningRight:
      case FeedbackType.scanningTop:
      case FeedbackType.scanningBottom:
      case FeedbackType.scanningInsideArch:
      case FeedbackType.scanningOutsideArch:
        return _buildDirectionalAnimation();
        
      default:
        return _buildDefaultAnimation();
    }
  }
  
  Widget _buildRotationAnimation() {
    return Transform.rotate(
      angle: _rotateAnimation.value,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: Colors.blue.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.rotate_90_degrees_ccw,
          color: Colors.blue,
          size: 48,
        ),
      ),
    );
  }
  
  Widget _buildZoomAnimation({required bool isZoomingOut}) {
    final IconData icon = isZoomingOut ? Icons.zoom_out : Icons.zoom_in;
    final Color color = Colors.orange;
    
    return Transform.scale(
      scale: _pulseAnimation.value,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: color,
          size: 48,
        ),
      ),
    );
  }
  
  Widget _buildSlowDownAnimation() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.slow_motion_video,
          color: Colors.orange,
          size: 48,
        ),
        const SizedBox(height: 8),
        Transform.translate(
          offset: Offset(_moveAnimation.value * 0.5, 0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.arrow_back,
                color: Colors.orange.withOpacity(_controller.value),
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'SLOW DOWN',
                style: TextStyle(
                  color: Colors.orange,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward,
                color: Colors.orange.withOpacity(1 - _controller.value),
                size: 24,
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildHoldSteadyAnimation() {
    return Transform.scale(
      scale: _pulseAnimation.value,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.pan_tool,
              color: Colors.orange,
              size: 48,
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.orange.withOpacity(0.5),
                    width: 2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildCompletionAnimation() {
    return Transform.scale(
      scale: _pulseAnimation.value,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: Colors.green.withOpacity(0.2),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.check_circle,
          color: Colors.green,
          size: 64,
        ),
      ),
    );
  }
  
  Widget _buildLowLightAnimation() {
    return Stack(
      alignment: Alignment.center,
      children: [
        Transform.scale(
          scale: _pulseAnimation.value,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
          ),
        ),
        const Icon(
          Icons.wb_sunny,
          color: Colors.amber,
          size: 48,
        ),
        Transform.scale(
          scale: 2 - _pulseAnimation.value, // Counter animation
          child: Container(
            width: widget.size * 0.7,
            height: widget.size * 0.7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.amber.withOpacity(0.3),
                width: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildDirectionalAnimation() {
    IconData icon;
    String label;
    
    switch (widget.feedbackType) {
      case FeedbackType.scanningLeft:
        icon = Icons.keyboard_arrow_left;
        label = 'LEFT SIDE';
        break;
      case FeedbackType.scanningRight:
        icon = Icons.keyboard_arrow_right;
        label = 'RIGHT SIDE';
        break;
      case FeedbackType.scanningTop:
        icon = Icons.keyboard_arrow_up;
        label = 'TOP SIDE';
        break;
      case FeedbackType.scanningBottom:
        icon = Icons.keyboard_arrow_down;
        label = 'BOTTOM';
        break;
      case FeedbackType.scanningInsideArch:
        icon = Icons.arrow_outward;
        label = 'INSIDE ARCH';
        break;
      case FeedbackType.scanningOutsideArch:
        icon = Icons.arrow_outward;
        label = 'OUTSIDE ARCH';
        break;
      default:
        icon = Icons.help_outline;
        label = 'SCAN';
        break;
    }
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Transform.translate(
          offset: Offset(
            _getDirectionOffsetX(widget.feedbackType) * _moveAnimation.value,
            _getDirectionOffsetY(widget.feedbackType) * _moveAnimation.value,
          ),
          child: Icon(
            icon,
            color: Colors.blue,
            size: 64,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.blue,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
  
  double _getDirectionOffsetX(FeedbackType type) {
    switch (type) {
      case FeedbackType.scanningLeft:
        return -1.0;
      case FeedbackType.scanningRight:
        return 1.0;
      case FeedbackType.scanningInsideArch:
        return 0.5;
      case FeedbackType.scanningOutsideArch:
        return -0.5;
      default:
        return 0.0;
    }
  }
  
  double _getDirectionOffsetY(FeedbackType type) {
    switch (type) {
      case FeedbackType.scanningTop:
        return -1.0;
      case FeedbackType.scanningBottom:
        return 1.0;
      default:
        return 0.0;
    }
  }
  
  Widget _buildDefaultAnimation() {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.2),
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.help_outline,
        color: Colors.blue,
        size: 48,
      ),
    );
  }
}