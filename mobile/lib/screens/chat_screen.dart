import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../widgets/app_drawer.dart';

class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'chat'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: const Text('Chat', style: TextStyle(fontFamily: LearningAlliedTokens.fontDisplay, fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent, elevation: 0,
      ),
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(width: 28, height: 28, decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.06))), child: const Center(child: Text('A', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: LearningAlliedTokens.textMuted)))),
                const SizedBox(width: 10),
                Expanded(child: Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))), child: const Text('Hi! I’m Learning Allied — your study companion. Ask me anything about Physics, Chemistry, Maths or your syllabus.', style: TextStyle(color: LearningAlliedTokens.textPrimary, fontSize: 13, height: 1.6)))),
              ]),
            ],
          ),
        ),
        Container(
          padding: EdgeInsets.fromLTRB(12, 12, 12, 12 + MediaQuery.of(context).viewPadding.bottom),
          decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06)))),
          child: Row(children: [
            Expanded(child: Container(padding: const EdgeInsets.symmetric(horizontal: 14), decoration: BoxDecoration(color: LearningAlliedTokens.bgElevated, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusFull), border: Border.all(color: Colors.white.withOpacity(0.06))), child: const TextField(decoration: InputDecoration(hintText: 'Ask Learning Allied anything…', hintStyle: TextStyle(color: LearningAlliedTokens.textFaint, fontSize: 13), border: InputBorder.none), style: TextStyle(color: LearningAlliedTokens.textPrimary, fontSize: 13)))),
            const SizedBox(width: 8),
            Container(width: 36, height: 36, decoration: BoxDecoration(color: LearningAlliedTokens.textPrimary, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusMd)), child: const Icon(Icons.arrow_upward_rounded, size: 18, color: LearningAlliedTokens.bgBase)),
          ]),
        ),
      ]),
    );
  }
}
