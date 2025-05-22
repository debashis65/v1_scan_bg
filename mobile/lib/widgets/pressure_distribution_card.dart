import 'package:flutter/material.dart';
import 'package:barogrip_mobile/models/scan.dart';

class PressureDistributionCard extends StatelessWidget {
  final Scan scan;
  final bool isExpanded;
  final VoidCallback onToggleExpand;

  const PressureDistributionCard({
    Key? key,
    required this.scan,
    required this.isExpanded,
    required this.onToggleExpand,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Check if pressure distribution data is available
    final hasPressureData = scan.pressureDistribution != null;

    if (!hasPressureData) {
      return _buildPlaceholder();
    }

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
                    'Pressure Distribution',
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
          ),
          
          // Content (only visible when expanded)
          if (isExpanded) _buildExpandedContent(context),
        ],
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
                  'Pressure Distribution',
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
                  'Pressure distribution data not available for this scan.',
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

  Widget _buildExpandedContent(BuildContext context) {
    final pressureData = scan.pressureDistribution!;
    final points = scan.getPressurePoints() ?? [];
    
    // Calculate weight distribution
    final forefoot = pressureData['forefoot_percentage'] ?? 0.0;
    final midfoot = pressureData['midfoot_percentage'] ?? 0.0;
    final heel = pressureData['heel_percentage'] ?? 0.0;
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Weight distribution visualization
          const Text(
            'Weight Distribution',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          
          // Distribution chart
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                _buildWeightDistributionRow('Forefoot', forefoot),
                const SizedBox(height: 8),
                _buildWeightDistributionRow('Midfoot', midfoot),
                const SizedBox(height: 8),
                _buildWeightDistributionRow('Heel', heel),
              ],
            ),
          ),
          
          // Pressure points
          if (points.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Pressure Points',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            
            // Foot outline with pressure points visualization
            _buildPressurePointsVisualization(context, points),
            
            // Pressure points details
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: points.map((point) => _buildPressurePointItem(point)).toList(),
            ),
          ],
          
          // Recommendations based on pressure distribution
          if (pressureData.containsKey('recommendations')) ...[
            const SizedBox(height: 16),
            const Text(
              'Recommendations',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                pressureData['recommendations'] as String? ?? 
                'Based on your pressure distribution, consult with a podiatrist for personalized advice.',
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildWeightDistributionRow(String label, dynamic percentage) {
    double value = 0.0;
    if (percentage is double) {
      value = percentage;
    } else if (percentage is int) {
      value = percentage.toDouble();
    } else {
      try {
        value = double.parse(percentage.toString());
      } catch (e) {
        // Default to 0 if parsing fails
      }
    }
    
    // Normalize to percentage between 0-100 if it's in decimal form
    if (value > 0 && value < 1) {
      value = value * 100;
    }
    
    final displayValue = value.toStringAsFixed(1) + '%';
    
    // Determine color based on pressure level
    Color barColor;
    if (value > 50) {
      barColor = Colors.red;
    } else if (value > 30) {
      barColor = Colors.orange;
    } else {
      barColor = Colors.green;
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text(
              displayValue,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 4),
        // Progress bar for visualization
        LinearProgressIndicator(
          value: value / 100,
          backgroundColor: Colors.grey[300],
          color: barColor,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }
  
  Widget _buildPressurePointsVisualization(BuildContext context, List<Map<String, dynamic>> points) {
    // This is a simplified visualization. In a production app, you would use
    // a custom painter to draw the foot outline and pressure points precisely
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Stack(
        children: [
          // Foot outline (simplified representation)
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/foot_outline.png',
                height: 180,
                color: Colors.grey[400],
              ),
            ),
          ),
          
          // Pressure points as colored circles
          ...points.map((point) {
            // Each point would have x, y coordinates (normalized to 0-1 range)
            final x = point['x'] is double ? point['x'] : 0.5;
            final y = point['y'] is double ? point['y'] : 0.5;
            final intensity = point['intensity'] is double ? point['intensity'] : 0.5;
            
            // Calculate the actual position in the container
            final posX = MediaQuery.of(context).size.width * 0.5 * x;
            final posY = 180 * y;
            
            // Determine color based on intensity
            Color pointColor;
            if (intensity > 0.7) {
              pointColor = Colors.red;
            } else if (intensity > 0.4) {
              pointColor = Colors.orange;
            } else {
              pointColor = Colors.yellow;
            }
            
            return Positioned(
              left: posX,
              top: posY,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: pointColor.withOpacity(0.7),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
  
  Widget _buildPressurePointItem(Map<String, dynamic> point) {
    final location = point['location'] as String? ?? 'Unknown';
    final intensity = point['intensity'] is double ? 
                    (point['intensity'] * 100).toStringAsFixed(0) + '%' : 
                    'N/A';
    
    // Determine color based on intensity
    Color intensityColor = Colors.grey;
    if (point['intensity'] is double) {
      final value = point['intensity'] as double;
      if (value > 0.7) {
        intensityColor = Colors.red;
      } else if (value > 0.4) {
        intensityColor = Colors.orange;
      } else {
        intensityColor = Colors.green;
      }
    }
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            location,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Text('Pressure:'),
              const SizedBox(width: 4),
              Text(
                intensity,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: intensityColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}