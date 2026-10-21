import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'theme/app_theme.dart';
import 'theme/design_tokens.dart';
import 'screens/home_screen.dart';
import 'screens/study_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/arena_landing_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/learning_hub_screen.dart';
import 'screens/study_session_screen.dart';
import 'widgets/bottom_nav.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: firebaseOptions);
  runApp(const LearningAlliedApp());
}

class LearningAlliedApp extends StatelessWidget {
  const LearningAlliedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeProvider()..load(),
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'Learning Allied',
            debugShowCheckedModeBanner: false,
            theme: themeProvider.theme,
            home: const LearningAlliedShell(),
          );
        },
      ),
    );
  }
}

typedef AquilaApp = LearningAlliedApp;
typedef AquilaShell = LearningAlliedShell;

class LearningAlliedShell extends StatefulWidget {
  const LearningAlliedShell({super.key});
  @override State<LearningAlliedShell> createState() => _LearningAlliedShellState();
}

class _LearningAlliedShellState extends State<LearningAlliedShell> {
  int _index = 0;
  final List<Widget> _pages = const [
    HomeScreen(),
    StudyScreen(),
    ChatScreen(),
    ArenaLandingScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: LearningAlliedBottomNav(currentIndex: _index, onTap: (i) => setState(() => _index = i)),
    );
  }
}
