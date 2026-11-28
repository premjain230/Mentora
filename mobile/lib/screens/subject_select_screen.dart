import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import 'subject_map_screen.dart';

class SubjectSelectScreen extends StatelessWidget {
  final ArenaTrack track;
  final int? classNum;

  const SubjectSelectScreen({
    super.key,
    required this.track,
    required this.classNum,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final subjects = getSubjectsForTrack(track.id, classNum);
    return Scaffold(
      appBar: AppBar(
        title: Text(classNum != null ? 'Class $classNum' : track.label),
      ),
      body: ListView(
        padding: LALayout.pagePadding(context, top: 8, bottom: 32),
        children: [
          Text('Select a subject', style: LATypo.screenTitle(c)),
          const SizedBox(height: LATokens.space4),
          LAGroupedList(
            children: subjects.map((s) {
              final ch = getChapters(track.id, s, classNum);
              final subtitle = ch.isNotEmpty
                  ? '${ch.length} chapters · Starts with ${ch.first.name}'
                  : '${ch.length} chapters';
              return LAListRow(
                title: s,
                subtitle: subtitle,
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SubjectMapScreen(track: track, classNum: classNum, subject: s),
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
