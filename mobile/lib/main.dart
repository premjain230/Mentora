import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/arena_landing_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/home_screen.dart';
import 'screens/learning_hub_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'theme/app_theme.dart';
import 'theme/design_tokens.dart';
import 'widgets/bottom_nav.dart';
import 'widgets/learning_allied_logo.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LearningAlliedApp());
}

class LearningAlliedApp extends StatelessWidget {
  const LearningAlliedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService()..init(),
      child: MaterialApp(
        title: 'Learning Allied',
        debugShowCheckedModeBanner: false,
        theme: unifiedMobileTheme,
        home: const _RootGate(),
      ),
    );
  }
}

class _RootGate extends StatefulWidget {
  const _RootGate();

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  String? _checkedUid;
  bool _checkingOnboarding = false;
  bool _needsOnboarding = false;

  Future<void> _checkOnboarding(AuthService auth) async {
    final uid = auth.user?.uid;
    if (uid == null || _checkedUid == uid) return;
    _checkedUid = uid;
    setState(() => _checkingOnboarding = true);
    try {
      final doc = await FirestoreService(auth)
          .getDoc('users/$uid/learning/profile')
          .timeout(const Duration(seconds: 8));
      if (mounted) {
        setState(() {
          _needsOnboarding = doc == null || doc['onboardingComplete'] != true;
          _checkingOnboarding = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _needsOnboarding = false;
          _checkingOnboarding = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (auth.isInitializing) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!auth.isSignedIn) {
      _checkedUid = null;
      return const AuthScreen();
    }
    if (auth.user?.emailVerified != true) {
      return const VerifyEmailGate();
    }

    if (_checkedUid != auth.user?.uid) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _checkOnboarding(auth));
    }
    if (_checkingOnboarding) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_needsOnboarding) {
      return OnboardingScreen(
        onComplete: () => setState(() => _needsOnboarding = false),
      );
    }

    return const LearningAlliedShell();
  }
}

class LearningAlliedShell extends StatefulWidget {
  const LearningAlliedShell({super.key});

  @override
  State<LearningAlliedShell> createState() => _LearningAlliedShellState();
}

class _LearningAlliedShellState extends State<LearningAlliedShell> {
  int _index = 0;

  void _setTab(int i) => setState(() => _index = i);

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final isWide = MediaQuery.sizeOf(context).width >= 600;

    final pages = [
      HomeScreen(onNavigateTab: _setTab),
      const LearningHubScreen(),
      const ChatScreen(),
      const ArenaLandingScreen(),
    ];

    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _index != 0) {
          setState(() => _index = 0);
        }
      },
      child: Scaffold(
        body: isWide
            ? Row(
                children: [
                  NavigationRail(
                    backgroundColor: c.navBg,
                    selectedIndex: _index,
                    onDestinationSelected: _setTab,
                    labelType: NavigationRailLabelType.all,
                    useIndicator: true,
                    indicatorColor: c.navActive,
                    indicatorShape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(LATokens.radiusFull),
                      side: BorderSide(color: c.navBorder, width: 1),
                    ),
                    selectedIconTheme: IconThemeData(color: c.navActiveInk, size: 22),
                    unselectedIconTheme: IconThemeData(color: c.navMuted, size: 21),
                    selectedLabelTextStyle: TextStyle(
                      fontSize: LATokens.fsXs,
                      fontWeight: FontWeight.w600,
                      color: c.navActiveInk,
                    ),
                    unselectedLabelTextStyle: TextStyle(
                      fontSize: LATokens.fsXs,
                      fontWeight: FontWeight.w500,
                      color: c.navSecondary,
                    ),
                    leading: const Padding(
                      padding: EdgeInsets.only(top: 12, bottom: 16),
                      child: Tooltip(
                        message: 'Learning Allied',
                        child: LearningAlliedLogo(size: 26),
                      ),
                    ),
                    destinations: learningAlliedNavItems
                        .map(
                          (item) => NavigationRailDestination(
                            icon: Icon(item.icon),
                            selectedIcon: Icon(item.activeIcon),
                            label: Text(item.label),
                          ),
                        )
                        .toList(),
                    trailing: Expanded(
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: IconButton(
                            tooltip: 'Profile & Settings',
                            icon: Icon(Icons.person_outline_rounded, color: c.navSecondary),
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const ProfileScreen()),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  VerticalDivider(width: 1, color: c.navBorder),
                  Expanded(child: IndexedStack(index: _index, children: pages)),
                ],
              )
            : IndexedStack(index: _index, children: pages),
        bottomNavigationBar: isWide
            ? null
            : LearningAlliedBottomNav(
                currentIndex: _index,
                onTap: _setTab,
              ),
      ),
    );
  }
}
