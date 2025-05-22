import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:barogrip/services/accessibility_service.dart';

/// A card that reads its content aloud when tapped in TTS mode
class AccessibleCard extends StatelessWidget {
  /// The title of the card to be read by TTS
  final String title;
  
  /// Optional description to be read by TTS
  final String? description;
  
  /// Child widgets to display
  final Widget child;
  
  /// Whether to add a border for high-contrast mode
  final bool addBorder;
  
  /// Callback when the card is tapped
  final VoidCallback? onTap;
  
  /// Card elevation
  final double elevation;
  
  /// Card shape
  final ShapeBorder? shape;
  
  /// Card color
  final Color? color;
  
  /// Card padding
  final EdgeInsetsGeometry? padding;

  const AccessibleCard({
    Key? key,
    required this.title,
    this.description,
    required this.child,
    this.onTap,
    this.addBorder = true,
    this.elevation = 2,
    this.shape,
    this.color,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    final isHighContrastMode = accessibilityService.isHighContrastEnabled;
    
    return Card(
      elevation: elevation,
      shape: shape ?? RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: addBorder && isHighContrastMode
            ? const BorderSide(color: Colors.white, width: 1)
            : BorderSide.none,
      ),
      color: color,
      child: InkWell(
        onTap: () {
          // Announce the card content if TTS is enabled
          if (accessibilityService.isTextToSpeechEnabled) {
            String textToSpeak = title;
            if (description != null && description!.isNotEmpty) {
              textToSpeak += ". $description";
            }
            accessibilityService.speak(textToSpeak);
          }
          
          // Call the onTap callback if provided
          if (onTap != null) {
            onTap!();
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: padding ?? const EdgeInsets.all(16.0),
          child: child,
        ),
      ),
    );
  }
}

/// A text button that reads its label aloud when tapped in TTS mode
class AccessibleTextButton extends StatelessWidget {
  /// The button label (used for both display and TTS)
  final String label;
  
  /// Optional additional text for TTS only
  final String? additionalTtsText;
  
  /// Callback when button is pressed
  final VoidCallback onPressed;
  
  /// Icon to display with the button
  final IconData? icon;
  
  /// Text style
  final TextStyle? style;

  const AccessibleTextButton({
    Key? key,
    required this.label,
    this.additionalTtsText,
    required this.onPressed,
    this.icon,
    this.style,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    return TextButton(
      onPressed: () {
        // Announce the button action if TTS is enabled
        if (accessibilityService.isTextToSpeechEnabled) {
          String textToSpeak = label;
          if (additionalTtsText != null) {
            textToSpeak += ". $additionalTtsText";
          }
          accessibilityService.speak(textToSpeak);
        }
        
        onPressed();
      },
      child: icon != null
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon),
                const SizedBox(width: 8),
                Text(label, style: style),
              ],
            )
          : Text(label, style: style),
    );
  }
}

/// An elevated button that reads its label aloud when tapped in TTS mode
class AccessibleElevatedButton extends StatelessWidget {
  /// The button label (used for both display and TTS)
  final String label;
  
  /// Optional additional text for TTS only
  final String? additionalTtsText;
  
  /// Callback when button is pressed
  final VoidCallback onPressed;
  
  /// Icon to display with the button
  final IconData? icon;
  
  /// Button style
  final ButtonStyle? style;

  const AccessibleElevatedButton({
    Key? key,
    required this.label,
    this.additionalTtsText,
    required this.onPressed,
    this.icon,
    this.style,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    return ElevatedButton(
      onPressed: () {
        // Announce the button action if TTS is enabled
        if (accessibilityService.isTextToSpeechEnabled) {
          String textToSpeak = label;
          if (additionalTtsText != null) {
            textToSpeak += ". $additionalTtsText";
          }
          accessibilityService.speak(textToSpeak);
        }
        
        onPressed();
      },
      style: style,
      child: icon != null
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon),
                const SizedBox(width: 8),
                Text(label),
              ],
            )
          : Text(label),
    );
  }
}

/// A text field that announces its label and any error messages when focused
class AccessibleTextField extends StatefulWidget {
  /// Field controller
  final TextEditingController controller;
  
  /// Field label
  final String label;
  
  /// Field hint text
  final String? hintText;
  
  /// Whether the field is obscured (for passwords)
  final bool obscureText;
  
  /// Keyboard type
  final TextInputType keyboardType;
  
  /// Validator function
  final String? Function(String?)? validator;
  
