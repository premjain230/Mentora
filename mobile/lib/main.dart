import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/arena_landing_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try{ await Firebase.initializeApp(); }catch(e){ debugPrint('Firebase init: $e'); }
  runApp(const AquilaArenaApp());
}

class AquilaArenaApp extends StatelessWidget {
  const AquilaArenaApp({super.key});
  @override
  Widget build(BuildContext context){
    return MaterialApp(
      title: 'Arena — Aquila AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF070A14),
        colorScheme: const ColorScheme.dark(primary: Color(0xFF0EA5E9), secondary: Color(0xFF8B5CF6)),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      home: const ArenaLandingScreen(),
    );
  }
}
