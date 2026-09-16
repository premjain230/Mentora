import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';
import '../services/arena_api.dart';

class BattleScreen extends StatefulWidget {
  final String subjectKey; final Chapter chapter; final bool isBoss; final Function(double score) onComplete;
  const BattleScreen({super.key, required this.subjectKey, required this.chapter, this.isBoss=false, required this.onComplete});
  @override State<BattleScreen> createState()=> _BattleScreenState();
}
class _BattleScreenState extends State<BattleScreen> {
  late List<Map<String,dynamic>> qs;
  int idx=0; int correct=0; int? selected; bool answered=false;

  @override
  void initState(){
    super.initState();
    // Mock questions — in production fetch from /api/groq-proxy like web
    qs = List.generate(widget.isBoss? 8:5, (i)=> {
      'q': widget.isBoss? 'Final Boss Q${i+1}: Comprehensive ${widget.chapter.subject} — choose best answer' : '${widget.chapter.name} Q${i+1}: Key concept — choose correct option',
      'options': ['Option A — Principle X','Option B — Principle Y','Option C — Principle Z','Option D — Principle W'],
      'answer': ['A','B','C','D'][i%4],
      'explanation': 'Explanation for Q${i+1}.',
    });
  }

  @override
  Widget build(BuildContext context){
    final q=qs[idx];
    final total=qs.length;
    return Scaffold(
      appBar: AppBar(title: Text(widget.isBoss? '🏆 FINAL BOSS':'⚔ ${widget.chapter.name}'), backgroundColor: Colors.transparent, elevation:0),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children:[
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children:[
            Text('Question ${idx+1} / $total', style: const TextStyle(color: Colors.white54, fontFamily: 'monospace', fontSize:11)),
            Text(widget.isBoss? 'Boss': ['Foundation','Foundation','Application','Challenge','Boss'][idx.clamp(0,4)], style: const TextStyle(color: Colors.white38, fontSize:11)),
          ]),
          const SizedBox(height:8),
          LinearProgressIndicator(value: (idx+1)/total, backgroundColor: Colors.white10, color: const Color(0xFF0EA5E9), minHeight:4),
          const SizedBox(height:16),
          Text(q['q'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize:14, height:1.5)),
          const SizedBox(height:14),
          ...List.generate(4, (i){
            final letter=String.fromCharCode(65+i);
            final isSelected=selected==i;
            final showResult=answered;
            final isCorrect=letter==q['answer'];
            Color border=Colors.white10;
            Color bg=const Color(0xFF0F1324);
            if(showResult && isSelected){ border=isCorrect? const Color(0xFF10B981): const Color(0xFFEF4444); bg=isCorrect? const Color(0xFF10B981).withOpacity(0.12): const Color(0xFFEF4444).withOpacity(0.12); }
            else if(showResult && isCorrect){ border=const Color(0xFF10B981); bg=const Color(0xFF10B981).withOpacity(0.08); }
            else if(isSelected){ border=const Color(0xFF0EA5E9); bg=const Color(0xFF0EA5E9).withOpacity(0.12); }
            return Padding(padding: const EdgeInsets.only(bottom:8), child: InkWell(
              onTap: answered? null: ()=> _select(i),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
                padding: const EdgeInsets.symmetric(horizontal:12, vertical:11),
                child: Row(children:[
                  Container(width:26,height:26,decoration: BoxDecoration(color: isSelected? const Color(0xFF0EA5E9): Colors.white10, borderRadius: BorderRadius.circular(8)), child: Center(child: Text(letter, style: TextStyle(color: isSelected? Colors.white: Colors.white70, fontSize:11, fontWeight: FontWeight.w700)))),
                  const SizedBox(width:10),
                  Expanded(child: Text(q['options'][i], style: const TextStyle(color: Colors.white, fontSize:13))),
                ]),
              ),
            ));
          }),
          if(answered) Container(margin: const EdgeInsets.only(top:10), padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: (String.fromCharCode(65+(selected??0))==q['answer']? const Color(0xFF10B981).withOpacity(0.08): const Color(0xFFEF4444).withOpacity(0.08)), borderRadius: BorderRadius.circular(10), border: Border.all(color: String.fromCharCode(65+(selected??0))==q['answer']? const Color(0xFF10B981).withOpacity(0.25): const Color(0xFFEF4444).withOpacity(0.25))), child: Text(String.fromCharCode(65+(selected??0))==q['answer']? '✓ Correct! ${q['explanation']}':'✗ Incorrect. Correct: ${q['answer']}. ${q['explanation']}', style: TextStyle(color: String.fromCharCode(65+(selected??0))==q['answer']? const Color(0xFF10B981): const Color(0xFFF87171), fontSize:12))),
          const Spacer(),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: !answered? null: () async {
              if(idx < total-1){ setState(()=> { idx++; selected=null; answered=false; }); }
              else {
                final score= correct/total;
                try{
                  if(widget.isBoss){
                    await ArenaApi.finalBossAttempt(subjectKey: widget.subjectKey, score: score);
                  } else {
                    await ArenaApi.defeatChapter(subjectKey: widget.subjectKey, conceptId: widget.chapter.conceptId, score: score);
                  }
                }catch(e){
                  if(!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sync failed: $e')));
                  Navigator.pop(context);
                  widget.onComplete(score);
                  return;
                }
                if(!mounted) return;
                Navigator.pop(context);
                widget.onComplete(score);
              }
            },
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0EA5E9), padding: const EdgeInsets.symmetric(vertical:12)),
            child: Text(idx==total-1? 'Finish':'Next →', style: const TextStyle(fontWeight: FontWeight.w800)),
          )),
        ]),
      ),
    );
  }
  void _select(int i){
    if(answered) return;
    setState(()=> { selected=i; answered=true; });
    final letter=String.fromCharCode(65+i);
    if(letter==qs[idx]['answer']) correct++;
  }
}
