import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';

class ChapterNode extends StatelessWidget {
  final Chapter chapter; final ChapterProgress? progress; final bool isCurrent; final VoidCallback onTap;
  const ChapterNode({super.key, required this.chapter, required this.progress, required this.isCurrent, required this.onTap});
  @override
  Widget build(BuildContext context){
    final state=progress?.state ?? ArenaState.locked;
    final icon = state==ArenaState.locked? '🔒': state==ArenaState.available? '⚔': state==ArenaState.inProgress? '🔥': state==ArenaState.mastered? '🏆':'✅';
    Color border=Colors.white10;
    Color? bg;
    if(isCurrent){ border=const Color(0xFF0EA5E9).withOpacity(0.45); bg=const Color(0xFF0EA5E9).withOpacity(0.06); }
    else if(state==ArenaState.defeated){ border=const Color(0xFF10B981).withOpacity(0.35); }
    else if(state==ArenaState.mastered){ border=const Color(0xFFF59E0B).withOpacity(0.38); }
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(color: bg?? const Color(0xFF0F1324), borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
        padding: const EdgeInsets.symmetric(horizontal:12, vertical:11),
        child: Row(children:[
          Container(width:36,height:36,decoration: BoxDecoration(
            color: state==ArenaState.locked? const Color(0xFF1E2436): state==ArenaState.available? const Color(0xFF0EA5E9): state==ArenaState.inProgress? const Color(0xFFF59E0B): state==ArenaState.mastered? const Color(0xFFF59E0B): const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(10),
          ), child: Center(child: Text(icon, style: const TextStyle(fontSize:14)))),
          const SizedBox(width:10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children:[
            Text(chapter.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize:12), maxLines:1, overflow: TextOverflow.ellipsis),
            Text('${chapter.topic} · ${chapter.difficultyLabel}', style: const TextStyle(color: Colors.white54, fontSize:10), maxLines:1, overflow: TextOverflow.ellipsis),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children:[
            Container(padding: const EdgeInsets.symmetric(horizontal:7, vertical:3), decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white10)), child: Text(chapter.difficultyLabel, style: const TextStyle(color: Colors.white54, fontSize:9, fontWeight: FontWeight.w700))),
            if(progress!=null && progress!.bestScore>0) Padding(padding: const EdgeInsets.only(top:3), child: Text('${(progress!.bestScore*100).round()}%', style: const TextStyle(color: Colors.white38, fontSize:10, fontFamily: 'monospace'))),
          ]),
        ]),
      ),
    );
  }
}
