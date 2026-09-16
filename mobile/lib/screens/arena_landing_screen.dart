import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import 'class_select_screen.dart';
import 'subject_select_screen.dart';

class ArenaLandingScreen extends StatelessWidget {
  const ArenaLandingScreen({super.key});
  void _select(BuildContext context, ArenaTrack track){
    if(track.id=='maharashtra' || track.id=='cbse'){
      Navigator.push(context, MaterialPageRoute(builder: (_)=> ClassSelectScreen(track: track)));
    } else {
      Navigator.push(context, MaterialPageRoute(builder: (_)=> SubjectSelectScreen(track: track, classNum: null)));
    }
  }
  @override
  Widget build(BuildContext context){
    return Scaffold(
      appBar: AppBar(title: const Row(children:[Text('⚔ '), Text('ARENA', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5))]), centerTitle:true, backgroundColor: Colors.transparent, elevation:0),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16,8,16,24),
        children:[
          const Center(child: Column(children:[Text('Choose your battlefield', style: TextStyle(color: Colors.white70, fontSize:13)), SizedBox(height:4), Text('The syllabus is the game. Defeat chapters. Conquer the subject.', style: TextStyle(color: Colors.white38, fontSize:11))])),
          const SizedBox(height:16),
          GridView.builder(
            shrinkWrap:true, physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:2, crossAxisSpacing:12, mainAxisSpacing:12, childAspectRatio:1.25),
            itemCount: arenaTracks.length,
            itemBuilder: (c,i){
              final t=arenaTracks[i];
              return _BattleCard(track:t, onTap: ()=> _select(context,t));
            },
          ),
          const SizedBox(height:14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFF0F1324), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white10)),
            child: const Row(children:[
              Icon(Icons.sync, color: Colors.white54, size:16),
              SizedBox(width:8),
              Expanded(child: Text('Progress syncs instantly with web — defeat a chapter on phone, see it on desktop.', style: TextStyle(color: Colors.white54, fontSize:11))),
            ]),
          ),
        ],
      ),
    );
  }
}

class _BattleCard extends StatefulWidget {
  final ArenaTrack track; final VoidCallback onTap;
  const _BattleCard({required this.track, required this.onTap});
  @override State<_BattleCard> createState()=> _BattleCardState();
}
class _BattleCardState extends State<_BattleCard> {
  bool _pressed=false;
  @override
  Widget build(BuildContext context){
    return GestureDetector(
      onTapDown: (_)=> setState(()=> _pressed=true),
      onTapUp: (_)=> setState(()=> _pressed=false),
      onTapCancel: ()=> setState(()=> _pressed=false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed?0.98:1.0, duration: const Duration(milliseconds:120),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F1324),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.06)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.35), blurRadius:12, offset: const Offset(0,4))],
          ),
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children:[
            Row(children:[
              Container(width:38,height:38,decoration: BoxDecoration(gradient: LinearGradient(colors:[_hex(widget.track.color), const Color(0xFF6366F1)]), borderRadius: BorderRadius.circular(12)), child: Center(child: Text(widget.track.icon, style: const TextStyle(color:Colors.white, fontWeight: FontWeight.w800)))),
              const SizedBox(width:8),
              Expanded(child: Text(widget.track.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize:13))),
            ]),
            const SizedBox(height:8),
            Text(widget.track.subtitle, style: const TextStyle(color: Colors.white54, fontSize:11, height:1.4)),
            const Spacer(),
            const Row(children:[Text('Enter Battlefield', style: TextStyle(color: Colors.white, fontSize:11, fontWeight: FontWeight.w600)), SizedBox(width:4), Icon(Icons.arrow_forward, size:12, color: Colors.white)]),
          ]),
        ),
      ),
    );
  }
  Color _hex(String hex){
    final h=hex.replaceAll('#','');
    return Color(int.parse('FF$h', radix:16));
  }
}
