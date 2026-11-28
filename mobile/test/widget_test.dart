import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:learning_allied_arena/main.dart';
import 'package:learning_allied_arena/screens/arena_landing_screen.dart';
import 'package:learning_allied_arena/screens/auth_screen.dart';
import 'package:learning_allied_arena/screens/chat_screen.dart';
import 'package:learning_allied_arena/screens/home_screen.dart';
import 'package:learning_allied_arena/screens/planner_screen.dart';
import 'package:learning_allied_arena/screens/profile_screen.dart';
import 'package:learning_allied_arena/screens/settings_screen.dart';
import 'package:learning_allied_arena/screens/study_session_screen.dart';
import 'package:learning_allied_arena/screens/subscription_screen.dart';
import 'package:learning_allied_arena/services/api_client.dart';
import 'package:learning_allied_arena/services/arena_curriculum.dart';
import 'package:learning_allied_arena/services/arena_progress.dart';
import 'package:learning_allied_arena/services/auth_service.dart';
import 'package:learning_allied_arena/services/firebase_config_service.dart';
import 'package:learning_allied_arena/theme/app_theme.dart';
import 'package:learning_allied_arena/theme/design_tokens.dart';
import 'package:learning_allied_arena/widgets/bottom_nav.dart';
import 'package:learning_allied_arena/widgets/markdown_math_text.dart';

Widget _wrapWithProviders(Widget child) {
  return ChangeNotifierProvider(
    create: (_) => AuthService(),
    child: MaterialApp(
      theme: unifiedMobileTheme,
      home: child,
    ),
  );
}

