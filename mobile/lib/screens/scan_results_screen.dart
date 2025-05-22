import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:barogrip_mobile/services/scan_service.dart';
import 'package:barogrip_mobile/services/websocket_service.dart';
import 'package:barogrip_mobile/services/auth_service.dart';
import 'package:barogrip_mobile/widgets/foot_scan_viewer.dart';
import 'package:barogrip_mobile/widgets/advanced_measurements_card.dart';
import 'package:barogrip_mobile/widgets/pressure_distribution_card.dart';
import 'package:barogrip_mobile/widgets/doctor_detailed_metrics.dart';
import 'package:barogrip_mobile/models/scan.dart';
import 'package:barogrip_mobile/models/user.dart';

class ScanResultsScreen extends StatefulWidget {
  final int scanId;
  
  const ScanResultsScreen({
    Key? key,
    required this.scanId,
  }) : super(key: key);

  @override
  State<ScanResultsScreen> createState() => _ScanResultsScreenState();
}

class _ScanResultsScreenState extends State<ScanResultsScreen> {
  final ScanService _scanService = ScanService();
  Scan? _scan;
  List<dynamic>? _prescriptions;
  bool _isLoading = true;
  String? _errorMessage;
  
  // Expanded state for the collapsible sections
  bool _isAdvancedMeasurementsExpanded = false;
  bool _isPressureDistributionExpanded = false;
  bool _isDoctorMetricsExpanded = false;
  
  // Flag to determine if user is a doctor
  bool _isDoctor = false;
  
  @override
  void initState() {
    super.initState();
    _connectToWebSocket();
    _loadScanData();
    _checkUserRole();
  }
  
