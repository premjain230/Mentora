// Dart mirror of js/learning/arena-progress.js — same thresholds, same states, same sync model
import 'dart:async';
import 'arena_curriculum.dart';

class ArenaState {
  static const locked='locked', available='available', inProgress='in_progress', defeated='defeated', mastered='mastered';
}
class ArenaLevel {
  static const foundation='foundation', application='application', challenge='challenge', boss='boss';
}
const double defeatScore=0.6;
const double bossDefeatScore=0.65;
const double finalBossDefeatScore=0.7;

class ChapterProgress {
  String state;
  String level;
  double bestScore;
  int attempts;
  String? lastAttemptAt;
  String? defeatedAt;
  double masteryScore;
  ChapterProgress({required this.state, required this.level, this.bestScore=0, this.attempts=0, this.lastAttemptAt, this.defeatedAt, this.masteryScore=0});
  factory ChapterProgress.fromMap(Map<String,dynamic> m)=> ChapterProgress(
    state: m['state']??ArenaState.locked,
    level: m['level']??ArenaLevel.foundation,
    bestScore: (m['bestScore']??0).toDouble(),
    attempts: (m['attempts']??0) as int,
    lastAttemptAt: m['lastAttemptAt'],
    defeatedAt: m['defeatedAt'],
    masteryScore: (m['masteryScore']??0).toDouble(),
  );
  Map<String,dynamic> toMap()=> {'state':state,'level':level,'bestScore':bestScore,'attempts':attempts,'lastAttemptAt':lastAttemptAt,'defeatedAt':defeatedAt,'masteryScore':masteryScore};
}

class ArenaProgress {
  final String subjectKey;
  final String? trackId;
  final String? subject;
  final int? classNum;
  final Map<String, ChapterProgress> chapters;
  final List<String> chapterOrder;
  final int total;
  final int defeated;
  final int progressPct;
  final String? currentChapterId;
  final bool finalBossUnlocked;
  final bool finalBossDefeated;
  final double finalBossScore;
  ArenaProgress({required this.subjectKey, this.trackId, this.subject, this.classNum, required this.chapters, required this.chapterOrder, required this.total, required this.defeated, required this.progressPct, this.currentChapterId, required this.finalBossUnlocked, required this.finalBossDefeated, required this.finalBossScore});
  factory ArenaProgress.fromFirestore(Map<String,dynamic> d){
    final chMap=<String,ChapterProgress>{};
    final raw=d['chapters'] as Map<String,dynamic>? ?? {};
    raw.forEach((k,v)=> chMap[k]=ChapterProgress.fromMap(Map<String,dynamic>.from(v)));
    return ArenaProgress(
      subjectKey:d['subjectKey']??'',
      trackId:d['trackId'],
      subject:d['subject'],
      classNum:d['classNum'],
      chapters:chMap,
      chapterOrder: List<String>.from(d['chapterOrder']?? chMap.keys),
      total:d['total']?? chMap.length,
      defeated:d['defeated']??0,
      progressPct:d['progressPct']??0,
      currentChapterId:d['currentChapterId'],
      finalBossUnlocked:d['finalBossUnlocked']??false,
      finalBossDefeated:d['finalBossDefeated']??false,
      finalBossScore:(d['finalBossScore']??0).toDouble(),
    );
  }
}

ArenaProgress computeProgress(ArenaProgress p, List<Chapter> chapters){
  int defeated=0; for(var e in p.chapters.values){ if(e.state==ArenaState.defeated || e.state==ArenaState.mastered) defeated++; }
  final total=chapters.length;
  final pct= total==0?0: ((defeated/total*100).round());
  String? current;
  for(var ch in chapters){
    final s=p.chapters[ch.conceptId]?.state;
    if(s==ArenaState.available || s==ArenaState.inProgress){ current=ch.conceptId; break; }
  }
  if(current==null){
    int lastDefeated=-1;
    for(int i=0;i<chapters.length;i++){
      final s=p.chapters[chapters[i].conceptId]?.state;
      if(s==ArenaState.defeated||s==ArenaState.mastered) lastDefeated=i;
    }
    if(lastDefeated>=0 && lastDefeated+1<chapters.length) current=chapters[lastDefeated+1].conceptId;
    else if(defeated==total && total>0) current=null;
    else current=chapters.isNotEmpty? chapters.first.conceptId:null;
  }
  final bossUnlocked = total>0 && defeated==total;
  return ArenaProgress(subjectKey:p.subjectKey, trackId:p.trackId, subject:p.subject, classNum:p.classNum, chapters:p.chapters, chapterOrder:p.chapterOrder, total:total, defeated:defeated, progressPct:pct, currentChapterId:current, finalBossUnlocked:bossUnlocked, finalBossDefeated:p.finalBossDefeated, finalBossScore:p.finalBossScore);
}

bool canBattle(Chapter ch, ArenaProgress p){
  final e=p.chapters[ch.conceptId]; if(e==null) return false;
  if(e.state==ArenaState.locked) return false;
  for(var pre in ch.prerequisites){
    final pe=p.chapters[pre];
    if(pe!=null && pe.state!=ArenaState.defeated && pe.state!=ArenaState.mastered) return false;
  }
  return true;
}

Stream<ArenaProgress?> listenProgress(String uid, String subjectKey) async* {
  yield ArenaProgress(
    subjectKey: subjectKey,
    trackId: null,
    subject: null,
    classNum: null,
    chapters: {},
    chapterOrder: [],
    total: 0,
    defeated: 0,
    progressPct: 0,
    currentChapterId: null,
    finalBossUnlocked: false,
    finalBossDefeated: false,
    finalBossScore: 0,
  );
}
Future<ArenaProgress?> fetchProgress(String uid, String subjectKey) async {
  return null;
}
