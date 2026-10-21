import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/app_drawer.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _name = 'Student';
  String _email = '–';
  String _photoUrl = '';
  int _chats = 0;
  int _streak = 0;
  int _topics = 0;
  bool _isLight = false;
  String _personality = 'mentor';
  String _letter = '';
  String _letterDate = '';
  bool _loading = true;
  final List<Map<String, dynamic>> _personalities = const [
    {'id': 'mentor', 'emoji': '🧭', 'name': 'Mentor', 'desc': 'Wise and experienced, guides you with patience and deep knowledge.'},
    {'id': 'friendly', 'emoji': '🤝', 'name': 'Friendly Companion', 'desc': 'Warm and supportive, like a study buddy.'},
    {'id': 'motivator', 'emoji': '⚡', 'name': 'Motivator', 'desc': 'High energy, pushes you to do your best.'},
    {'id': 'deep-thinker', 'emoji': '🧠', 'name': 'Deep Thinker', 'desc': 'Philosophical and analytical.'},
    {'id': 'coach', 'emoji': '🎯', 'name': 'Coach', 'desc': 'Goal-oriented and structured.'},
    {'id': 'calm-guide', 'emoji': '🌿', 'name': 'Calm Guide', 'desc': 'Soothing and gentle.'},
    {'id': 'inspirational', 'emoji': '✨', 'name': 'Inspirational', 'desc': 'Uplifting and visionary.'},
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = FirebaseAuth.instance.currentUser;
    final tp = context.read<ThemeProvider>();
    await tp.load();
    if (mounted) {
      setState(() {
        _name = user?.displayName ?? user?.email?.split('@').first ?? 'Student';
        _email = user?.email ?? '–';
        _photoUrl = user?.photoURL ?? '';
        _isLight = tp.isLight;
        _loading = false;
      });
      _loadUserStats(user?.uid);
    }
  }

  Future<void> _loadUserStats(String? uid) async {
    if (uid == null) return;
    try {
      final snap = await FirebaseFirestore.instance.doc('users/$uid').get();
      if (snap.exists && snap.data() != null) {
        final data = snap.data()!;
        final chatsSnap = await FirebaseFirestore.instance.collection('users/$uid/chats').get();
        setState(() {
          _chats = chatsSnap.size;
          _streak = (data['streak'] ?? 0) as int;
          _topics = (data['topics'] as List?)?.length ?? 0;
          _personality = data['personality'] ?? 'mentor';
          _letter = data['futureMeLetter'] ?? '';
          _letterDate = data['futureMeLetterDate'] ?? '';
        });
      }
    } catch (e) {
      // ignore
    }
  }

  void _toggleTheme(bool light) {
    context.read<ThemeProvider>().setLight(light);
    setState(() => _isLight = light);
  }

  void _selectPersonality(String id) {
    setState(() => _personality = id);
    LAToast.show(context, 'Personality saved: ${_personalities.firstWhere((p) => p['id'] == id)['name']}');
    _savePersonality(id);
  }

  Future<void> _savePersonality(String id) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      await FirebaseFirestore.instance.doc('users/${user.uid}').set({'personality': id, 'updatedAt': FieldValue.serverTimestamp()}, SetOptions(merge: true));
    } catch (_) {}
  }

  void _generateLetter() {
    final now = DateTime.now();
    setState(() {
      _letter = 'Dear $_name,\n\nI\'m writing from your future self — the version of you who has already achieved your academic dreams. Looking back, I want you to know that every late night, every difficult problem, and every moment of doubt was worth it.\n\nKeep going. Your streak of $_streak days shows you have the discipline to succeed. The topics you\'re mastering right now are building the foundation for everything that comes next.\n\nYou started this journey for a reason. Remember why.\n\nWith pride,\nYour Future Self';
      _letterDate = '${now.month}/${now.day}/${now.year}';
    });
    LAToast.show(context, 'Your letter is ready');
    _saveLetter(_letter, _letterDate);
  }

  Future<void> _saveLetter(String letter, String date) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      await FirebaseFirestore.instance.doc('users/${user.uid}').set({
        'futureMeLetter': letter,
        'futureMeLetterDate': date,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'profile'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: const Text('Profile', style: TextStyle(fontFamily: LATokens.fontDisplay, fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(LATokens.space4),
              children: [
                SectionHeader(icon: Icons.person_rounded, title: 'Your profile'),
                const SizedBox(height: LATokens.space2),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: LATokens.accent,
                      backgroundImage: _photoUrl.isNotEmpty ? NetworkImage(_photoUrl) : null,
                      child: _photoUrl.isEmpty ? Text(_name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 24)) : null,
                    ),
                    const SizedBox(width: LATokens.space3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_name, style: const TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w600, color: LATokens.textPrimary, height: 1.2)),
                          const SizedBox(height: LATokens.space1),
                          Text(_email, style: const TextStyle(fontSize: LATokens.fsSm, color: LATokens.textSecondary)),
                          const SizedBox(height: LATokens.space2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: LATokens.space2, vertical: 2.0),
                            decoration: BoxDecoration(color: LATokens.green.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusFull), border: Border.all(color: LATokens.green.withOpacity(0.3))),
                            child: const Text('Free plan', style: TextStyle(color: LATokens.green, fontSize: LATokens.fsXs, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: LATokens.space4),
                Row(
                  children: [
                    _statCard('Chats', _chats.toString(), Icons.chat_bubble_rounded),
                    const SizedBox(width: LATokens.space2),
                    _statCard('Day streak', '$_streak', Icons.local_fire_department_rounded, color: LATokens.amber),
                    const SizedBox(width: LATokens.space2),
                    _statCard('Topics', _topics.toString(), Icons.school_rounded),
                  ],
                ),
                const SizedBox(height: LATokens.space4),
                SectionHeader(icon: Icons.brightness_6_rounded, title: 'Appearance'),
                const SizedBox(height: LATokens.space2),
                LACard(
                  child: Row(
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Light theme', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: LATokens.textPrimary)),
                            const SizedBox(height: 2.0),
                            Text('Switch between light and dark.', style: TextStyle(fontSize: LATokens.fsXs, color: LATokens.textSecondary)),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isLight,
                        onChanged: _toggleTheme,
                        activeColor: LATokens.accent,
                        activeTrackColor: LATokens.accentSoft,
                        inactiveThumbColor: LATokens.textMuted,
                        inactiveTrackColor: LATokens.border,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space4),
                SectionHeader(icon: Icons.psychology_rounded, title: 'AI personality'),
                const SizedBox(height: LATokens.space2),
                const Text('Choose how your AI companion sounds. This changes the tone of every chat.', style: TextStyle(fontSize: LATokens.fsXs, color: LATokens.textSecondary)),
                const SizedBox(height: LATokens.space2),
                Wrap(
                  spacing: LATokens.space1,
                  runSpacing: LATokens.space1,
                  children: _personalities.map((p) {
                    final selected = _personality == p['id'];
                    return GestureDetector(
                      onTap: () => _selectPersonality(p['id']),
                      child: Container(
                        padding: const EdgeInsets.all(LATokens.space2),
                        decoration: BoxDecoration(
                          color: selected ? LATokens.accentSoft : (dark ? LATokens.bgCard : LATokens.lightBgCard),
                          borderRadius: BorderRadius.circular(LATokens.radiusMd),
                          border: Border.all(color: selected ? LATokens.accent : (dark ? LATokens.border : LATokens.lightBorder)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(p['emoji'], style: const TextStyle(fontSize: LATokens.fsLg)),
                                const SizedBox(width: LATokens.space1),
                                if (selected) const Icon(Icons.check_circle, size: 16, color: LATokens.accent),
                              ],
                            ),
                            const SizedBox(height: LATokens.space1),
                            Text(p['name'], style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: LATokens.textPrimary)),
                            Text(p['desc'], style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted, height: 1.4)),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: LATokens.space4),
                SectionHeader(icon: Icons.mail_rounded, title: 'A letter from future you'),
                const SizedBox(height: LATokens.space2),
                const Text('A note of encouragement written from the version of you who made it.', style: TextStyle(fontSize: LATokens.fsXs, color: LATokens.textSecondary)),
                const SizedBox(height: LATokens.space2),
                LACard(
                  padding: const EdgeInsets.all(LATokens.space3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_letter.isEmpty)
                        Column(
                          children: [
                            const Icon(Icons.mail_outline, size: 28, color: LATokens.textMuted),
                            const SizedBox(height: LATokens.space2),
                            const Text('No letter yet. Generate one to hear from your future self.', style: TextStyle(color: LATokens.textSecondary, fontSize: LATokens.fsBase, height: LATokens.lhNormal), textAlign: TextAlign.center),
                          ],
                        )
                      else ...[
                        Text(_letter, style: const TextStyle(fontSize: LATokens.fsBase, color: LATokens.textPrimary, height: LATokens.lhRelaxed)),
                        const SizedBox(height: LATokens.space2),
                        Text(_letterDate, style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted, fontStyle: FontStyle.italic)),
                      ],
                      const SizedBox(height: LATokens.space3),
                      SizedBox(
                        width: double.infinity,
                        child: LAButton(
                          text: _letter.isEmpty ? 'Generate letter' : 'Generate new letter',
                          icon: Icons.mail_rounded,
                          onPressed: _generateLetter,
                          type: ButtonType.primary,
                          fullWidth: true,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space6),
              ],
            ),
          );
  }

  Widget _statCard(String label, String value, IconData icon, {Color? color}) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final c = color ?? LATokens.accent;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(LATokens.space3),
        decoration: BoxDecoration(
          color: dark ? LATokens.bgCard : LATokens.lightBgCard,
          borderRadius: BorderRadius.circular(LATokens.radiusLg),
          border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusMd)),
                  child: Icon(icon, size: 16, color: c),
                ),
                const Spacer(),
                Text(value, style: const TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w600, color: LATokens.textPrimary)),
              ],
            ),
            const SizedBox(height: LATokens.space1),
            Text(label, style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  const SectionHeader({super.key, required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(color: LATokens.accentSoft, borderRadius: BorderRadius.circular(LATokens.radiusSm)),
          child: Icon(icon, size: 16, color: LATokens.accent),
        ),
        const SizedBox(width: LATokens.space2),
        Text(title, style: const TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w600, color: LATokens.textPrimary)),
      ],
    );
  }
}
