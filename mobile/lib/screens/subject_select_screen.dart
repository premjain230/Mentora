import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../widgets/app_drawer.dart';
import 'subject_map_screen.dart';

class SubjectSelectScreen extends StatelessWidget {
  final ArenaTrack track; final int? classNum;
  const SubjectSelectScreen({super.key, required this.track, required this.classNum});
  @override
  Widget build(BuildContext context){
    final subjects=getSubjectsForTrack(track.id, classNum);
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'arena'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: Text(classNum!=null? 'Class $classNum — Choose Subject':'${track.label} — Choose Subject'), backgroundColor: Colors.transparent, elevation:0),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:2, crossAxisSpacing:12, mainAxisSpacing:12, childAspectRatio:1.35),
        itemCount: subjects.length,
        itemBuilder: (c,i){
          final s=subjects[i];
          final ch=getChapters(track.id, s, classNum);
          return InkWell(
            onTap: ()=> Navigator.push(context, MaterialPageRoute(builder: (_)=> SubjectMapScreen(track: track, classNum: classNum, subject: s))),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              decoration: BoxDecoration(color: const Color(0xFF0F1324), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white10)),
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children:[
                Text(s, style: const TextStyle(fontWeight: FontWeight.w700, fontSize:14)),
                const SizedBox(height:4),
                Text('${ch.length} chapters', style: const TextStyle(color: Colors.white54, fontSize:11)),
                if(ch.isNotEmpty) Padding(padding: const EdgeInsets.only(top:6), child: Text(ch.first.name, style: const TextStyle(color: Colors.white38, fontSize:10), maxLines:1, overflow: TextOverflow.ellipsis)),
              ]),
            ),
          );
        },
      ),
    );
  }
}
