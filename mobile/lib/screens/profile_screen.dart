import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import 'onboarding_screen.dart';
import 'settings_screen.dart';
import 'subscription_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  bool _generatingLetter = false;

  bool _isPro = false;
  int _chatCount = 0;
  int _conceptCount = 0;
  int _streak = 0;
  String _personality = 'mentor';
  String _letter = '';
  String _letterDate = '';
  Map<String, dynamic>? _learningProfile;

  static const _personalities = [
    {'id': 'mentor', 'icon': Icons.explore_outlined, 'name': 'Mentor', 'desc': 'Wise and patient guidance'},
    {'id': 'friendly', 'icon': Icons.handshake_outlined, 'name': 'Friendly', 'desc': 'Warm study companion'},
    {'id': 'motivator', 'icon': Icons.bolt_rounded, 'name': 'Motivator', 'desc': 'High energy & drive'},
    {'id': 'deep-thinker', 'icon': Icons.psychology_outlined, 'name': 'Deep Thinker', 'desc': 'First-principles analysis'},
    {'id': 'coach', 'icon': Icons.track_changes_rounded, 'name': 'Coach', 'desc': 'Goal-oriented & direct'},
    {'id': 'calm-guide', 'icon': Icons.spa_outlined, 'name': 'Calm Guide', 'desc': 'Steady and reassuring'},
    {'id': 'inspirational', 'icon': Icons.lightbulb_outline_rounded, 'name': 'Inspirational', 'desc': 'Uplifting & visionary'},
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final fs = FirestoreService(auth);

      final results = await Future.wait<dynamic>([
        fs.getDoc('users/$uid').catchError((_) => null),
        fs.getDoc('users/$uid/learning/profile').catchError((_) => null),
        fs.getDoc('entitlements/$uid').catchError((_) => null),
        fs.listDocs('users/$uid/chats', pageSize: 50).catchError((_) => <Map<String, dynamic>>[]),
        fs.listDocs('users/$uid/mastery', pageSize: 50).catchError((_) => <Map<String, dynamic>>[]),
        fs.getDoc('progress/$uid').catchError((_) => null),
      ]);

      final userDoc = results[0] as Map<String, dynamic>?;
      final learnDoc = results[1] as Map<String, dynamic>?;
      final entDoc = results[2] as Map<String, dynamic>?;
      final chats = results[3] as List<Map<String, dynamic>>;
      final mastery = results[4] as List<Map<String, dynamic>>;
      final progDoc = results[5] as Map<String, dynamic>?;

      if (!mounted) return;
      setState(() {
        _learningProfile = learnDoc;
        _isPro = entDoc != null && entDoc['plan'] == 'pro' && entDoc['status'] != 'revoked';
        _chatCount = chats.length;
        _conceptCount = mastery.length;
        _streak = (progDoc?['currentStreak'] is num)
            ? (progDoc!['currentStreak'] as num).toInt()
            : ((userDoc?['streak'] is num) ? (userDoc!['streak'] as num).toInt() : 0);
        _personality = (learnDoc?['personality'] ?? userDoc?['personality'] ?? 'mentor').toString();
        _letter = (userDoc?['futureMeLetter'] ?? '').toString();
        _letterDate = (userDoc?['futureMeLetterDate'] ?? '').toString();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectPersonality(String id) async {
    setState(() => _personality = id);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final fs = FirestoreService(auth);
      await Future.wait([
        fs.setDoc('users/$uid', {'personality': id}),
        fs.setDoc('users/$uid/learning/profile', {'personality': id}),
      ]);
      if (mounted) LAToast.show(context, 'AI personality updated', isSuccess: true);
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed to save: $e', isError: true);
    }
  }

  Future<void> _generateFutureLetter() async {
    setState(() => _generatingLetter = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      final name = (auth.user?.displayName ?? '').trim().isNotEmpty ? auth.user!.displayName : 'Student';
      final goal = (_learningProfile?['academicGoal'] ?? 'achieving your academic goals').toString();
      final svc = LearningService(ApiClient(auth));

      final text = await svc.completePrompt(
        messages: [
          {
            'role': 'system',
            'content': 'Write a warm, grounded, encouraging 150-word letter from the student\'s future self who has succeeded in $goal. Address them as $name.',
          },
          {
            'role': 'user',
            'content': 'Write my letter from future me. Current streak: $_streak days, concepts tracked: $_conceptCount.',
          },
        ],
        maxTokens: 400,
      );

      if (text.trim().isEmpty) throw Exception('Empty response');
      final now = DateTime.now();
      final dateStr = '${now.month}/${now.day}/${now.year}';
      if (uid != null) {
        await FirestoreService(auth).setDoc('users/$uid', {
          'futureMeLetter': text.trim(),
          'futureMeLetterDate': dateStr,
        });
      }
      if (!mounted) return;
      setState(() {
        _letter = text.trim();
        _letterDate = dateStr;
        _generatingLetter = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _generatingLetter = false);
      LAToast.show(context, 'Failed to generate letter: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final user = context.watch<AuthService>().user;
    final name = (user?.displayName ?? '').trim().isNotEmpty ? user!.displayName : 'Student';
    final email = user?.email ?? '—';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(LATokens.space4),
                children: [
                  LACard(
                    padding: const EdgeInsets.all(LATokens.space4),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: c.accent,
                          child: Text(
                            name[0].toUpperCase(),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22),
                          ),
                        ),
                        const SizedBox(width: LATokens.space3),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: c.text)),
                              Text(email, style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary)),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: _isPro ? c.accentSoft : c.greenSoft,
                                  borderRadius: BorderRadius.circular(LATokens.radiusFull),
                                ),
                                child: Text(
                                  _isPro ? 'Pro Plan' : 'Free Plan',
                                  style: TextStyle(
                                    fontSize: LATokens.fsXs,
                                    fontWeight: FontWeight.w600,
                                    color: _isPro ? c.accent : c.green,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: LATokens.space3),

                  Row(
                    children: [
                      Expanded(child: StatTile(label: 'Chats', value: '$_chatCount', icon: Icons.chat_bubble_outline_rounded)),
                      const SizedBox(width: 8),
                      Expanded(child: StatTile(label: 'Streak', value: '${_streak}d', icon: Icons.local_fire_department_rounded, color: c.amber)),
                      const SizedBox(width: 8),
                      Expanded(child: StatTile(label: 'Concepts', value: '$_conceptCount', icon: Icons.school_outlined, color: c.green)),
                    ],
                  ),
                  const SizedBox(height: LATokens.space4),

                  // Quick links
                  LAGroupedList(
                    children: [
                      LAListRow(
                        icon: Icons.tune_rounded,
                        iconColor: c.accent,
                        title: 'Academic Profile',
                        subtitle: _learningProfile?['trackName']?.toString() ?? 'Configure curriculum, grade & subjects',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OnboardingScreen(
                              initialProfile: _learningProfile,
                              onComplete: () {
                                Navigator.pop(context);
                                _load();
                              },
                            ),
                          ),
                        ),
                      ),
                      LAListRow(
                        icon: Icons.workspace_premium_outlined,
                        iconColor: c.amber,
                        title: 'Plan & Daily Usage',
                        subtitle: _isPro ? 'Unlimited access active' : 'View meters or request Pro',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SubscriptionScreen())),
                      ),
                      LAListRow(
                        icon: Icons.settings_outlined,
                        title: 'Settings, AI Memory & Feedback',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
                      ),
                    ],
                  ),

                  const SizedBox(height: LATokens.space5),
                  const SectionHeader(icon: Icons.psychology_outlined, title: 'AI Personality'),
                  const SizedBox(height: 8),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      mainAxisExtent: 64,
                    ),
                    itemCount: _personalities.length,
                    itemBuilder: (_, i) {
                      final p = _personalities[i];
                      final id = p['id'] as String;
                      final selected = _personality == id;
                      return LACard(
                        onTap: () => _selectPersonality(id),
                        backgroundColor: selected ? c.accentSoft : c.surface,
                        borderColor: selected ? c.accent : c.border,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            Icon(
                              p['icon'] as IconData,
                              size: 18,
                              color: selected ? c.accent : c.textSecondary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    p['name'] as String,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: LATokens.fsSm,
                                      fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                                      color: c.text,
                                    ),
                                  ),
                                  Text(
                                    p['desc'] as String,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: c.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: LATokens.space5),
                  const SectionHeader(icon: Icons.mail_outline_rounded, title: 'Letter from Future Me'),
                  const SizedBox(height: 8),
                  LACard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_letter.isEmpty)
                          Text(
                            'Generate a personalized AI note of encouragement written from your future self.',
                            style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary),
                          )
                        else ...[
                          Text(_letter, style: TextStyle(fontSize: LATokens.fsBase, color: c.text, height: LATokens.lhRelaxed)),
                          if (_letterDate.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(_letterDate, style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted)),
                          ],
                        ],
                        const SizedBox(height: LATokens.space3),
                        LAButton(
                          text: _letter.isEmpty ? 'Generate letter' : 'Generate new letter',
                          icon: Icons.edit_note_rounded,
                          loading: _generatingLetter,
                          onPressed: _generateFutureLetter,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: LATokens.space6),
                ],
              ),
            ),
    );
  }
}
