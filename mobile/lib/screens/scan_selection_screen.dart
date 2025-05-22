import 'package:flutter/material.dart';

class ScanSelectionScreen extends StatelessWidget {
  const ScanSelectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('3D Scan'),
        centerTitle: true,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Theme.of(context).primaryColor.withOpacity(0.1),
              Colors.white,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Select Foot to Scan',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Our advanced 3D scanning technology uses AR to create a detailed model of your foot.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Foot selection cards
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Row(
                    children: [
                      // Left foot
                      Expanded(
                        child: _FootSelectionCard(
                          title: 'Left Foot',
                          icon: Icons.arrow_back,
                          onTap: () => _startScan(context, isLeftFoot: true),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Right foot
                      Expanded(
                        child: _FootSelectionCard(
                          title: 'Right Foot',
                          icon: Icons.arrow_forward,
                          onTap: () => _startScan(context, isLeftFoot: false),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              // Instructions
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Scanning Instructions',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildInstructionItem(
                      context,
                      icon: Icons.light_mode,
                      text: 'Find a well-lit area for scanning',
                    ),
                    _buildInstructionItem(
                      context,
                      icon: Icons.stay_current_portrait,
                      text: 'Place your phone on a flat, stable surface at foot level',
                    ),
                    _buildInstructionItem(
                      context,
                      icon: Icons.rotate_90_degrees_ccw,
                      text: 'Stand in different positions while phone remains stationary',
                    ),
                    _buildInstructionItem(
                      context,
                      icon: Icons.timer,
                      text: 'The scan will take 1-2 minutes to complete',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildInstructionItem(
    BuildContext context, {
    required IconData icon,
    required String text,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: Theme.of(context).primaryColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
  
  void _startScan(BuildContext context, {required bool isLeftFoot}) {
    Navigator.pushNamed(
      context,
      '/ar_scan',
      arguments: {'isLeftFoot': isLeftFoot},
    );
  }
}

class _FootSelectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;
  
  const _FootSelectionCard({
    Key? key,
    required this.title,
    required this.icon,
    required this.onTap,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Foot icon
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 48,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 16),
              // Title
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              // Scan button
              ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: const Text('SCAN NOW'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}