  Future<void> _checkUserRole() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    try {
      final currentUser = await authService.getCurrentUser();
      if (currentUser != null) {
        setState(() {
          _isDoctor = currentUser.role == UserRole.doctor;
        });
      }
    } catch (e) {
      // If there's an error, default to patient view
      setState(() {
        _isDoctor = false;
      });
    }
  }
  
  @override
  void dispose() {
    // Disconnect from WebSocket when leaving the screen
    final websocketService = Provider.of<WebSocketService>(context, listen: false);
    websocketService.disconnect();
    super.dispose();
  }
  
  void _connectToWebSocket() {
    final websocketService = Provider.of<WebSocketService>(context, listen: false);
    
    // Only connect if not already connected
    if (!websocketService.isConnected) {
      websocketService.connectToScan(widget.scanId);
    }
  }
  
  Future<void> _loadScanData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final scan = await _scanService.getScan(widget.scanId);
      final prescriptions = await _scanService.getScanPrescriptions(widget.scanId);
      
      setState(() {
        _scan = scan;
        _prescriptions = prescriptions;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load scan data: ${e.toString()}';
        _isLoading = false;
      });
    }
  }
  
  Widget _buildLoadingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          const Text(
            'Processing Scan...',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'This may take a few minutes. Our AI is analyzing your foot scan.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          Consumer<WebSocketService>(
            builder: (context, websocketService, child) {
              final status = websocketService.scanStatus;
              
              // If scan is complete through websocket update
              if (status == 'complete' && websocketService.scanData != null) {
                // Refresh scan data to show results
                Future.microtask(() => _loadScanData());
              }
              
              return Text(
                'Status: ${status?.toUpperCase() ?? 'Connecting...'}',
                style: TextStyle(
                  color: status == 'complete'
                      ? Colors.green
                      : status == 'error'
                          ? Colors.red
                          : Colors.orange,
                  fontWeight: FontWeight.bold,
                ),
              );
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          const Text(
            'Error Loading Scan',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Text(
              _errorMessage ?? 'An unexpected error occurred',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadScanData,
            child: const Text('RETRY'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMeasurementsSection() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Measurements',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildMeasurementItem(
                    label: 'Length',
                    value: _scan?.footLength != null
                        ? '${_scan!.footLength!.toStringAsFixed(1)} cm'
                        : 'N/A',
                  ),
                ),
                Expanded(
                  child: _buildMeasurementItem(
                    label: 'Width',
                    value: _scan?.footWidth != null
                        ? '${_scan!.footWidth!.toStringAsFixed(1)} cm'
                        : 'N/A',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildMeasurementItem(
                    label: 'Arch Height',
                    value: _scan?.archHeight != null
                        ? '${_scan!.archHeight!.toStringAsFixed(1)} cm'
                        : 'N/A',
                  ),
                ),
                Expanded(
                  child: _buildMeasurementItem(
                    label: 'Instep Height',
                    value: _scan?.instepHeight != null
                        ? '${_scan!.instepHeight!.toStringAsFixed(1)} cm'
                        : 'N/A',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildMeasurementItem({required String label, required String value}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDiagnosisSection() {
    final diagnosis = _scan?.aiDiagnosis;
    final confidence = _scan?.aiConfidence;
    
    String diagnosisText = '';
    
    if (diagnosis == 'Flatfoot') {
      diagnosisText = 'You have excessive weight-bearing on the lateral side of your foot, which may lead to pain and discomfort if untreated.';
    } else if (diagnosis == 'High Arch') {
      diagnosisText = 'You have high arches which can lead to excess pressure on the ball and heel of your foot.';
    } else if (diagnosis == 'Heel Spur') {
      diagnosisText = 'Signs of a heel spur detected, which may cause pain and inflammation in the heel area.';
    } else if (diagnosis == 'Pronation') {
      diagnosisText = 'Your foot tends to roll inward excessively when walking, which can lead to various foot and ankle issues.';
    } else if (diagnosis == 'Supination') {
      diagnosisText = 'Your foot tends to roll outward excessively when walking, which can lead to ankle instability.';
    } else if (diagnosis == 'Normal Foot Structure') {
      diagnosisText = 'Your foot has a normal structure with no significant issues detected.';
    }
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'AI Diagnosis',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (confidence != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.blue[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Confidence: ${(confidence * 100).round()}%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[800],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              diagnosis ?? 'Analysis in progress...',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              diagnosisText,
              style: const TextStyle(fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildPrescriptionsSection() {
    if (_prescriptions == null || _prescriptions!.isEmpty) {
      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: const Padding(
          padding: EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Prescriptions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 16),
              Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Text(
                    'No prescriptions available yet. A doctor will review your scan and may provide recommendations.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Prescriptions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _prescriptions!.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final prescription = _prescriptions![index];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prescription['title'],
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateTime.parse(prescription['createdAt'])
                          .toString()
                          .split(' ')[0],
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(prescription['description']),
                    const SizedBox(height: 8),
                    if (prescription['recommendedProduct'] != null &&
                        prescription['recommendedProduct'].isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(top: 8),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Recommended Product',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(prescription['recommendedProduct']),
                          ],
                        ),
                      ),
                    if (prescription['recommendedExercises'] != null &&
                        prescription['recommendedExercises'].isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(top: 8),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Recommended Exercises',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(prescription['recommendedExercises']),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildAdvancedMeasurementsSection() {
    if (_scan == null) return const SizedBox.shrink();
    
    return AdvancedMeasurementsCard(
      scan: _scan!,
      isExpanded: _isAdvancedMeasurementsExpanded,
      onToggleExpand: () {
        setState(() {
          _isAdvancedMeasurementsExpanded = !_isAdvancedMeasurementsExpanded;
        });
      },
    );
  }
  
  Widget _buildPressureDistributionSection() {
    if (_scan == null) return const SizedBox.shrink();
    
    return PressureDistributionCard(
      scan: _scan!,
      isExpanded: _isPressureDistributionExpanded,
      onToggleExpand: () {
        setState(() {
          _isPressureDistributionExpanded = !_isPressureDistributionExpanded;
        });
      },
    );
  }
  
  Widget _buildDoctorDetailedSection() {
    if (_scan == null || !_isDoctor) return const SizedBox.shrink();
    
    return DoctorDetailedMetrics(
      scan: _scan!,
      isExpanded: _isDoctorMetricsExpanded,
      onToggleExpand: () {
        setState(() {
          _isDoctorMetricsExpanded = !_isDoctorMetricsExpanded;
        });
      },
    );
  }
  
  Widget _buildActionsSection() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            if (_scan?.aiDiagnosis != null && _scan!.aiDiagnosis!.isNotEmpty)
              ElevatedButton(
                onPressed: () {
                  // Request consultation functionality would go here
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Consultation request sent!'),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                ),
                child: const Text('Request Consultation'),
              ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                // Navigate to insoles or recommendations
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Recommended insoles would be shown here'),
                  ),
                );
              },
              child: const Text('Recommended Insoles'),
            ),
          ],
        ),
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    // Listen for websocket updates
    return Consumer<WebSocketService>(
      builder: (context, websocketService, child) {
        // If we receive a complete scan via websocket but haven't loaded it yet
        if (websocketService.scanStatus == 'complete' && 
            websocketService.scanData != null && 
            (_scan == null || _scan!.status != 'complete')) {
          // Refresh the scan data
          Future.microtask(() => _loadScanData());
        }
        
        return Scaffold(
          appBar: AppBar(
            title: const Text('3D SCAN REPORT'),
            centerTitle: true,
          ),
          body: _isLoading
              ? _buildLoadingView()
              : _errorMessage != null
                  ? _buildErrorView()
                  : _scan == null
                      ? _buildLoadingView()
                      : _scan!.status != 'complete'
                          ? _buildLoadingView()
                          : SingleChildScrollView(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // 3D Model
                                  if (_scan!.objUrl != null)
                                    SizedBox(
                                      height: 250,
                                      child: FootScanViewer(
                                        scan: _scan!,
                                      ),
                                    ),
                                  
                                  // Measurements
                                  _buildMeasurementsSection(),
                                  
                                  // Diagnosis
                                  _buildDiagnosisSection(),
                                  
                                  // Advanced Measurements (new)
                                  _buildAdvancedMeasurementsSection(),
                                  
                                  // Pressure Distribution (new)
                                  _buildPressureDistributionSection(),
                                  
                                  // Doctor-specific detailed metrics (only visible to doctors)
                                  _buildDoctorDetailedSection(),
                                  
                                  // Actions
                                  _buildActionsSection(),
                                  
                                  // Prescriptions
                                  _buildPrescriptionsSection(),
                                  
                                  const SizedBox(height: 24),
                                ],
                              ),
                            ),
        );
      },
    );
  }
}
