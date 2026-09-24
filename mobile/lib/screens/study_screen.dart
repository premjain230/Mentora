import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../widgets/app_drawer.dart';

class StudyScreen extends StatelessWidget {
  const StudyScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'study'),
      appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: const Text('Study', style: TextStyle(fontFamily: LearningAlliedTokens.fontDisplay, fontWeight: FontWeight.w700)), backgroundColor: Colors.transparent, elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusXl), border: Border.all(color: Colors.white.withOpacity(0.06))), child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Continue learning', style: TextStyle(fontWeight: FontWeight.w700, color: LearningAlliedTokens.textPrimary)), SizedBox(height: 8), Text('Your curriculum, lessons and progress sync with web — same Learning Allied, same mastery.', style: TextStyle(color: LearningAlliedTokens.textSecondary, fontSize: 12, height: 1.5))])),
        const SizedBox(height: 12),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))), child: Row(children: [Container(width: 40, height: 40, decoration: BoxDecoration(color: LearningAlliedTokens.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.play_arrow_rounded, color: LearningAlliedTokens.accent)), SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Science — Laws of Motion', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: LearningAlliedTokens.textPrimary)), Text('Study • 4 lessons • 1 quiz', style: TextStyle(color: LearningAlliedTokens.textMuted, fontSize: 11))])), Icon(Icons.arrow_forward_ios_rounded, size: 14, color: LearningAlliedTokens.textMuted)])),
      ]),
    );
  }
}
