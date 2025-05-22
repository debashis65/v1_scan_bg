/// Represents the user's pose alignment data for use in providing
/// accurate guidance during the foot scanning process
class PoseAlignment {
  /// How well the user is aligned front-to-back (0.0 to 1.0)
  final double anteriorAlignment;
  
  /// How well the user is centered side-to-side (0.0 to 1.0)
  final double lateralAlignment;
  
  /// How well the user's height/distance is aligned (0.0 to 1.0)
  final double verticalAlignment;
  
  /// Overall alignment score (0.0 to 1.0)
  final double overallAlignment;
  
  /// User-friendly guidance message based on alignment issues
  final String guidanceMessage;
  
  PoseAlignment({
    required this.anteriorAlignment,
    required this.lateralAlignment,
    required this.verticalAlignment,
    required this.overallAlignment,
    required this.guidanceMessage,
  });
  
  /// Returns true if the alignment is good enough for capture
  bool get isAlignmentGoodForCapture => overallAlignment >= 0.8;
  
  /// Returns an alignment quality level for UI indicators
  AlignmentQuality get alignmentQuality {
    if (overallAlignment >= 0.8) return AlignmentQuality.good;
    if (overallAlignment >= 0.6) return AlignmentQuality.fair;
    return AlignmentQuality.poor;
  }
}

/// Classification of alignment quality for UI feedback
enum AlignmentQuality {
  poor,   // Red indicators
  fair,   // Yellow indicators
  good,   // Green indicators
}