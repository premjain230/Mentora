import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/learning_allied_logo.dart';
import 'learning_hub_screen.dart';
import 'planner_screen.dart';
import 'profile_screen.dart';
import 'study_session_screen.dart';

class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({super.key, required this.onNavigateTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String? _error;

  double? _avgMasteryPct;
  int _masteredConcepts = 0;
  int _totalTrackedConcepts = 0;
  int _totalMinutesStudied = 0;
  int _sessionCount = 0;
  Map<String, dynamic>? _continueTopic;
  List<Map<String, dynamic>> _recommendations = [];
  List<Map<String, dynamic>> _recentAssessments = [];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null || uid.isEmpty) {
        setState(() => _loading = false);
        return;
      }

      final fs = FirestoreService(auth);
      final svc = LearningService(ApiClient(auth));

      final results = await Future.wait<dynamic>([
        fs.listDocs('users/$uid/mastery', pageSize: 50).catchError((_) => <Map<String, dynamic>>[]),
        fs.listDocs('users/$uid/studySessions', pageSize: 50).catchError((_) => <Map<String, dynamic>>[]),
        fs.getDoc('users/$uid/learning/learningHub').catchError((_) => null),
        fs.listDocs('users/$uid/quizAttempts', pageSize: 10).catchError((_) => <Map<String, dynamic>>[]),
        svc.fetchRecommendations().catchError((_) => <String, dynamic>{}),
      ]);

      final masteryDocs = results[0] as List<Map<String, dynamic>>;
      final sessionDocs = results[1] as List<Map<String, dynamic>>;
      final hubDoc = results[2] as Map<String, dynamic>?;
      final assessmentDocs = results[3] as List<Map<String, dynamic>>;
      final recJson = results[4] as Map<String, dynamic>;

      double masterySum = 0;
      int mastered = 0;
      for (final m in masteryDocs) {
        final score = (m['masteryScore'] is num) ? (m['masteryScore'] as num).toDouble() : 0.0;
        masterySum += score;
        if (score >= 0.8 || m['masteryState'] == 'mastered' || m['masteryState'] == 'strong') {
          mastered++;
        }
      }

      int mins = 0;
      for (final s in sessionDocs) {
        final focused = s['timeFocused'];
        if (focused is num && focused > 0) {
          mins += (focused / 60).round();
        } else if (s['durationMinutes'] is num && s['status'] == 'completed') {
          mins += (s['durationMinutes'] as num).toInt();
        }
      }

      final recsRaw = (recJson['recommendations'] as List<dynamic>?) ?? [];
      final filteredRecs = recsRaw
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((r) => r['action'] != 'review')
          .toList();

      if (!mounted) return;
      setState(() {
        _totalTrackedConcepts = masteryDocs.length;
        _masteredConcepts = mastered;
        _avgMasteryPct = masteryDocs.isEmpty ? null : (masterySum / masteryDocs.length) * 100;
        _sessionCount = sessionDocs.length;
        _totalMinutesStudied = mins;
        _continueTopic = (hubDoc != null && hubDoc['last'] is Map)
            ? Map<String, dynamic>.from(hubDoc['last'] as Map)
            : null;
        _recentAssessments = assessmentDocs.take(3).toList();
        _recommendations = filteredRecs;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final auth = context.watch<AuthService>();
    final fullName = (auth.user?.displayName ?? '').trim();
    final firstName = fullName.isNotEmpty ? fullName.split(' ').first : 'Student';
    final initial = firstName[0].toUpperCase();

    return Scaffold(
      backgroundColor: c.bg,
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    children: [
                      ErrorStateView(message: _error!, onRetry: _loadDashboard),
                    ],
                  )
                : ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      // Sky-blue atmospheric hero header matching reference
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LATokens.heroGradient,
                        ),
                        child: SafeArea(
                          bottom: false,
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 12, 20, 26),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top bar: official white logo + brand + profile button
                                Row(
                                  children: [
                                    const LearningAlliedLogo(size: 24, color: Colors.white),
                                    const SizedBox(width: 8),
                                    const Expanded(
                                      child: Text(
                                        'Learning Allied',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: LATokens.fsLg,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: -0.3,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    InkWell(
                                      borderRadius: BorderRadius.circular(LATokens.radiusFull),
                                      onTap: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const ProfileScreen()),
                                      ),
                                      child: Tooltip(
                                        message: 'Profile & Settings',
                                        child: Container(
                                          width: 34,
                                          height: 34,
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.22),
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: Colors.white.withValues(alpha: 0.45),
                                            ),
                                          ),
                                          child: Center(
                                            child: Text(
                                              initial,
                                              style: const TextStyle(
                                                fontSize: LATokens.fsSm,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 18),
                                Text(
                                  '${_greeting()}, $firstName',
                                  style: const TextStyle(
                                    fontSize: LATokens.fs2xl,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.5,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "You're on track with your curriculum.",
                                  style: TextStyle(
                                    fontSize: LATokens.fsSm,
                                    color: Colors.white.withValues(alpha: 0.85),
                                  ),
                                ),
                                const SizedBox(height: 20),

                                // Translucent frosted Mastery ring
                                Center(
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(999),
                                    onTap: () => widget.onNavigateTab(1),
                                    child: Container(
                                      width: 148,
                                      height: 148,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Colors.white.withValues(alpha: 0.14),
                                        border: Border.all(
                                          color: Colors.white.withValues(alpha: 0.65),
                                          width: 2,
                                        ),
                                      ),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            'Mastery',
                                            style: TextStyle(
                                              fontSize: LATokens.fsXs,
                                              fontWeight: FontWeight.w500,
                                              color: Colors.white.withValues(alpha: 0.88),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _avgMasteryPct == null
                                                ? '—'
                                                : '${_avgMasteryPct!.round()}%',
                                            style: const TextStyle(
                                              fontSize: 36,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: -1,
                                              color: Colors.white,
                                              height: 1.05,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _totalTrackedConcepts > 0
                                                ? '$_masteredConcepts/$_totalTrackedConcepts mastered'
                                                : 'Start Learning Hub',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.white.withValues(alpha: 0.82),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // White rounded-top content sheet
                      Transform.translate(
                        offset: const Offset(0, -16),
                        child: Container(
                          decoration: BoxDecoration(
                            color: c.bg,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(LATokens.radiusSheet),
                            ),
                          ),
                          padding: LALayout.pagePadding(context, top: 22, bottom: 28),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_continueTopic != null &&
                                  (_continueTopic!['conceptId'] ?? '').toString().isNotEmpty) ...[
                                LACard(
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => LearningHubScreen(
                                        initialConceptId: _continueTopic!['conceptId'].toString(),
                                      ),
                                    ),
                                  ),
                                  borderColor: c.accent.withValues(alpha: 0.35),
                                  padding: const EdgeInsets.all(LATokens.space4),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: c.accentSoft,
                                          borderRadius: BorderRadius.circular(LATokens.radiusMd),
                                        ),
                                        child: Icon(Icons.play_arrow_rounded, color: c.accent),
                                      ),
                                      const SizedBox(width: LATokens.space3),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Continue learning',
                                              style: TextStyle(
                                                fontSize: LATokens.fsXs,
                                                fontWeight: FontWeight.w600,
                                                color: c.accent,
                                              ),
                                            ),
                                            Text(
                                              (_continueTopic!['name'] ?? 'Resume chapter').toString(),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: LATokens.fsMd,
                                                fontWeight: FontWeight.w600,
                                                color: c.text,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(Icons.chevron_right_rounded, color: c.textMuted),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: LATokens.space4),
                              ],

                              // Real Study Time & Sessions row
                              Row(
                                children: [
                                  Expanded(
                                    child: StatTile(
                                      label: 'Study time',
                                      value: _totalMinutesStudied > 0
                                          ? '${_totalMinutesStudied}m'
                                          : '—',
                                      icon: Icons.timer_outlined,
                                      color: c.green,
                                      onTap: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const StudySessionScreen()),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: LATokens.space2),
                                  Expanded(
                                    child: StatTile(
                                      label: 'Sessions',
                                      value: '$_sessionCount',
                                      icon: Icons.check_circle_outline_rounded,
                                      color: c.accent,
                                      onTap: () => Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const StudySessionScreen()),
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: LATokens.space5),

                              const SectionHeader(
                                icon: Icons.grid_view_rounded,
                                title: 'Study workspace',
                              ),
                              const SizedBox(height: LATokens.space2),
                              GridView.count(
                                crossAxisCount: 2,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                mainAxisSpacing: LATokens.space2,
                                crossAxisSpacing: LATokens.space2,
                                childAspectRatio: 1.38,
                                children: [
                                  _actionTile(
                                    c,
                                    icon: Icons.chat_bubble_outline_rounded,
                                    title: 'AI Tutor',
                                    subtitle: 'Ask & solve step-by-step',
                                    color: c.accent,
                                    onTap: () => widget.onNavigateTab(2),
                                  ),
                                  _actionTile(
                                    c,
                                    icon: Icons.school_outlined,
                                    title: 'Learning Hub',
                                    subtitle: '7-stage adaptive lessons',
                                    color: c.accent,
                                    onTap: () => widget.onNavigateTab(1),
                                  ),
                                  _actionTile(
                                    c,
                                    icon: Icons.timer_outlined,
                                    title: 'Study Session',
                                    subtitle: 'Focus timer & AI plan',
                                    color: c.green,
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const StudySessionScreen()),
                                    ),
                                  ),
                                  _actionTile(
                                    c,
                                    icon: Icons.calendar_today_rounded,
                                    title: 'Study Planner',
                                    subtitle: 'Schedule & AI replanning',
                                    color: c.amber,
                                    onTap: () => Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const PlannerScreen()),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: LATokens.space5),

                              SectionHeader(
                                icon: Icons.track_changes_rounded,
                                title: 'Recommended next',
                                actionLabel: 'Learning Hub',
                                onAction: () => widget.onNavigateTab(1),
                              ),
                              const SizedBox(height: LATokens.space2),
                              if (_recommendations.isEmpty)
                                EmptyStateView(
                                  icon: Icons.explore_outlined,
                                  title: 'No recommendations yet',
                                  message:
                                      'Complete a chapter in Learning Hub or finish a Study Session to unlock personalized next steps.',
                                  actionLabel: 'Explore Learning Hub',
                                  onAction: () => widget.onNavigateTab(1),
                                )
                              else
                                Column(
                                  children: _recommendations.take(3).map((rec) {
                                    final topic = (rec['topic'] ?? rec['conceptId'] ?? 'Topic').toString();
                                    final subject = (rec['subject'] ?? '').toString();
                                    final reason = (rec['reason'] ?? '').toString();
                                    final conceptId = rec['conceptId']?.toString();
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: LATokens.space2),
                                      child: LACard(
                                        onTap: () {
                                          if (conceptId != null && conceptId.isNotEmpty) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => LearningHubScreen(initialConceptId: conceptId),
                                              ),
                                            );
                                          } else {
                                            widget.onNavigateTab(1);
                                          }
                                        },
                                        padding: const EdgeInsets.all(LATokens.space3),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 36,
                                              height: 36,
                                              decoration: BoxDecoration(
                                                color: c.accentSoft,
                                                borderRadius: BorderRadius.circular(LATokens.radiusSm),
                                              ),
                                              child: Icon(Icons.school_outlined, size: 18, color: c.accent),
                                            ),
                                            const SizedBox(width: LATokens.space3),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    topic,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w600, color: c.text),
                                                  ),
                                                  Text(
                                                    reason.isNotEmpty ? reason : subject,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Icon(Icons.chevron_right_rounded, size: 18, color: c.textMuted),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),

                              if (_recentAssessments.isNotEmpty) ...[
                                const SizedBox(height: LATokens.space5),
                                const SectionHeader(
                                  icon: Icons.assessment_outlined,
                                  title: 'Recent assessments',
                                ),
                                const SizedBox(height: LATokens.space2),
                                ..._recentAssessments.map((q) {
                                  final title = (q['title'] ?? q['topic'] ?? q['subject'] ?? 'Assessment').toString();
                                  final pct = (q['percentage'] is num) ? (q['percentage'] as num).round() : 0;
                                  final passed = q['passed'] == true || pct >= 60;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: LATokens.space2),
                                    child: LACard(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  title,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: TextStyle(fontWeight: FontWeight.w600, color: c.text),
                                                ),
                                                Text(
                                                  '${q['correct'] ?? 0}/${q['totalQ'] ?? 0} correct · ${q['subject'] ?? ''}',
                                                  style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: passed ? c.greenSoft : c.redSoft,
                                              borderRadius: BorderRadius.circular(LATokens.radiusFull),
                                            ),
                                            child: Text(
                                              '$pct%',
                                              style: TextStyle(
                                                fontSize: LATokens.fsSm,
                                                fontWeight: FontWeight.w700,
                                                color: passed ? c.green : c.red,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _actionTile(
    LAColors c, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return LACard(
      onTap: onTap,
      padding: const EdgeInsets.all(LATokens.space3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(LATokens.radiusSm),
            ),
            child: Icon(icon, size: 17, color: color),
          ),
          const Spacer(),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w600, color: c.text),
          ),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
          ),
        ],
      ),
    );
  }
}
