import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:barogrip/services/accessibility_service.dart';
import 'package:flutter/services.dart';

/// Screen to manage accessibility settings
class AccessibilitySettingsScreen extends StatefulWidget {
  const AccessibilitySettingsScreen({Key? key}) : super(key: key);

  @override
  State<AccessibilitySettingsScreen> createState() => _AccessibilitySettingsScreenState();
}

class _AccessibilitySettingsScreenState extends State<AccessibilitySettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accessibility Settings'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Header
          Text(
            'Vision Settings',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          
          // High Contrast Mode
          _buildSwitchTile(
            context: context,
            title: 'High Contrast Mode',
            subtitle: 'Enhance visibility with yellow text on dark background',
            value: accessibilityService.isHighContrastEnabled,
            onChanged: (value) {
              accessibilityService.toggleHighContrast();
            },
            iconData: Icons.contrast,
          ),
          
          // Large Text Mode
          _buildSwitchTile(
            context: context,
            title: 'Large Text',
            subtitle: 'Increase text size throughout the app',
            value: accessibilityService.isLargeTextEnabled,
            onChanged: (value) {
              accessibilityService.toggleLargeText();
            },
            iconData: Icons.text_fields,
          ),
          
          // Text Size Slider
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Text Size',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Slider(
                  value: accessibilityService.textScaleFactor,
                  min: 0.8,
                  max: 2.0,
                  divisions: 6,
                  label: '${(accessibilityService.textScaleFactor * 100).round()}%',
                  onChanged: (value) {
                    accessibilityService.setTextScaleFactor(value);
                  },
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Smaller'),
                    Text(
                      '${(accessibilityService.textScaleFactor * 100).round()}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Text('Larger'),
                  ],
                ),
              ],
            ),
          ),
          
          const Divider(height: 32),
          
          // Header
          Text(
            'Audio Settings',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          
          // Text to Speech
          _buildSwitchTile(
            context: context,
            title: 'Text to Speech',
            subtitle: 'Read on-screen text aloud',
            value: accessibilityService.isTextToSpeechEnabled,
            onChanged: (value) {
              accessibilityService.toggleTextToSpeech();
            },
            iconData: Icons.record_voice_over,
          ),
          
          // TTS Test Button
          if (accessibilityService.isTextToSpeechEnabled)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  accessibilityService.speak("This is a test of the text to speech feature in the Barogrip app.");
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Test Text-to-Speech'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          
          const Divider(height: 32),
          
          // Header
          Text(
            'Usage Tips',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          
          // Tips Card
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.lightbulb,
                        color: Theme.of(context).primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Tips for Using Accessibility Features',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTipItem(
                    context: context,
                    tip: 'When using high contrast mode, yellow elements indicate interactive items',
                  ),
                  _buildTipItem(
                    context: context,
                    tip: 'Text-to-speech will read screen content when you navigate between screens',
                  ),
                  _buildTipItem(
                    context: context,
                    tip: 'Tap the screen with three fingers to toggle high contrast mode from anywhere',
                  ),
                  _buildTipItem(
                    context: context,
                    tip: 'For AR scanning, voice guidance will provide additional instructions when text-to-speech is enabled',
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Footer
          Center(
            child: ElevatedButton.icon(
              onPressed: () {
                // Trigger haptic feedback
                HapticFeedback.mediumImpact();
                
                Navigator.pop(context);
                
                // Speak a message if text-to-speech is enabled
                if (accessibilityService.isTextToSpeechEnabled) {
                  accessibilityService.speak("Accessibility settings saved");
                }
              },
              icon: const Icon(Icons.check),
              label: const Text('SAVE SETTINGS'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
        ],
      ),
    );
  }
  
  Widget _buildSwitchTile({
    required BuildContext context,
    required String title,
    required String subtitle,
    required bool value,
    required Function(bool) onChanged,
    required IconData iconData,
  }) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: SwitchListTile(
        title: Row(
          children: [
            Icon(
              iconData,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(left: 40),
          child: Text(subtitle),
        ),
        value: value,
        onChanged: (bool value) {
          onChanged(value);
        },
        activeColor: Theme.of(context).primaryColor,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
    );
  }
  
  Widget _buildTipItem({
    required BuildContext context,
    required String tip,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 4),
            height: 8,
            width: 8,
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(tip),
          ),
        ],
      ),
    );
  }
}