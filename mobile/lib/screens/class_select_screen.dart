import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import 'subject_select_screen.dart';

class ClassSelectScreen extends StatelessWidget {
  final ArenaTrack track;

  const ClassSelectScreen({super.key, required this.track});

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(track.label)),
      body: ListView(
        padding: LALayout.pagePadding(context, top: 8, bottom: 32),
        children: [
          Text('Select your class', style: LATypo.screenTitle(c)),
          const SizedBox(height: LATokens.space4),
          LAGroupedList(
            children: [9, 10, 11, 12].map((cls) {
              return LAListRow(
                title: 'Class $cls',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SubjectSelectScreen(track: track, classNum: cls),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