  /// Hint for TTS to describe the field
  final String? accessibilityHint;
  
  /// Input decoration
  final InputDecoration? decoration;
  
  /// On changed callback
  final Function(String)? onChanged;

  const AccessibleTextField({
    Key? key,
    required this.controller,
    required this.label,
    this.hintText,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.validator,
    this.accessibilityHint,
    this.decoration,
    this.onChanged,
  }) : super(key: key);

  @override
  State<AccessibleTextField> createState() => _AccessibleTextFieldState();
}

class _AccessibleTextFieldState extends State<AccessibleTextField> {
  String? _errorText;
  
  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    return TextFormField(
      controller: widget.controller,
      obscureText: widget.obscureText,
      keyboardType: widget.keyboardType,
      onChanged: widget.onChanged,
      decoration: widget.decoration ?? InputDecoration(
        labelText: widget.label,
        hintText: widget.hintText,
        errorText: _errorText,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      validator: widget.validator != null ? (value) {
        final error = widget.validator!(value);
        setState(() {
          _errorText = error;
        });
        return error;
      } : null,
      onTap: () {
        if (accessibilityService.isTextToSpeechEnabled) {
          // Announce field label and any additional hint
          String textToSpeak = widget.label;
          if (widget.accessibilityHint != null) {
            textToSpeak += ". ${widget.accessibilityHint}";
          }
          if (_errorText != null) {
            textToSpeak += ". Error: $_errorText";
          }
          accessibilityService.speak(textToSpeak);
        }
      },
    );
  }
}

/// A widget that reads its content aloud when it first appears on screen
class AnnouncingText extends StatefulWidget {
  /// The text to display
  final String text;
  
  /// Text style
  final TextStyle? style;
  
  /// Text alignment
  final TextAlign? textAlign;
  
  /// Whether to announce even if it's not the first time
  final bool announceAlways;
  
  /// Text to speak (if different from display text)
  final String? speakText;
  
  /// Max lines
  final int? maxLines;
  
  /// Text overflow behavior
  final TextOverflow? overflow;

  const AnnouncingText(
    this.text, {
    Key? key,
    this.style,
    this.textAlign,
    this.announceAlways = false,
    this.speakText,
    this.maxLines,
    this.overflow,
  }) : super(key: key);

  @override
  State<AnnouncingText> createState() => _AnnouncingTextState();
}

class _AnnouncingTextState extends State<AnnouncingText> {
  bool _hasAnnounced = false;
  
  @override
  void initState() {
    super.initState();
    
    // Schedule announcement after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _announceText();
    });
  }
  
  @override
  void didUpdateWidget(AnnouncingText oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    if (widget.announceAlways || widget.text != oldWidget.text) {
      _hasAnnounced = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _announceText();
      });
    }
  }
  
  void _announceText() {
    if (_hasAnnounced && !widget.announceAlways) return;
    
    final accessibilityService = context.read<AccessibilityService>();
    if (accessibilityService.isTextToSpeechEnabled) {
      accessibilityService.speak(widget.speakText ?? widget.text);
      _hasAnnounced = true;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Text(
      widget.text,
      style: widget.style,
      textAlign: widget.textAlign,
      maxLines: widget.maxLines,
      overflow: widget.overflow,
    );
  }
}

/// A list tile that announces its content when tapped in TTS mode
class AccessibleListTile extends StatelessWidget {
  /// Tile title
  final String title;
  
  /// Tile subtitle
  final String? subtitle;
  
  /// Leading widget
  final Widget? leading;
  
  /// Trailing widget
  final Widget? trailing;
  
  /// Callback when tile is tapped
  final VoidCallback? onTap;
  
  /// Additional text for TTS only
  final String? additionalTtsText;
  
  /// Whether to enable three-line subtitle
  final bool isThreeLine;

  const AccessibleListTile({
    Key? key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.additionalTtsText,
    this.isThreeLine = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    return ListTile(
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      leading: leading,
      trailing: trailing,
      isThreeLine: isThreeLine,
      onTap: () {
        // Announce the tile content if TTS is enabled
        if (accessibilityService.isTextToSpeechEnabled) {
          String textToSpeak = title;
          if (subtitle != null) {
            textToSpeak += ". $subtitle";
          }
          if (additionalTtsText != null) {
            textToSpeak += ". $additionalTtsText";
          }
          accessibilityService.speak(textToSpeak);
        }
        
        // Call the onTap callback if provided
        if (onTap != null) {
          onTap!();
        }
      },
    );
  }
}