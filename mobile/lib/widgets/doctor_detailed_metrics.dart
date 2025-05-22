import 'package:flutter/material.dart';
import 'package:barogrip_mobile/models/scan.dart';

class DoctorDetailedMetrics extends StatelessWidget {
  final Scan scan;
  final bool isExpanded;
  final VoidCallback onToggleExpand;

  const DoctorDetailedMetrics({
    Key? key,
    required this.scan,
    required this.isExpanded,
    required this.onToggleExpand,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          // Header with expand/collapse toggle
          InkWell(
            onTap: onToggleExpand,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Detailed Clinical Metrics',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.blue[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Doctor View',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue[800],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        color: Colors.blue,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Content (only visible when expanded)
          if (isExpanded) _buildExpandedContent(),
        ],
      ),
    );
  }

  Widget _buildExpandedContent() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Skin tone details (clinical perspective)
          if (scan.skinToneAnalysis != null) _buildSkinToneSection(),
          
          const SizedBox(height: 16),
          
          // Vascular health metrics (more detailed for doctors)
          if (scan.vascularMetrics != null) _buildVascularHealthSection(),
          
          const SizedBox(height: 16),
          
          // Biomechanical analysis
          if (scan.advancedMeasurements != null) _buildBiomechanicalSection(),
          
          const SizedBox(height: 16),
          
          // Clinical implications section
          _buildClinicalImplicationsSection(),
        ],
      ),
    );
  }
  
  Widget _buildSkinToneSection() {
    final skinToneData = scan.skinToneAnalysis!;
    final fitzpatrickType = skinToneData['fitzpatrick_type']?.toString() ?? 'Unknown';
    
    // Get vascular visibility characteristics based on skin type
    final visibility = _getVascularVisibilityByFitzpatrick(fitzpatrickType);
    
    // Get RGB values if available
    final rgb = scan.getSkinToneRGB();
    final String rgbText = rgb != null 
        ? 'RGB(${rgb['r']}, ${rgb['g']}, ${rgb['b']})' 
        : 'Not available';
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Skin Tone Analysis (Clinical)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Fitzpatrick Skin Type:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.grey),
                    ),
                    child: Text(
                      'Type $fitzpatrickType',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (rgb != null)
                Row(
                  children: [
                    const Text('Color Profile:'),
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
                    Text(rgbText),
                  ],
                ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                'Clinical Relevance:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(visibility),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildVascularHealthSection() {
    final vascularData = scan.vascularMetrics!;
    
    // Extract metrics with fallbacks
    final visibility = vascularData['visibility_score'] ?? 0.0;
    final visibilityScore = visibility is double ? visibility : 
                           visibility is int ? visibility.toDouble() : 0.0;
    
    final perfusionIndex = vascularData['perfusion_index'] ?? 0.0;
    final perfusionScore = perfusionIndex is double ? perfusionIndex : 
                          perfusionIndex is int ? perfusionIndex.toDouble() : 0.0;
    
    final pulseAmplitude = vascularData['pulse_amplitude'] ?? 0.0;
    final amplitudeScore = pulseAmplitude is double ? pulseAmplitude : 
                          pulseAmplitude is int ? pulseAmplitude.toDouble() : 0.0;
    
    // Interpretations based on values
    final visibilityInterpretation = _getHealthInterpretation(visibilityScore);
    final perfusionInterpretation = _getHealthInterpretation(perfusionScore);
    final amplitudeInterpretation = _getHealthInterpretation(amplitudeScore);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Vascular Health Assessment',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.red[50],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              _buildHealthMetricRow(
                'Vascular Visibility', 
                visibilityScore.toStringAsFixed(2), 
                visibilityInterpretation
              ),
              const SizedBox(height: 12),
              _buildHealthMetricRow(
                'Perfusion Index', 
                perfusionScore.toStringAsFixed(2), 
                perfusionInterpretation
              ),
              const SizedBox(height: 12),
              _buildHealthMetricRow(
                'Pulse Amplitude', 
                amplitudeScore.toStringAsFixed(2), 
                amplitudeInterpretation
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                'Potential Clinical Correlations:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(_getVascularClinicalCorrelation(
                visibilityScore,
                perfusionScore,
                amplitudeScore
              )),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildBiomechanicalSection() {
    final measurements = scan.advancedMeasurements!;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Biomechanical Analysis',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green[50],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              // Detailed metrics list - add more as needed
              if (measurements.containsKey('arch_rigidity_index'))
                _buildMetricRow(
                  'Arch Rigidity Index',
                  measurements['arch_rigidity_index']['value']?.toString() ?? 'N/A',
                  measurements['arch_rigidity_index']['interpretation']?.toString(),
                ),
              if (measurements.containsKey('navicular_drop'))
                _buildMetricRow(
                  'Navicular Drop',
                  measurements['navicular_drop']['value']?.toString() ?? 'N/A',
                  measurements['navicular_drop']['interpretation']?.toString(),
                  unit: 'mm',
                ),
              if (measurements.containsKey('medial_longitudinal_arch_angle'))
                _buildMetricRow(
                  'Medial Longitudinal Arch Angle',
                  measurements['medial_longitudinal_arch_angle']['value']?.toString() ?? 'N/A',
                  measurements['medial_longitudinal_arch_angle']['interpretation']?.toString(),
                  unit: '°',
                ),
              if (measurements.containsKey('calcaneal_angle'))
                _buildMetricRow(
                  'Calcaneal Angle',
                  measurements['calcaneal_angle']['value']?.toString() ?? 'N/A',
                  measurements['calcaneal_angle']['interpretation']?.toString(),
                  unit: '°',
                ),
              if (measurements.containsKey('hallux_angle'))
                _buildMetricRow(
                  'Hallux Angle',
                  measurements['hallux_angle']['value']?.toString() ?? 'N/A',
                  measurements['hallux_angle']['interpretation']?.toString(),
                  unit: '°',
                ),
              // Note about data
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                'Notes:',
                style: TextStyle(fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 4),
              const Text(
                'Values represent static measurements. Dynamic assessment may reveal additional findings.',
                style: TextStyle(
                  fontStyle: FontStyle.italic,
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildClinicalImplicationsSection() {
    // Get AI diagnosis as a base for clinical implications
    final diagnosis = scan.aiDiagnosis ?? 'Analysis in progress';
    
    // Build clinical implications based on the overall scan data
    final implications = _getClinicalImplications();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Clinical Implications',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.medical_services, color: Colors.blue[700]),
                  const SizedBox(width: 8),
                  const Text(
                    'Primary Analysis:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                diagnosis,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              const Text(
                'Potential Implications:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...implications.map((implication) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• '),
                    Expanded(child: Text(implication)),
                  ],
                ),
              )),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.yellow[50],
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.amber),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.amber),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This analysis is an AI-assisted assessment and should be used in conjunction with clinical judgment.',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildHealthMetricRow(String label, String value, String interpretation) {
    // Determine color based on interpretation
    Color interpretationColor;
    if (interpretation == 'Excellent') {
      interpretationColor = Colors.green;
    } else if (interpretation == 'Good') {
      interpretationColor = Colors.lightGreen;
    } else if (interpretation == 'Fair') {
      interpretationColor = Colors.orange;
    } else {
      interpretationColor = Colors.red;
    }
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(value, style: const TextStyle(fontSize: 14)),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            interpretation,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: interpretationColor,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildMetricRow(String label, String value, String? interpretation, {String? unit}) {
    final displayValue = unit != null ? '$value $unit' : value;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                displayValue,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              if (interpretation != null)
                Text(
                  interpretation,
                  style: TextStyle(
                    fontSize: 12,
                    color: interpretation.toLowerCase().contains('normal')
                        ? Colors.green
                        : Colors.orange,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
  
  // Helper methods for interpretations
  
  String _getVascularVisibilityByFitzpatrick(String fitzpatrickType) {
    switch (fitzpatrickType) {
      case '1':
        return 'Type I skin typically shows excellent vascular visibility with minimal melanin content. Venous structures are usually easily visible. May require lower imaging intensity settings.';
      case '2':
        return 'Type II skin shows good vascular visibility with low melanin content. Venous visualization is typically clear with standard imaging settings.';
      case '3':
        return 'Type III skin has moderate melanin content, which may partially obscure some vascular structures. May benefit from enhanced imaging techniques for optimal visualization.';
      case '4':
        return 'Type IV skin has increased melanin content, which can significantly reduce vascular visibility. Requires optimized imaging parameters and potentially enhanced processing.';
      case '5':
        return 'Type V skin has high melanin content, creating substantial challenges for vascular visualization. Requires specialized imaging techniques with adaptive calibration.';
      case '6':
        return 'Type VI skin has very high melanin content, significantly limiting standard vascular imaging. Requires specialized high-sensitivity imaging modes with extensive calibration.';
      default:
        return 'Skin type not definitively classified. Clinical correlation is recommended for optimal vascular assessment approach.';
    }
  }
  
  String _getHealthInterpretation(double value) {
    if (value > 0.75) {
      return 'Excellent';
    } else if (value > 0.5) {
      return 'Good';
    } else if (value > 0.25) {
      return 'Fair';
    } else {
      return 'Poor';
    }
  }
  
  String _getVascularClinicalCorrelation(double visibility, double perfusion, double amplitude) {
    if (visibility < 0.3 || perfusion < 0.3 || amplitude < 0.3) {
      return 'The vascular metrics suggest potential reduced peripheral circulation. Consider further assessment for peripheral vascular disease, diabetes-related microvascular changes, or other conditions affecting distal circulation.';
    } else if (visibility < 0.5 || perfusion < 0.5 || amplitude < 0.5) {
      return 'The vascular metrics indicate moderate changes in peripheral circulation. This may be associated with mild vascular insufficiency, early diabetic changes, or could be within normal variation for the patient\'s demographic.';
    } else {
      return 'The vascular metrics are within normal to good ranges, suggesting adequate peripheral circulation. No immediate vascular concerns are evident from this assessment.';
    }
  }
  
  List<String> _getClinicalImplications() {
    // This is a simplified approach. In a real implementation, 
    // this would be based on sophisticated analysis of all available data
    final diagnosis = scan.aiDiagnosis ?? '';
    final archType = scan.getArchType() ?? '';
    
    final List<String> implications = [];
    
    // Add implications based on diagnosis
    if (diagnosis.toLowerCase().contains('flat') || archType.toLowerCase().contains('flat')) {
      implications.add('Pronated foot posture may contribute to medial lower extremity stress syndromes.');
      implications.add('Consider evaluating for tibialis posterior dysfunction if symptoms present.');
      implications.add('May benefit from medial arch support or motion control footwear.');
    } 
    else if (diagnosis.toLowerCase().contains('high arch') || archType.toLowerCase().contains('high')) {
      implications.add('Supinated foot posture may contribute to lateral ankle instability.');
      implications.add('Higher impact forces due to reduced shock absorption capacity.');
      implications.add('May benefit from cushioned footwear with lateral stability features.');
    }
    
    // Add vascular implications if metrics are available
    if (scan.vascularMetrics != null) {
      final visibilityScore = scan.getVascularVisibilityScore() ?? 0;
      if (visibilityScore < 0.4) {
        implications.add('Reduced vascular metrics warrant consideration of peripheral vascular assessment.');
      }
    }
    
    // Add pressure distribution implications if available
    if (scan.pressureDistribution != null) {
      final forefoot = scan.pressureDistribution!['forefoot_percentage'];
      if (forefoot != null && forefoot is double && forefoot > 40) {
        implications.add('Elevated forefoot pressure may indicate metatarsalgia risk or forefoot loading pattern.');
      }
    }
    
    // If no specific implications were found, add general ones
    if (implications.isEmpty) {
      implications.add('Biomechanical assessment suggests normal foot function without significant abnormalities.');
      implications.add('Standard supportive footwear appropriate for activities is recommended.');
    }
    
    // Add general recommendation
    implications.add('Correlation with clinical history and examination is essential for comprehensive assessment.');
    
    return implications;
  }
}