import 'dart:math';
import 'package:flutter/material.dart';
import '../common/ar_interface.dart';
import 'package:vector_math/vector_math_64.dart' as vector;

enum VisualizationMode {
  wireframe,
  solid,
  transparent,
  xRay,
}

class FootVisualization extends StatefulWidget {
  final ScanQuality scanQuality;
  final bool isLeftFoot;
  final double size;
  final VisualizationMode mode;
  final List<String>? highlightedZones;
  final Map<String, dynamic>? measurements;
  
  const FootVisualization({
    Key? key,
    required this.scanQuality,
    required this.isLeftFoot,
    this.size = 300.0,
    this.mode = VisualizationMode.solid,
    this.highlightedZones,
    this.measurements,
  }) : super(key: key);

  @override
  State<FootVisualization> createState() => _FootVisualizationState();
}

class _FootVisualizationState extends State<FootVisualization> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _rotationAnimation;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();
    
    _rotationAnimation = Tween<double>(begin: 0, end: 2 * pi).animate(_controller);
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size * 2,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 3D foot visualization
          _build3DFootVisualization(),
          
          // Measurement labels if needed
          if (widget.measurements != null)
            _buildMeasurementLabels(),
        ],
      ),
    );
  }
  
  Widget _build3DFootVisualization() {
    return AnimatedBuilder(
      animation: _rotationAnimation,
      builder: (context, child) {
        return CustomPaint(
          painter: Foot3DPainter(
            isLeftFoot: widget.isLeftFoot,
            rotationY: _rotationAnimation.value,
            mode: widget.mode,
            scanQuality: widget.scanQuality,
            highlightedZones: widget.highlightedZones,
          ),
          size: Size(widget.size, widget.size * 2),
        );
      },
    );
  }
  
  Widget _buildMeasurementLabels() {
    final measurements = widget.measurements;
    if (measurements == null || measurements.isEmpty) return const SizedBox.shrink();
    
    return Stack(
      children: [
        // Length measurement
        if (measurements.containsKey('length'))
          Positioned(
            right: 0,
            top: widget.size,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Length',
                    style: TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  Text(
                    '${measurements['length']} cm',
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
        if (measurements.containsKey('width'))
          Positioned(
            left: 8,
            top: widget.size * 1.2,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Width',
                    style: TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  Text(
                    '${measurements['width']} cm',
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
        
        // Arch height
        if (measurements.containsKey('archHeight'))
          Positioned(
            left: 8,
            top: widget.size * 0.7,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Arch',
                    style: TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  Text(
                    '${measurements['archHeight']} cm',
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
}

class Foot3DPainter extends CustomPainter {
  final bool isLeftFoot;
  final double rotationY;
  final VisualizationMode mode;
  final ScanQuality scanQuality;
  final List<String>? highlightedZones;
  
  Foot3DPainter({
    required this.isLeftFoot,
    required this.rotationY,
    required this.mode,
    required this.scanQuality,
    this.highlightedZones,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    // Set up the 3D projection
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    
    canvas.save();
    canvas.translate(centerX, centerY);
    
    // Apply rotation
    final matrix = vector.Matrix4.identity()
      ..rotateY(rotationY);
    
    // Generate points for the 3D foot model
    final vertices = _generateFootVertices();
    final faces = _generateFootFaces(vertices.length);
    
    // Apply transformation to vertices
    final transformedVertices = vertices.map((v) {
      final transformed = matrix.transform3(v);
      return transformed;
    }).toList();
    
    // Sort faces by Z depth for correct rendering
    faces.sort((a, b) {
      final zIndexA = (transformedVertices[a[0]].z + 
                       transformedVertices[a[1]].z + 
                       transformedVertices[a[2]].z) / 3;
      final zIndexB = (transformedVertices[b[0]].z + 
                       transformedVertices[b[1]].z + 
                       transformedVertices[b[2]].z) / 3;
      return zIndexB.compareTo(zIndexA); // Back-to-front rendering
    });
    
    // Draw the foot model
    _drawFootModel(canvas, size, transformedVertices, faces);
    
    canvas.restore();
  }
  
  List<vector.Vector3> _generateFootVertices() {
    // Generate vertices for a simplified 3D foot model
    // In a real application, this would load from actual scan data
    final List<vector.Vector3> vertices = [];
    
    // Scale factors
    const double length = 100.0;
    const double width = 40.0;
    const double height = 30.0;
    
    // Generate vertices for the foot shape
    for (int i = 0; i < 10; i++) {
      final z = i / 9 * length - length / 2;
      
      // Width varies along the foot's length
      final widthFactor = i < 3 ? 0.6 + i * 0.1 : 
                         i < 6 ? 1.0 : 
                         1.0 - (i - 5) * 0.15;
      
      final currentWidth = width * widthFactor;
      
      // Add points around the perimeter at this cross-section
      for (int j = 0; j < 8; j++) {
        final angle = j / 8 * 2 * pi;
        final x = cos(angle) * currentWidth / 2;
        
        // Height also varies along the foot
        final heightFactor = i < 2 ? 0.5 + i * 0.1 : 
                            i < 5 ? 0.7 : 
                            0.7 - (i - 4) * 0.1;
        
        final y = (sin(angle) * height / 2 * heightFactor) - 
                 (angle > pi ? height * 0.3 : 0); // Flatten the bottom
        
        vertices.add(vector.Vector3(
          isLeftFoot ? x : -x,  // Flip for right foot
          y, 
          z
        ));
      }
    }
    
    // Add vertices for the toes
    final toeBaseZ = length / 2;
    for (int i = 0; i < 5; i++) {
      // Space the toes across the width
      final toeX = width * 0.4 * (i - 2) / 4;
      final toeBaseX = toeX * 0.8;
      
      // Toe length varies (middle toe is longest)
      final toeLength = 20.0 * (1.0 - (i == 2 ? 0.0 : i == 1 || i == 3 ? 0.2 : 0.4));
      
      // Add toe base
      vertices.add(vector.Vector3(
        isLeftFoot ? toeBaseX : -toeBaseX, 
        0, 
        toeBaseZ
      ));
      
      // Add toe tip
      vertices.add(vector.Vector3(
        isLeftFoot ? toeX : -toeX, 
        -2.0, 
        toeBaseZ + toeLength
      ));
    }
    
    // Add arch detail on the medial side
    for (int i = 3; i < 7; i++) {
      final z = i / 9 * length - length / 2;
      final archX = isLeftFoot ? -width * 0.35 : width * 0.35;
      final archHeight = height * 0.3 * sin((i - 3) / 4 * pi);
      
      vertices.add(vector.Vector3(
        archX,
        -archHeight,
        z
      ));
    }
    
    return vertices;
  }
  
  List<List<int>> _generateFootFaces(int vertexCount) {
    // Generate triangular faces for the foot model
    final List<List<int>> faces = [];
    
    // Create triangles for the foot sections
    final verticesPerSection = 8;
    final sections = 10;
    
    for (int i = 0; i < sections - 1; i++) {
      for (int j = 0; j < verticesPerSection; j++) {
        final currentSection = i * verticesPerSection;
        final nextSection = (i + 1) * verticesPerSection;
        final currentVertex = currentSection + j;
        final nextVertex = currentSection + (j + 1) % verticesPerSection;
        
        // Create two triangles to form a quad between sections
        faces.add([
          currentVertex, 
          nextVertex, 
          nextSection + j
        ]);
        
        faces.add([
          nextVertex, 
          nextSection + (j + 1) % verticesPerSection, 
          nextSection + j
        ]);
      }
    }
    
    // Create the toe connections
    final toeBaseOffset = sections * verticesPerSection;
    for (int i = 0; i < 5; i++) {
      final toeBaseIndex = toeBaseOffset + i * 2;
      final toeTipIndex = toeBaseIndex + 1;
      
      // Connect toes to the front of the foot
      final frontIndex = (sections - 1) * verticesPerSection;
      if (i > 0) {
        faces.add([
          toeBaseIndex - 2, 
          toeBaseIndex, 
          frontIndex + i
        ]);
      }
      
      // Create toe triangles
      if (i < 4) {
        faces.add([
          toeBaseIndex, 
          toeBaseIndex + 2, 
          toeTipIndex
        ]);
        
        faces.add([
          toeBaseIndex + 2, 
          toeTipIndex + 2, 
          toeTipIndex
        ]);
      }
    }
    
    // Add faces for the arch detail
    final archOffset = toeBaseOffset + 10; // After all toe vertices
    for (int i = 0; i < 3; i++) {
      faces.add([
        3 * verticesPerSection + (isLeftFoot ? 6 : 2), // A point on the foot side
        archOffset + i,
        archOffset + i + 1
      ]);
      
      faces.add([
        4 * verticesPerSection + (isLeftFoot ? 6 : 2), // A point on the foot side
        3 * verticesPerSection + (isLeftFoot ? 6 : 2),
        archOffset + i + 1
      ]);
    }
    
    return faces;
  }
  
  void _drawFootModel(Canvas canvas, Size size, List<vector.Vector3> vertices, List<List<int>> faces) {
    // Set up paint styles based on mode
    Paint fillPaint = Paint();
    Paint strokePaint = Paint()
      ..color = Colors.white.withOpacity(0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    
    switch (mode) {
      case VisualizationMode.wireframe:
        // Only draw edges
        for (final face in faces) {
          final path = Path();
          
          path.moveTo(vertices[face[0]].x, vertices[face[0]].y);
          path.lineTo(vertices[face[1]].x, vertices[face[1]].y);
          path.lineTo(vertices[face[2]].x, vertices[face[2]].y);
          path.close();
          
          canvas.drawPath(path, strokePaint);
        }
        break;
        
      case VisualizationMode.transparent:
        // Draw semi-transparent model
        fillPaint.color = Colors.blue.withOpacity(0.2);
        for (final face in faces) {
          final path = Path();
          
          path.moveTo(vertices[face[0]].x, vertices[face[0]].y);
          path.lineTo(vertices[face[1]].x, vertices[face[1]].y);
          path.lineTo(vertices[face[2]].x, vertices[face[2]].y);
          path.close();
          
          canvas.drawPath(path, fillPaint);
          canvas.drawPath(path, strokePaint);
        }
        break;
        
      case VisualizationMode.xRay:
        // X-ray effect with inner structure
        fillPaint.color = Colors.green.withOpacity(0.15);
        for (final face in faces) {
          final path = Path();
          
          path.moveTo(vertices[face[0]].x, vertices[face[0]].y);
          path.lineTo(vertices[face[1]].x, vertices[face[1]].y);
          path.lineTo(vertices[face[2]].x, vertices[face[2]].y);
          path.close();
          
          // Calculate lighting based on face normal
          final v1 = vertices[face[0]];
          final v2 = vertices[face[1]];
          final v3 = vertices[face[2]];
          
          final edge1 = v2 - v1;
          final edge2 = v3 - v1;
          final normal = edge1.cross(edge2)..normalize();
          
          // Simple lighting calculation
          const lightDir = vector.Vector3(0.0, 0.0, 1.0);
          final lightIntensity = max(0.2, normal.dot(lightDir));
          
          fillPaint.color = Colors.green.withOpacity(0.15 * lightIntensity);
          strokePaint.color = Colors.green.withOpacity(0.5 * lightIntensity);
          
          canvas.drawPath(path, fillPaint);
          canvas.drawPath(path, strokePaint);
        }
        break;
        
      case VisualizationMode.solid:
      default:
        // Fully rendered model with lighting
        for (final face in faces) {
          final path = Path();
          
          path.moveTo(vertices[face[0]].x, vertices[face[0]].y);
          path.lineTo(vertices[face[1]].x, vertices[face[1]].y);
          path.lineTo(vertices[face[2]].x, vertices[face[2]].y);
          path.close();
          
          // Calculate lighting based on face normal
          final v1 = vertices[face[0]];
          final v2 = vertices[face[1]];
          final v3 = vertices[face[2]];
          
          final edge1 = v2 - v1;
          final edge2 = v3 - v1;
          final normal = edge1.cross(edge2)..normalize();
          
          // Simple lighting calculation
          const lightDir = vector.Vector3(0.0, 0.0, 1.0);
          final lightIntensity = max(0.3, normal.dot(lightDir));
          
          // Color based on scan quality
          Color baseColor;
          switch (scanQuality) {
            case ScanQuality.excellent:
              baseColor = Colors.green;
              break;
            case ScanQuality.good:
              baseColor = Colors.lightGreen;
              break;
            case ScanQuality.fair:
              baseColor = Colors.amber;
              break;
            case ScanQuality.poor:
              baseColor = Colors.orange;
              break;
            default:
              baseColor = Colors.blue;
          }
          
          // Apply lighting
          fillPaint.color = baseColor.withOpacity(0.8 * lightIntensity);
          
          canvas.drawPath(path, fillPaint);
          
          // Add highlights
          _addHighlightsToFace(canvas, path, face, vertices);
        }
    }
  }
  
  void _addHighlightsToFace(Canvas canvas, Path path, List<int> face, List<vector.Vector3> vertices) {
    if (highlightedZones == null || highlightedZones!.isEmpty) return;
    
    // Determine which zone this face belongs to based on its position
    final centerZ = (vertices[face[0]].z + vertices[face[1]].z + vertices[face[2]].z) / 3;
    final centerX = (vertices[face[0]].x + vertices[face[1]].x + vertices[face[2]].x) / 3;
    final centerY = (vertices[face[0]].y + vertices[face[1]].y + vertices[face[2]].y) / 3;
    
    String? matchingZone;
    
    // Check if this face belongs to any highlighted zone
    if (centerZ > 70 && highlightedZones!.contains('toes')) {
      matchingZone = 'toes';
    } else if (centerZ < -70 && highlightedZones!.contains('heel')) {
      matchingZone = 'heel';
    } else if (centerY < -10 && highlightedZones!.contains('sole')) {
      matchingZone = 'sole';
    } else if (centerY > 5 && highlightedZones!.contains('instep')) {
      matchingZone = 'instep';
    } else if (isLeftFoot ? (centerX < -25) : (centerX > 25) && highlightedZones!.contains('arch')) {
      matchingZone = 'arch';
    } else if (isLeftFoot ? (centerX > 25) : (centerX < -25) && highlightedZones!.contains('outside')) {
      matchingZone = 'outside';
    } else if (centerZ > 0 && centerZ < 70 && 
               centerY < 5 && centerY > -5 && 
               highlightedZones!.contains('metatarsals')) {
      matchingZone = 'metatarsals';
    }
    
    // Apply highlight if this face belongs to a highlighted zone
    if (matchingZone != null) {
      final highlightPaint = Paint()
        ..color = Colors.yellow.withOpacity(0.5)
        ..style = PaintingStyle.fill;
      
      canvas.drawPath(path, highlightPaint);
      
      final outlinePaint = Paint()
        ..color = Colors.yellow
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.0;
      
      canvas.drawPath(path, outlinePaint);
    }
  }
  
  @override
  bool shouldRepaint(covariant Foot3DPainter oldDelegate) {
    return oldDelegate.isLeftFoot != isLeftFoot ||
           oldDelegate.rotationY != rotationY ||
           oldDelegate.mode != mode ||
           oldDelegate.scanQuality != scanQuality ||
           oldDelegate.highlightedZones != highlightedZones;
  }
}