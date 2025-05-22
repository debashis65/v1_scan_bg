import 'package:flutter/material.dart';

class FootTipsScreen extends StatelessWidget {
  const FootTipsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FOOT TIPS'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // General Tips
              const Text(
                'Foot Health Tips',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              _buildTipCard(
                context,
                icon: Icons.scale,
                title: 'Maintain a Healthy Weight',
                description: 'Excess weight can increase the strain on your feet, so aim to maintain a healthy weight through diet and exercise.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.directions_run,
                title: 'Wear Supportive Shoes',
                description: 'Choose shoes with proper arch support, cushioning, and a comfortable fit to reduce stress on your feet.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.fitness_center,
                title: 'Exercise and Stretch',
                description: 'Regular foot exercises and stretching can help improve strength, flexibility, and overall foot health.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.search,
                title: 'Inspect Your Feet',
                description: 'Check your feet regularly for any changes, such as cuts, or signs of infection, and address issues promptly.',
              ),
              const SizedBox(height: 24),
              
              // Scanning Tips
              const Text(
                'Scanning Tips',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              _buildTipCard(
                context,
                icon: Icons.lightbulb_outline,
                title: 'Good Lighting',
                description: 'Ensure you are in a well-lit area for the best scanning results. Natural light works best when possible.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.back_hand,
                title: 'Proper Positioning',
                description: 'Prop your foot against a wall, stand on a flat floor, and keep your foot steady during the scan.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.no_luggage,
                title: 'Remove Footwear',
                description: 'Take off shoes, socks, and any other footwear for an accurate scan of your bare foot.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.camera_alt,
                title: 'Follow On-Screen Guidance',
                description: 'Pay attention to the app\'s instructions and visual guides to ensure your foot is properly positioned in the frame.',
              ),
              const SizedBox(height: 24),
              
              // Foot Problem Signs
              const Text(
                'Signs of Foot Problems',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              _buildTipCard(
                context,
                icon: Icons.healing,
                title: 'Persistent Pain',
                description: 'Ongoing foot pain, especially after rest, may indicate a structural issue or injury that requires attention.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.warning_amber,
                title: 'Swelling or Redness',
                description: 'Inflammation could signal infection, injury, or conditions like arthritis that should be evaluated by a professional.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.attribution,
                title: 'Numbness or Tingling',
                description: 'These sensations may indicate nerve compression or conditions like peripheral neuropathy, often associated with diabetes.',
              ),
              const SizedBox(height: 24),
              
              // Care Tips for Common Conditions
              const Text(
                'Tips for Common Foot Conditions',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              
              _buildTipCard(
                context,
                icon: Icons.accessibility_new,
                title: 'Flat Feet',
                description: 'Use supportive insoles, perform arch-strengthening exercises, and choose shoes with good arch support.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.arrow_upward,
                title: 'High Arches',
                description: 'Wear cushioned shoes, use shock-absorbing insoles, and stretch your calves and feet regularly.',
              ),
              const SizedBox(height: 16),
              
              _buildTipCard(
                context,
                icon: Icons.arrow_downward,
                title: 'Heel Spurs',
                description: 'Rest your feet, use ice to reduce inflammation, and consider heel cups or cushions to relieve pressure.',
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTipCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 30,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
