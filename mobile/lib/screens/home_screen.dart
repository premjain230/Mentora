import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../widgets/app_drawer.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'home'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: const Text('Learning Allied', style: TextStyle(fontFamily: LearningAlliedTokens.fontDisplay, fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusXl), border: Border.all(color: Colors.white.withOpacity(0.06))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 48, height: 48, decoration: BoxDecoration(color: LearningAlliedTokens.bgElevated, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))), child: const Icon(Icons.auto_awesome_rounded, color: LearningAlliedTokens.textMuted)),
              const SizedBox(height: 12),
              const Text('Welcome to Learning Allied', style: TextStyle(fontFamily: LearningAlliedTokens.fontDisplay, fontSize: 20, fontWeight: FontWeight.w700, color: LearningAlliedTokens.textPrimary)),
              const SizedBox(height: 6),
              const Text('Your AI study companion for JEE, NEET & Board exams. Continue where you left off.', style: TextStyle(color: LearningAlliedTokens.textSecondary, fontSize: 13, height: 1.5)),
              const SizedBox(height: 16),
              GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.6, children: [
                _suggestion('Explain a concept', 'Get a clear explanation', Icons.lightbulb_rounded),
                _suggestion('Practice quiz', 'Test your knowledge', Icons.quiz_rounded),
                _suggestion('Study plan', 'Personalized roadmap', Icons.calendar_month_rounded),
                _suggestion('Analyze', 'Track your progress', Icons.analytics_rounded),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          const Text('Continue learning', style: TextStyle(fontWeight: FontWeight.w700, color: LearningAlliedTokens.textPrimary)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))),
            child: Row(children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: LearningAlliedTokens.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.play_arrow_rounded, color: LearningAlliedTokens.accent)),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Science — Laws of Motion', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: LearningAlliedTokens.textPrimary)), Text('Continue • 40% completed', style: TextStyle(color: LearningAlliedTokens.textMuted, fontSize: 11))])),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: LearningAlliedTokens.textMuted),
            ]),
          ),
        ],
      ),
    );
  }

  static Widget _suggestion(String title, String desc, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 28, height: 28, decoration: BoxDecoration(color: LearningAlliedTokens.bgElevated, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.06))), child: Icon(icon, size: 14, color: LearningAlliedTokens.textMuted)),
        const Spacer(),
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: LearningAlliedTokens.textPrimary)),
        Text(desc, style: const TextStyle(fontSize: 11, color: LearningAlliedTokens.textMuted)),
      ]),
    );
  }
}
