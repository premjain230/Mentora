import 'package:flutter/material.dart';
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
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (mounted) {
      setState(() {
        _greetingName = 'Student';
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
                      Row(
                        children: [
                          _statChip('Chats', '0', Icons.chat_bubble_rounded),
                          const SizedBox(width: LATokens.space2),
                          _statChip('Streak', '0 days', Icons.local_fire_department_rounded, color: LATokens.amber),
                          const SizedBox(width: LATokens.space2),
                          _statChip('Topics', '0', Icons.school_rounded),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space4),
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
