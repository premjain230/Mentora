import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'theme/tokens.dart';
import 'screens/home_screen.dart';
import 'screens/study_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/arena_landing_screen.dart';
import 'screens/profile_screen.dart';
import 'widgets/bottom_nav.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try{ await Firebase.initializeApp(); }catch(e){ debugPrint('Firebase init: $e'); }
  runApp(const LearningAlliedApp());
}

class LearningAlliedApp extends StatelessWidget {
  const LearningAlliedApp({super.key});
  @override
  Widget build(BuildContext context){
    return MaterialApp(
      title: 'Learning Allied — One Product',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: LearningAlliedTokens.bgBase,
        colorScheme: const ColorScheme.dark(primary: LearningAlliedTokens.accent, secondary: LearningAlliedTokens.accent2),
        useMaterial3: true,
        fontFamily: LearningAlliedTokens.fontMain,
      ),
      home: const LearningAlliedShell(),
    );
  }
}

// Backward compat aliases
typedef AquilaApp = LearningAlliedApp;
typedef AquilaShell = LearningAlliedShell;

class LearningAlliedShell extends StatefulWidget {
  const LearningAlliedShell({super.key});
  @override State<LearningAlliedShell> createState()=> _LearningAlliedShellState();
}
class _LearningAlliedShellState extends State<LearningAlliedShell> {
  int _index = 0;
  final _pages = const [HomeScreen(), StudyScreen(), ChatScreen(), ArenaLandingScreen(), ProfileScreen()];
  @override
  Widget build(BuildContext context){
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: LearningAlliedBottomNav(currentIndex: _index, onTap: (i)=> setState(()=> _index=i)),
    );
  }
}