void main() {
  test('Unified mobile design tokens match sky-blue, crisp white, and dark-pill nav palette', () {
    expect(LATokens.heroTop, const Color(0xFF0A7FF5));
    expect(LAColors.unified.bg, const Color(0xFFF6F8FB));
    expect(LAColors.unified.surface, const Color(0xFFFFFFFF));
    expect(LAColors.unified.navBg, const Color(0xFF141518));
    expect(LAColors.unified.navActive, const Color(0xFFFFFFFF));
  });

  test('ApiException detects 429 limit_reached', () {
    final ex = ApiException(429, 'Daily limit reached', code: 'limit_reached');
    expect(ex.isLimitReached, isTrue);
    final ex2 = ApiException(500, 'Server error');
    expect(ex2.isLimitReached, isFalse);
  });

  test('FirebaseWebConfig validates required fields', () {
    final valid = FirebaseWebConfig.fromJson({
      'apiKey': 'test-key',
      'authDomain': 'test.firebaseapp.com',
      'projectId': 'test-proj',
    });
    expect(valid.isValid, isTrue);
    final invalid = FirebaseWebConfig.fromJson({'apiKey': '', 'projectId': ''});
    expect(invalid.isValid, isFalse);
  });

  test('Arena computeProgress and canBattle enforce prerequisites', () {
    final ch1 = Chapter(
      conceptId: 'c1',
      name: 'Kinematics',
      topic: 'Mechanics',
      subject: 'Physics',
      difficulty: 0.3,
      difficultyLabel: 'Foundation',
      prerequisites: const [],
      curriculumPaths: const [],
    );
    final ch2 = Chapter(
      conceptId: 'c2',
      name: 'Laws of Motion',
      topic: 'Mechanics',
      subject: 'Physics',
      difficulty: 0.5,
      difficultyLabel: 'Intermediate',
      prerequisites: const ['c1'],
      curriculumPaths: const [],
    );

    final progress = ArenaProgress(
      subjectKey: 'jee_physics',
      chapters: {
        'c1': ChapterProgress(state: ArenaState.defeated, level: ArenaLevel.foundation, bestScore: 0.8),
        'c2': ChapterProgress(state: ArenaState.available, level: ArenaLevel.foundation),
      },
      chapterOrder: const ['c1', 'c2'],
      total: 2,
      defeated: 1,
      progressPct: 50,
      finalBossUnlocked: false,
      finalBossDefeated: false,
      finalBossScore: 0,
    );

    final computed = computeProgress(progress, [ch1, ch2]);
    expect(computed.defeated, 1);
    expect(computed.progressPct, 50);
    expect(computed.currentChapterId, 'c2');
    expect(computed.finalBossUnlocked, isFalse);
    expect(canBattle(ch2, computed), isTrue);
  });

  testWidgets('Floating pill bottom nav renders 4 tabs and switches active pill', (tester) async {
    int current = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: unifiedMobileTheme,
        home: StatefulBuilder(
          builder: (ctx, setState) => Scaffold(
            bottomNavigationBar: LearningAlliedBottomNav(
              currentIndex: current,
              onTap: (i) => setState(() => current = i),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Home'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.chat_bubble_outline_rounded));
    await tester.pump();
    expect(current, 2);
    expect(find.text('Tutor'), findsOneWidget);
  });

  testWidgets('LearningAlliedShell uses NavigationRail on tablet (800px)', (tester) async {
    tester.view.physicalSize = const Size(800, 1024);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_wrapWithProviders(const LearningAlliedShell()));
    await tester.pump();
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(LearningAlliedBottomNav), findsNothing);
  });

  testWidgets('AuthScreen renders Sign in, Google button, and switches to Sign up without overflow on 280px', (tester) async {
    tester.view.physicalSize = const Size(280, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_wrapWithProviders(const AuthScreen()));
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign up'));
    await tester.tap(find.text('Sign up'));
    await tester.pump();
    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('Continue with Google'), findsOneWidget);
  });

  testWidgets('HomeScreen and ArenaLanding render cleanly on 320px small screen with no theme switcher', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_wrapWithProviders(HomeScreen(onNavigateTab: (_) {})));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.dark_mode_outlined), findsNothing);
    expect(find.byIcon(Icons.light_mode_outlined), findsNothing);
    expect(find.text('Mastery'), findsOneWidget);
    await tester.drag(find.byType(ListView).first, const Offset(0, -240));
    await tester.pump();
    expect(find.text('Study workspace'), findsOneWidget);

    await tester.pumpWidget(_wrapWithProviders(const ArenaLandingScreen()));
    await tester.pump();
    expect(find.text('Choose your battlefield'), findsOneWidget);
  });

  testWidgets('ProfileScreen renders 2-column AI Personality grid cleanly on 390px', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_wrapWithProviders(const ProfileScreen()));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, -250));
    await tester.pump();
    expect(find.text('AI Personality'), findsOneWidget);
    expect(find.text('Inspirational'), findsOneWidget);
  });

  testWidgets('SettingsScreen has no theme switcher and renders Memory & Feedback', (tester) async {
    await tester.pumpWidget(_wrapWithProviders(const SettingsScreen()));
    await tester.pump();
    expect(find.text('Light theme'), findsNothing);
    expect(find.text('Appearance'), findsNothing);
    expect(find.text('Long-Term AI Memory'), findsOneWidget);
  });

  testWidgets('ChatScreen, StudySession, Planner, Subscription render without overflow', (tester) async {
    await tester.pumpWidget(_wrapWithProviders(const ChatScreen()));
    await tester.pump();
    expect(find.text('AI Tutor'), findsOneWidget);

    await tester.pumpWidget(_wrapWithProviders(const StudySessionScreen()));
    await tester.pump();
    expect(find.text('Study Session'), findsOneWidget);

    await tester.pumpWidget(_wrapWithProviders(const PlannerScreen()));
    await tester.pump();
    expect(find.text('Study Planner'), findsOneWidget);

    await tester.pumpWidget(_wrapWithProviders(const SubscriptionScreen()));
    await tester.pump();
    expect(find.text('Plan & Usage'), findsOneWidget);
  });

  testWidgets('MarkdownMathText renders headings, lists, and math', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: unifiedMobileTheme,
        home: const Scaffold(
          body: MarkdownMathText(
            text: '# Newton\n- Force: \$F = m \\times a\$\n\$\$E = mc^2\$\$',
          ),
        ),
      ),
    );
    expect(find.textContaining('Newton'), findsOneWidget);
    expect(find.textContaining('F = m × a'), findsOneWidget);
  });

  testWidgets('LearningAlliedApp builds cleanly', (tester) async {
    await tester.pumpWidget(const LearningAlliedApp());
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
