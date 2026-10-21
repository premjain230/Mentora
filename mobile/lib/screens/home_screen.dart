import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../theme/design_tokens.dart';
import '../theme/app_theme.dart';
import '../widgets/app_components.dart';
import '../widgets/app_drawer.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _greetingName = 'there';
  String _userEmail = '';
  int _chats = 0;
  int _streak = 0;
  int _topics = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      setState(() {
        _greetingName = 'there';
        _userEmail = '';
        _loading = false;
      });
      return;
    }
    setState(() {
      _greetingName = (user.displayName ?? user.email?.split('@').first ?? 'there');
      _userEmail = user.email ?? '';
    });

    // Load stats from Firestore
    try {
      final userRef = FirebaseFirestore.instance.doc('users/${user.uid}');
      final snap = await userRef.get();
      if (snap.exists && snap.data() != null) {
        final data = snap.data()!;
        setState(() {
          _streak = (data['streak'] ?? 0) as int;
          _topics = (data['topics'] as List?)?.length ?? 0;
        });
      }
      final chatsSnap = await FirebaseFirestore.instance.collection('users/${user.uid}/chats').get();
      setState(() {
        _chats = chatsSnap.size;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
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
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'home'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.auto_awesome_rounded, size: 20, color: LATokens.accent),
          const SizedBox(width: 8),
          Text('Learning Allied', style: TextStyle(fontFamily: LATokens.fontDisplay, fontWeight: FontWeight.w700)),
        ]),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(LATokens.space4),
              children: [
                // Greeting hero
                Container(
                  padding: const EdgeInsets.all(LATokens.space5),
                  decoration: BoxDecoration(
                    color: dark ? LATokens.bgCard : LATokens.lightBgCard,
                    borderRadius: BorderRadius.circular(LATokens.radiusXl),
                    border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: LATokens.bgElevated,
                              borderRadius: BorderRadius.circular(LATokens.radiusLg),
                              border: Border.all(color: Colors.white.withOpacity(0.06)),
                            ),
                            child: const Icon(Icons.auto_awesome_rounded, color: LATokens.textMuted),
                          ),
                          const SizedBox(width: LATokens.space3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('$_greeting(), $_greetingName', style: const TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                                const SizedBox(height: LATokens.space1),
                                Text('Your AI study companion for JEE, NEET & Board exams. Continue where you left off.', style: const TextStyle(color: LATokens.textSecondary, fontSize: LATokens.fsSm, height: LATokens.lhNormal)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: LATokens.space4),
                      // Stats row
                      Row(
                        children: [
                          _statChip('Chats', _chats.toString(), Icons.chat_bubble_rounded),
                          const SizedBox(width: LATokens.space2),
                          _statChip('Streak', '$_streak days', Icons.local_fire_department_rounded, color: LATokens.amber),
                          const SizedBox(width: LATokens.space2),
                          _statChip('Topics', _topics.toString(), Icons.school_rounded),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space4),
                // Suggestions
                const Text('Quick actions', style: TextStyle(fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                const SizedBox(height: LATokens.space2),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: LATokens.space2,
                  crossAxisSpacing: LATokens.space2,
                  childAspectRatio: 1.55,
                  children: [
                    _suggestionCard('Explain a concept', 'Get a clear explanation', Icons.lightbulb_rounded, LATokens.accent),
                    _suggestionCard('Practice quiz', 'Test your knowledge', Icons.quiz_rounded, LATokens.green),
                    _suggestionCard('Study plan', 'Personalized roadmap', Icons.calendar_month_rounded, LATokens.accent2),
                    _suggestionCard('Arena', 'Enter the battlefield', Icons.sports_esports_rounded, LATokens.amber),
                  ],
                ),
                const SizedBox(height: LATokens.space4),
                // Continue learning
                const Text('Continue learning', style: TextStyle(fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                const SizedBox(height: LATokens.space2),
                Container(
                  padding: const EdgeInsets.all(LATokens.space3),
                  decoration: BoxDecoration(
                    color: dark ? LATokens.bgCard : LATokens.lightBgCard,
                    borderRadius: BorderRadius.circular(LATokens.radiusLg),
                    border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: LATokens.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusMd)),
                        child: const Icon(Icons.play_arrow_rounded, color: LATokens.accent),
                      ),
                      const SizedBox(width: LATokens.space3),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Science — Laws of Motion', style: TextStyle(fontWeight: FontWeight.w600, fontSize: LATokens.fsSm, color: LATokens.textPrimary)),
                            Text('Continue • 40% completed', style: TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs)),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: LATokens.textMuted),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space6),
              ],
            ),
          );
  }

  Widget _statChip(String label, String value, IconData icon, {Color? color}) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final c = color ?? LATokens.accent;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(LATokens.space2),
        decoration: BoxDecoration(
          color: dark ? LATokens.bgElevated : LATokens.lightBgCardHover,
          borderRadius: BorderRadius.circular(LATokens.radiusMd),
          border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusSm)),
                  child: Icon(icon, size: 14, color: c),
                ),
                const Spacer(),
                Text(value, style: const TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
              ],
            ),
            const SizedBox(height: LATokens.space1),
            Text(label, style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _suggestionCard(String title, String desc, IconData icon, Color color) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(LATokens.space3),
      decoration: BoxDecoration(
        color: dark ? LATokens.bgCard : LATokens.lightBgCard,
        borderRadius: BorderRadius.circular(LATokens.radiusLg),
        border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusSm)),
            child: Icon(icon, size: 14, color: color),
          ),
          const Spacer(),
          Text(title, style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: LATokens.textPrimary)),
          Text(desc, style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
        ],
      ),
    );
  }
}
