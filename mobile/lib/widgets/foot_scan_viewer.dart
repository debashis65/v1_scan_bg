import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';
import 'package:barogrip/services/scan_service.dart';

/// A widget for viewing 3D foot scans
class FootScanViewer extends StatefulWidget {
  /// ID of the scan to display
  final int scanId;
  
  /// Whether to auto-rotate the model
  final bool autoRotate;
  
  /// Initial camera controls
  final bool enableControls;
  
  /// Display the model in wireframe mode
  final bool wireframe;
  
  /// Height of the viewer widget
  final double height;
  
  const FootScanViewer({
    Key? key,
    required this.scanId,
    this.autoRotate = true,
    this.enableControls = true,
    this.wireframe = false,
    this.height = 300,
  }) : super(key: key);

  @override
  State<FootScanViewer> createState() => _FootScanViewerState();
}

class _FootScanViewerState extends State<FootScanViewer> {
  final ScanService _scanService = ScanService();
  
  bool _isLoading = true;
  String? _errorMessage;
  String? _modelUrl;
  
  @override
  void initState() {
    super.initState();
    _loadModelUrl();
  }
  
  Future<void> _loadModelUrl() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final modelUrls = await _scanService.getScan3DModelUrls(widget.scanId);
      
      setState(() {
        // Prefer OBJ format for better compatibility
        _modelUrl = modelUrls['obj'] ?? modelUrls['stl'];
        _isLoading = false;
      });
      
      if (_modelUrl == null) {
        setState(() {
          _errorMessage = 'No 3D model available for this scan';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load 3D model: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
  
  Widget _buildLoadingIndicator() {
    return SizedBox(
      height: widget.height,
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading 3D model...'),
          ],
        ),
      ),
    );
  }
  
  Widget _buildErrorView() {
    return SizedBox(
      height: widget.height,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'Failed to load 3D model',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadModelUrl,
              child: const Text('RETRY'),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _build3DViewer() {
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: ModelViewer(
          src: _modelUrl!,
          alt: 'A 3D model of a foot scan',
          ar: false,
          autoRotate: widget.autoRotate,
          cameraControls: widget.enableControls,
          shadowIntensity: 1,
          exposure: 1.0,
          backgroundColor: const Color.fromARGB(0xff, 0xee, 0xee, 0xee),
          // Apply wireframe rendering if requested
          additionalAttributes: widget.wireframe
              ? {
                  'environment-image': 'neutral',
                  'reveal': 'auto',
                  'style': 'height: 100%; width: 100%;',
                  'wireframe': '',
                }
              : {
                  'environment-image': 'neutral',
                  'reveal': 'auto',
                  'style': 'height: 100%; width: 100%;',
                },
        ),
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return _buildLoadingIndicator();
    } else if (_errorMessage != null || _modelUrl == null) {
      return _buildErrorView();
    } else {
      return _build3DViewer();
    }
  }
}