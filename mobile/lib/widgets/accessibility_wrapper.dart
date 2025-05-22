import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:barogrip/services/accessibility_service.dart';

/// A widget wrapper that applies accessibility features to its child
class AccessibilityWrapper extends StatefulWidget {
  /// The child widget to which accessibility features will be applied
  final Widget child;
  
  const AccessibilityWrapper({
    Key? key,
    required this.child,
  }) : super(key: key);

  @override
  State<AccessibilityWrapper> createState() => _AccessibilityWrapperState();
}

class _AccessibilityWrapperState extends State<AccessibilityWrapper> {
  /// Track the number of current fingers on screen
  int _pointerCount = 0;
  
  @override
  Widget build(BuildContext context) {
    final accessibilityService = Provider.of<AccessibilityService>(context);
    
    // Apply theme based on accessibility settings
    final theme = accessibilityService.isHighContrastEnabled
        ? accessibilityService.getHighContrastTheme()
        : accessibilityService.getRegularTheme();
    
    // Apply text scaling based on settings
    return Theme(
      data: theme,
      child: MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaleFactor: accessibilityService.textScaleFactor,
        ),
        // Detect multi-finger gestures for accessibility shortcuts
        child: Listener(
          onPointerDown: (PointerDownEvent event) {
            _pointerCount++;
            
            // Toggle high contrast mode with three-finger tap
            if (_pointerCount == 3) {
              accessibilityService.toggleHighContrast();
            }
          },
          onPointerUp: (PointerUpEvent event) {
            _pointerCount = _pointerCount > 0 ? _pointerCount - 1 : 0;
          },
          onPointerCancel: (PointerCancelEvent event) {
            _pointerCount = _pointerCount > 0 ? _pointerCount - 1 : 0;
          },
          child: _buildVoiceOverObserver(widget.child, accessibilityService),
        ),
      ),
    );
  }
  
  /// Wraps child with an observer for page transitions to announce them
  Widget _buildVoiceOverObserver(Widget child, AccessibilityService accessibilityService) {
    return RouteAwareVoiceOverObserver(
      child: child, 
      accessibilityService: accessibilityService,
    );
  }
}

/// A widget that announces route changes via text-to-speech
class RouteAwareVoiceOverObserver extends StatefulWidget {
  /// The child widget
  final Widget child;
  
  /// Accessibility service reference
  final AccessibilityService accessibilityService;
  
  const RouteAwareVoiceOverObserver({
    Key? key,
    required this.child,
    required this.accessibilityService,
  }) : super(key: key);

  @override
  State<RouteAwareVoiceOverObserver> createState() => _RouteAwareVoiceOverObserverState();
}

class _RouteAwareVoiceOverObserverState extends State<RouteAwareVoiceOverObserver> with RouteAware {
  final RouteObserver<PageRoute> _routeObserver = RouteObserver<PageRoute>();
  
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) {
      _routeObserver.subscribe(this, route);
    }
  }
  
  @override
  void dispose() {
    _routeObserver.unsubscribe(this);
    super.dispose();
  }
  
  @override
  void didPush() {
    // Announce new page when pushed
    _announceCurrentScreen();
  }
  
  @override
  void didPopNext() {
    // Announce page when returned to after a pop
    _announceCurrentScreen();
  }
  
  void _announceCurrentScreen() {
    if (!widget.accessibilityService.isTextToSpeechEnabled) return;
    
    final route = ModalRoute.of(context);
    if (route != null) {
      String screenName = _getReadableRouteName(route.settings.name);
      widget.accessibilityService.speak("$screenName screen");
    }
  }
  
  String _getReadableRouteName(String? routeName) {
    if (routeName == null) return "Current";
    
    // Remove the leading slash
    String name = routeName.startsWith('/') ? routeName.substring(1) : routeName;
    
    // Replace underscores with spaces
    name = name.replaceAll('_', ' ');
    
    // Convert camelCase to spaces
    name = name.replaceAllMapped(
      RegExp(r'([a-z])([A-Z])'),
      (match) => '${match.group(1)} ${match.group(2)}',
    );
    
    // Capitalize first letter of each word
    name = name.split(' ').map((word) {
      if (word.isNotEmpty) {
        return word[0].toUpperCase() + word.substring(1);
      }
      return word;
    }).join(' ');
    
    return name;
  }
  
  @override
  Widget build(BuildContext context) {
    return Navigator(
      observers: [_routeObserver],
      onGenerateRoute: (settings) {
        return MaterialPageRoute(
          settings: settings,
          builder: (context) => widget.child,
        );
      },
    );
  }
}