import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import 'subject_select_screen.dart';

class ClassSelectScreen extends StatefulWidget {
  final ArenaTrack track;
  const ClassSelectScreen({super.key, required this.track});
  @override State<ClassSelectScreen> createState()=> _ClassSelectScreenState();
}
class _ClassSelectScreenState extends State<ClassSelectScreen> {
  int? selected;
  @override
  Widget build(BuildContext context){
    return Scaffold(
      appBar: AppBar(title: Text('${widget.track.label} — Choose Class'), backgroundColor: Colors.transparent, elevation:0),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Wrap(spacing:8, runSpacing:8, children:[
          for(final c in [9,10,11,12])
            ChoiceChip(
              label: Text('Class $c'),
              selected: selected==c,
              onSelected: (_){
                setState(()=> selected=c);
                Future.delayed(const Duration(milliseconds:160), (){
                  if(!mounted) return;
                  Navigator.push(context, MaterialPageRoute(builder: (_)=> SubjectSelectScreen(track: widget.track, classNum: c)));
                });
              },
              selectedColor: const Color(0xFF0EA5E9),
              labelStyle: TextStyle(color: selected==c? Colors.white: Colors.white70, fontWeight: FontWeight.w600),
              backgroundColor: const Color(0xFF141A33),
              side: BorderSide(color: Colors.white.withOpacity(0.08)),
            ),
        ]),
      ),
    );
  }
}
