import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';
import '../services/arena_api.dart';
import '../widgets/app_drawer.dart';
import '../widgets/chapter_node.dart';
import 'battle_screen.dart';
class SubjectMapScreen extends StatefulWidget {
  final ArenaTrack track; final int? classNum; final String subject;
  const SubjectMapScreen({super.key, required this.track, required this.classNum, required this.subject});
  @override State<SubjectMapScreen> createState()=> _SubjectMapScreenState();
}
class _SubjectMapScreenState extends State<SubjectMapScreen> {
  late List<Chapter> chapters;
  ArenaProgress? progress;
  bool loading=true; String? error;
  String query='';

  String get subjectKey => toSubjectKey(widget.track.id, widget.subject, widget.classNum);

  @override
  void initState(){
    super.initState();
    chapters=getChapters(widget.track.id, widget.subject, widget.classNum);
    _init();
  }
  Future<void> _init() async {
    setState(()=> loading=true);
    try{
      final uid = 'demo-user';
      if(uid.isEmpty) throw Exception('Not signed in');
      // server init (authoritative)
      final j=await ArenaApi.initProgress(subjectKey: subjectKey, trackId: widget.track.id, subject: widget.subject, classNum: widget.classNum, chapters: chapters.map((c)=> {'conceptId':c.conceptId,'prerequisites':c.prerequisites}).toList());
      if(mounted) setState(()=> progress=ArenaProgress.fromFirestore(Map<String,dynamic>.from(j['progress']??j)));
    }catch(e){
      setState(()=> error=e.toString());
    } finally{ if(mounted) setState(()=> loading=false); }
    // listen for cross-platform sync
    final uid = 'demo-user';
    if(uid.isNotEmpty){
      listenProgress(uid, subjectKey).listen((p){ if(p!=null && mounted) setState(()=> progress=p); });
    }
  }

