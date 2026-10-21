import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/app_drawer.dart';

class StudySessionScreen extends StatefulWidget {
  const StudySessionScreen({super.key});

  @override
  State<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends State<StudySessionScreen> {
  int _minutes = 25;
  int _seconds = 0;
  bool _running = false;
  int _sessionsCompleted = 0;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'study_session'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: const Text('Study Session', style: TextStyle(fontFamily: LATokens.fontDisplay, fontWeight: FontWeight.w700)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.all(LATokens.space4),
        children: [
          const Text('Focus timer', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          const SizedBox(height: LATokens.space2),
          const Text('Pomodoro-style timer to help you stay focused', style: TextStyle(color: LATokens.textSecondary, fontSize: LATokens.fsSm)),
          const SizedBox(height: LATokens.space4),
          Container(
            padding: const EdgeInsets.all(LATokens.space5),
            decoration: BoxDecoration(
              color: dark ? LATokens.bgCard : LATokens.lightBgCard,
              borderRadius: BorderRadius.circular(LATokens.radiusXl),
              border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
            ),
            child: Column(
              children: [
                Text('${_minutes.toString().padLeft(2, '0')}:${_seconds.toString().padLeft(2, '0')}', style: const TextStyle(fontFamily: LATokens.fontMono, fontSize: 48, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                const SizedBox(height: LATokens.space4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _timerButton('Start', Icons.play_arrow_rounded, _running ? false : true, LATokens.green, () => setState(() => _running = true)),
                    _timerButton('Pause', Icons.pause_rounded, _running ? true : false, LATokens.amber, () => setState(() => _running = false)),
                    _timerButton('Reset', Icons.refresh_rounded, true, LATokens.accent3, () => setState(() { _running = false; _minutes = 25; _seconds = 0; })),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: LATokens.space4),
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
                  child: const Icon(Icons.local_fire_department_rounded, color: LATokens.accent),
                ),
                const SizedBox(width: LATokens.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Sessions completed', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: LATokens.fsSm, color: LATokens.textPrimary)),
                      Text('Pomodoro cycles finished today', style: const TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs)),
                    ],
                  ),
                ),
                Text('$_sessionsCompleted', style: const TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
              ],
            ),
          ),
          const SizedBox(height: LATokens.space6),
        ],
      ),
    );
  }

  Widget _timerButton(String label, IconData icon, bool enabled, Color color, VoidCallback onTap) {
    return Expanded(
      child: LAButton(
        text: label,
        icon: icon,
        onPressed: enabled ? onTap : null,
        type: ButtonType.secondary,
        fullWidth: true,
      ),
    );
  }
}
