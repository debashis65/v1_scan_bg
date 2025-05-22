import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';
import 'services/scan_service.dart';
import 'services/sensor_service.dart';
import 'services/foot_detection_service.dart';
import 'theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthService(),
        ),
        ChangeNotifierProvider(
          create: (_) => ScanService(baseUrl: "https://api.barogrip.com"),
        ),
        ChangeNotifierProvider(
          create: (_) => SensorService(),
        ),
        ChangeNotifierProxyProvider<SensorService, FootDetectionService>(
          create: (context) => FootDetectionService(
            baseUrl: "https://api.barogrip.com", 
            sensorService: Provider.of<SensorService>(context, listen: false),
          ),
          update: (context, sensorService, previous) => 
            previous ?? FootDetectionService(
              baseUrl: "https://api.barogrip.com", 
              sensorService: sensorService,
            ),
        ),
      ],
      child: Consumer<AuthService>(
        builder: (context, authService, _) {
          return MaterialApp(
            title: 'Barogrip',
            theme: barogripTheme,
            home: FutureBuilder<bool>(
              future: authService.isLoggedIn(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Scaffold(
                    body: Center(
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                
                final isLoggedIn = snapshot.data ?? false;
                return isLoggedIn ? const HomeScreen() : const LoginScreen();
              },
            ),
          );
        },
      ),
    );
  }
}