  @override
  Widget build(BuildContext context){
    if(loading) return Scaffold(drawer: const AppDrawer(activeRoute: 'arena'), appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: Text(widget.subject), backgroundColor: Colors.transparent, elevation:0), body: const Center(child: CircularProgressIndicator()));
    if(error!=null) return Scaffold(drawer: const AppDrawer(activeRoute: 'arena'), appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: Text(widget.subject), backgroundColor: Colors.transparent, elevation:0), body: Center(child: Padding(padding: const EdgeInsets.all(16), child: Text('Error: $error', style: const TextStyle(color: Colors.redAccent)))));
    if(progress==null || chapters.isEmpty) return Scaffold(drawer: const AppDrawer(activeRoute: 'arena'), appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: Text(widget.subject), backgroundColor: Colors.transparent, elevation:0), body: const Center(child: Text('No curriculum available', style: TextStyle(color: Colors.white54))));
    final computed=computeProgress(progress!, chapters);
    progress=computed;
    final filtered = query.isEmpty? chapters : chapters.where((c)=> c.name.toLowerCase().contains(query.toLowerCase()) || c.topic.toLowerCase().contains(query.toLowerCase())).toList();
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'arena'),
      appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: Text(widget.subject), backgroundColor: Colors.transparent, elevation:0),
      body: Column(children:[
        Padding(padding: const EdgeInsets.fromLTRB(16,8,16,8), child: Row(children:[
          Chip(label: Text('${computed.progressPct}%'), backgroundColor: Colors.white10, labelStyle: const TextStyle(color: Colors.white, fontSize:11)),
          const SizedBox(width:8),
          Chip(label: Text('${computed.defeated}/${computed.total}'), backgroundColor: Colors.white10, labelStyle: const TextStyle(color: Colors.white70, fontSize:11)),
          const Spacer(),
          if(computed.currentChapterId!=null) FilledButton(onPressed: ()=> _openChapter(computed.currentChapterId!), child: const Text('Resume', style: TextStyle(fontSize:11))),
        ])),
        LinearProgressIndicator(value: computed.progressPct/100, backgroundColor: Colors.white10, color: const Color(0xFF0EA5E9), minHeight:4),
        Padding(padding: const EdgeInsets.all(12), child: TextField(decoration: InputDecoration(hintText:'Search chapters…', hintStyle: const TextStyle(color: Colors.white38, fontSize:12), filled:true, fillColor: const Color(0xFF0F1324), border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))), contentPadding: const EdgeInsets.symmetric(horizontal:14, vertical:10)), style: const TextStyle(color: Colors.white, fontSize:13), onChanged: (v)=> setState(()=> query=v))),
        Expanded(child: ListView.builder(
          padding: const EdgeInsets.fromLTRB(16,8,16,20),
          itemCount: filtered.length + 1, // + boss
          itemBuilder: (c,i){
            if(i==filtered.length){
              final bossUnlocked=computed.finalBossUnlocked;
              final bossDefeated=computed.finalBossDefeated;
              return Padding(padding: const EdgeInsets.only(top:12), child: InkWell(
                onTap: bossDefeated? ()=> _showComplete(): bossUnlocked? ()=> _startBoss(): ()=> ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Defeat all chapters to unlock Final Boss'))),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: bossUnlocked? [const Color(0xFFF59E0B).withOpacity(0.18), const Color(0xFFEF4444).withOpacity(0.12)]: [Colors.white10, Colors.white10]),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: bossUnlocked? const Color(0xFFF59E0B).withOpacity(0.35): Colors.white10),
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Row(children:[
                    Container(width:42,height:42,decoration: BoxDecoration(gradient: const LinearGradient(colors:[Color(0xFFF59E0B), Color(0xFFEF4444)]), borderRadius: BorderRadius.circular(12)), child: const Center(child: Text('🏆', style: TextStyle(fontSize:18)))),
                    const SizedBox(width:12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children:[
                      Text(bossDefeated? 'SUBJECT COMPLETE': 'FINAL BOSS', style: const TextStyle(fontWeight: FontWeight.w800, fontSize:13)),
                      Text(bossDefeated? 'You conquered ${widget.subject}': bossUnlocked? 'Comprehensive challenge — defeat to complete':'Defeat all ${widget.subject} chapters', style: const TextStyle(color: Colors.white54, fontSize:11)),
                    ])),
                  ]),
                ),
              ));
            }
            final ch=filtered[i];
            final p=computed.chapters[ch.conceptId];
            final isCurrent=computed.currentChapterId==ch.conceptId;
            return Padding(padding: const EdgeInsets.only(bottom:2), child: Column(children:[
              ChapterNode(chapter: ch, progress: p, isCurrent: isCurrent, onTap: ()=> _openChapter(ch.conceptId)),
              if(i!=filtered.length-1) Container(width:2,height:14, color: (p?.state==ArenaState.defeated||p?.state==ArenaState.mastered)? const Color(0xFF10B981): Colors.white10),
            ]));
          },
        )),
      ]),
    );
  }
  void _openChapter(String conceptId){
    final ch=chapters.firstWhere((c)=> c.conceptId==conceptId);
    final p=progress!.chapters[conceptId];
    showModalBottomSheet(context: context, isScrollControlled:true, backgroundColor: const Color(0xFF0F1324), shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))), builder: (_){
      final can=canBattle(ch, progress!);
      return Padding(padding: const EdgeInsets.all(16), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children:[
        Text(ch.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize:15)),
        Text('${ch.topic} · ${ch.difficultyLabel}', style: const TextStyle(color: Colors.white54, fontSize:11)),
        const SizedBox(height:10),
        Row(children:[
          Chip(label: Text((p?.state??'locked').toUpperCase(), style: const TextStyle(fontSize:10)), backgroundColor: Colors.white10),
          const SizedBox(width:6),
          Chip(label: Text('${((p?.bestScore??0)*100).round()}% best', style: const TextStyle(fontSize:10, color: Colors.white70)), backgroundColor: Colors.white10),
        ]),
        const SizedBox(height:8),
        if(!can) Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.red.withOpacity(0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.red.withOpacity(0.2))), child: const Text('🔒 Locked — defeat previous chapter first', style: TextStyle(color: Colors.redAccent, fontSize:12))),
        const SizedBox(height:12),
        SizedBox(width: double.infinity, child: FilledButton(onPressed: can? (){ Navigator.pop(context); _startBattle(ch); }: null, style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0EA5E9), padding: const EdgeInsets.symmetric(vertical:12)), child: Text(can? '⚔ ENTER BATTLE':'Locked', style: const TextStyle(fontWeight: FontWeight.w800)))),
        SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
      ]));
    });
  }
  void _startBattle(Chapter ch){
    Navigator.push(context, MaterialPageRoute(builder: (_)=> BattleScreen(subjectKey: subjectKey, chapter: ch, onComplete: (score){
      if(score>=defeatScore){
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Chapter defeated! ${(score*100).round()}%')));
        // API defeat is handled inside BattleScreen; just refresh via listen
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Keep fighting! ${(score*100).round()}% — need 60%')));
      }
    })));
  }
  void _startBoss(){
    Navigator.push(context, MaterialPageRoute(builder: (_)=> BattleScreen(subjectKey: subjectKey, chapter: Chapter(conceptId:'final_boss', name:'FINAL BOSS', topic: widget.subject, subject: widget.subject, difficulty:0.9, difficultyLabel:'Boss', prerequisites:[], curriculumPaths:[]), isBoss:true, onComplete: (score){
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(score>=finalBossDefeatScore? '🏆 Subject Complete!':'Need 70% — ${(score*100).round()}%')));
    })));
  }
  void _showComplete(){
    showDialog(context: context, builder: (_)=> AlertDialog(title: const Text('🏆 SUBJECT COMPLETE'), content: Text('You conquered ${widget.subject} — ${progress!.defeated}/${progress!.total} chapters!'), actions:[TextButton(onPressed: ()=> Navigator.pop(context), child: const Text('Awesome'))]));
  }
}
