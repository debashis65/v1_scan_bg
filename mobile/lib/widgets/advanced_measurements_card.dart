import 'package:flutter/material.dart';
import 'package:barogrip_mobile/models/scan.dart';

class AdvancedMeasurementsCard extends StatelessWidget {
  final Scan scan;
  final bool isExpanded;
  final VoidCallback onToggleExpand;

  const AdvancedMeasurementsCard({
    Key? key,
    required this.scan,
    required this.isExpanded,
    required this.onToggleExpand,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Check if advanced data is available
    final hasAdvancedData = scan.hasAdvancedData();

    if (!hasAdvancedData) {
      return _buildPlaceholder();
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          // Header with expand/collapse toggle
          _buildHeader(),
          
          // Body with measurements (only visible when expanded)
          if (isExpanded) _buildExpandedContent(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return InkWell(
      onTap: onToggleExpand,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Advanced Clinical Measurements',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Icon(
              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              color: Colors.blue,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
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
                  'Advanced Clinical Measurements',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: Colors.grey[400],
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text(
                  'Advanced measurements data not available. This may be due to an older scan version or incomplete processing.',
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

  Widget _buildExpandedContent() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Arch Analysis
          if (scan.archAnalysis != null) _buildArchAnalysisSection(),
          
          const SizedBox(height: 16),
          
          // Advanced Foot Measurements
          if (scan.advancedMeasurements != null) _buildAdvancedMeasurementsSection(),
          
          const SizedBox(height: 16),
          
          // Vascular Assessment
          if (scan.vascularMetrics != null) _buildVascularAssessmentSection(),
          
          // Show a note for doctors
          const SizedBox(height: 24),
          const Text(
            'Note: For additional detailed clinical metrics, please view the complete scan report.',
            style: TextStyle(
              fontStyle: FontStyle.italic,
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArchAnalysisSection() {
    final archType = scan.getArchType() ?? 'Unknown';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Arch Type Analysis',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                Icons.insights,
                color: Colors.blue[700],
                size: 36,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      archType,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[700],
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    _getArchTypeDescription(archType),
                  ],
                ),
              ),
            ],
          ),
        ),
        // More detailed arch metrics could be shown here
        if (scan.archAnalysis!.containsKey('arch_index'))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _buildMeasurementItem(
              label: 'Arch Index',
              value: scan.archAnalysis!['arch_index']?.toString() ?? 'N/A',
              interpretation: _getArchIndexInterpretation(scan.archAnalysis!['arch_index']),
            ),
          ),
      ],
    );
  }

  Widget _buildAdvancedMeasurementsSection() {
    final measurements = scan.advancedMeasurements!;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Foot Posture Analysis',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (measurements.containsKey('foot_posture_index'))
              _buildMeasurementItem(
                label: 'Foot Posture Index',
                value: measurements['foot_posture_index']['value']?.toString() ?? 'N/A',
                interpretation: measurements['foot_posture_index']['interpretation']?.toString(),
              ),
              
            if (measurements.containsKey('chippaux_smirak_index'))
              _buildMeasurementItem(
                label: 'Chippaux-Smirak Index',
                value: measurements['chippaux_smirak_index']['value']?.toString() ?? 'N/A',
                interpretation: measurements['chippaux_smirak_index']['interpretation']?.toString(),
              ),
              
            if (measurements.containsKey('arch_angle'))
              _buildMeasurementItem(
                label: 'Arch Angle',
                value: measurements['arch_angle']['value']?.toString() ?? 'N/A',
                unit: '°',
                interpretation: measurements['arch_angle']['interpretation']?.toString(),
              ),
              
            if (measurements.containsKey('valgus_index'))
              _buildMeasurementItem(
                label: 'Valgus Index',
                value: measurements['valgus_index']['value']?.toString() ?? 'N/A',
                interpretation: measurements['valgus_index']['interpretation']?.toString(),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildVascularAssessmentSection() {
    final vascularScore = scan.getVascularVisibilityScore();
    final scoreText = vascularScore != null ? vascularScore.toStringAsFixed(2) : 'N/A';
    
    String interpretation = 'Unknown';
    Color interpretationColor = Colors.grey;
    
    if (vascularScore != null) {
      if (vascularScore > 0.7) {
        interpretation = 'Excellent';
        interpretationColor = Colors.green;
      } else if (vascularScore > 0.5) {
        interpretation = 'Good';
        interpretationColor = Colors.lightGreen;
      } else if (vascularScore > 0.3) {
        interpretation = 'Fair';
        interpretationColor = Colors.orange;
      } else {
        interpretation = 'Poor';
        interpretationColor = Colors.red;
      }
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Vascular Assessment',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.red[50],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Vascular Visibility Score:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      scoreText,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Interpretation:'),
                  Text(
                    interpretation,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: interpretationColor,
                    ),
                  ),
                ],
              ),
              
              // Show skin tone data if available
              if (scan.skinToneAnalysis != null)
                _buildSkinToneInfo(),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildSkinToneInfo() {
    final fitzpatrickType = scan.getFitzpatrickType() ?? 'Unknown';
    final rgb = scan.getSkinToneRGB();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        const Divider(),
        const SizedBox(height: 8),
        const Text(
          'Skin Tone Analysis',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Text('Fitzpatrick Scale:'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'Type $fitzpatrickType',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        
        if (rgb != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                const Text('Dominant Color:'),
                const SizedBox(width: 8),
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Color.fromRGBO(rgb['r']!, rgb['g']!, rgb['b']!, 1.0),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.grey),
                  ),
                ),
                const SizedBox(width: 8),
                Text('RGB(${rgb['r']}, ${rgb['g']}, ${rgb['b']})'),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildMeasurementItem({
    required String label,
    required String value,
    String? unit,
    String? interpretation,
  }) {
    final String displayValue = unit != null ? '$value $unit' : value;
    
    Color interpretationColor = Colors.grey;
    if (interpretation != null) {
      if (interpretation.toLowerCase().contains('normal')) {
        interpretationColor = Colors.green;
      } else if (interpretation.toLowerCase().contains('mild')) {
        interpretationColor = Colors.orange;
      } else if (interpretation.toLowerCase().contains('moderate') || 
                interpretation.toLowerCase().contains('severe')) {
        interpretationColor = Colors.red;
      }
    }
    
    return Container(
      width: MediaQuery.of(context).size.width * 0.42, // Roughly half the screen width
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
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
            displayValue,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (interpretation != null) ...[
            const SizedBox(height: 4),
            Text(
              interpretation,
              style: TextStyle(
                fontSize: 12,
                color: interpretationColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Text _getArchTypeDescription(String archType) {
    String description = '';
    
    switch (archType.toLowerCase()) {
      case 'high arch':
      case 'pes cavus':
        description = 'Higher arch with limited contact area in the midfoot region';
        break;
      case 'normal arch':
      case 'neutral':
        description = 'Normal foot arch with balanced weight distribution';
        break;
      case 'flat foot':
      case 'pes planus':
        description = 'Flattened arch with increased midfoot contact area';
        break;
      default:
        description = 'Unique arch structure requiring professional assessment';
    }
    
    return Text(
      description,
      style: const TextStyle(fontSize: 14),
    );
  }
  
  String _getArchIndexInterpretation(dynamic archIndex) {
    if (archIndex == null) return 'Unknown';
    
    double index = 0;
    if (archIndex is double) {
      index = archIndex;
    } else if (archIndex is int) {
      index = archIndex.toDouble();
    } else {
      try {
        index = double.parse(archIndex.toString());
      } catch (e) {
        return 'Unknown';
      }
    }
    
    if (index < 0.21) {
      return 'High Arch';
    } else if (index <= 0.26) {
      return 'Normal';
    } else {
      return 'Flat Foot';
    }
  }
}