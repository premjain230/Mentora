import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import 'class_select_screen.dart';
import 'subject_select_screen.dart';

class ArenaLandingScreen extends StatelessWidget {
  const ArenaLandingScreen({super.key});

  void _select(BuildContext context, ArenaTrack track) {
    if (track.id == 'maharashtra' || track.id == 'cbse') {
      Navigator.push(context, MaterialPageRoute(builder: (_) => ClassSelectScreen(track: track)));
    } else {
      Navigator.push(context, MaterialPageRoute(builder: (_) => SubjectSelectScreen(track: track, classNum: null)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Arena')),
      body: ListView(
        padding: LALayout.pagePadding(context, top: 8, bottom: 32),
        children: [
          Text(
            'Choose your battlefield',
            style: LATypo.screenTitle(c),
          ),
          const SizedBox(height: 6),
          Text(
            'Complete chapters in sequence to unlock the Final Boss. Progress syncs across web and mobile.',
            style: LATypo.secondary(c),
          ),
          const SizedBox(height: LATokens.space5),
          LAGroupedList(
            children: arenaTracks.map((t) {
              return LAListRow(
                icon: Icons.shield_outlined,
                iconColor: c.accent,
                title: t.label,
                subtitle: t.subtitle,
                onTap: () => _select(context, t),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
