// Dart mirror of js/learning/arena-curriculum.js — keep 1:1 with web
// Arena Engine + Curriculum Data (not 4 separate systems)

class ArenaTrack {
  final String id;
  final String label;
  final String subtitle;
  final String icon;
  final String color;
  const ArenaTrack({required this.id, required this.label, required this.subtitle, required this.icon, required this.color});
}

const arenaTracks = [
  ArenaTrack(id: 'jee', label: 'JEE', subtitle: 'Physics · Chemistry · Mathematics', icon: '◈', color: '#0ea5e9'),
  ArenaTrack(id: 'neet', label: 'NEET', subtitle: 'Physics · Chemistry · Biology', icon: '⬢', color: '#10b981'),
  ArenaTrack(id: 'maharashtra', label: 'Maharashtra State Board', subtitle: 'Class-based curriculum', icon: '⬣', color: '#f59e0b'),
  ArenaTrack(id: 'cbse', label: 'CBSE', subtitle: 'Class-based curriculum', icon: '⬔', color: '#8b5cf6'),
];

class Chapter {
  final String conceptId;
  final String name;
  final String topic;
  final String subject;
  final double difficulty;
  final String difficultyLabel;
  final List<String> prerequisites;
  final List<String> curriculumPaths;
  Chapter({required this.conceptId, required this.name, required this.topic, required this.subject, required this.difficulty, required this.difficultyLabel, required this.prerequisites, required this.curriculumPaths});
}

String difficultyLabel(double d){
  if(d<0.35) return 'Foundation';
  if(d<0.55) return 'Intermediate';
  if(d<0.75) return 'Advanced';
  return 'Boss';
}

// Minimal seed — in production this list is fetched from Firestore or bundled JSON mirror of CURRICULUM_CONCEPTS
// For mobile scaffold we include a subset; real app loads from same backend via /api/arena or Firestore curriculum collection.
final List<Chapter> _seedChapters = [
  // Physics JEE subset
  Chapter(conceptId:'science.physics.units_dimensions', name:'Units and Dimensions', topic:'Physics', subject:'Physics', difficulty:0.4, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['cbse.11.physics.units']),
  Chapter(conceptId:'science.physics.motion', name:'Motion', topic:'Physics', subject:'Physics', difficulty:0.4, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['maharashtra.11.science.motion']),
  Chapter(conceptId:'science.physics.kinematics', name:'Kinematics', topic:'Physics', subject:'Physics', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['science.physics.units_dimensions','science.physics.motion'], curriculumPaths:['maharashtra.11.science.kinematics']),
  Chapter(conceptId:'science.physics.force', name:'Force and Laws of Motion', topic:'Physics', subject:'Physics', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['science.physics.motion'], curriculumPaths:['maharashtra.11.science.force']),
  Chapter(conceptId:'science.physics.work_energy', name:'Work and Energy', topic:'Physics', subject:'Physics', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['science.physics.force'], curriculumPaths:['maharashtra.11.science.work_energy']),
  Chapter(conceptId:'science.physics.gravitation', name:'Gravitation', topic:'Physics', subject:'Physics', difficulty:0.6, difficultyLabel:'Advanced', prerequisites:['science.physics.force'], curriculumPaths:['maharashtra.11.science.gravitation']),
  // Chemistry
  Chapter(conceptId:'science.chemistry.matter', name:'Matter', topic:'Chemistry', subject:'Chemistry', difficulty:0.3, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.11.science.matter']),
  Chapter(conceptId:'science.chemistry.atoms', name:'Atoms and Molecules', topic:'Chemistry', subject:'Chemistry', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['science.chemistry.matter'], curriculumPaths:['maharashtra.11.science.atoms']),
  Chapter(conceptId:'science.chemistry.structure', name:'Structure of Atom', topic:'Chemistry', subject:'Chemistry', difficulty:0.6, difficultyLabel:'Advanced', prerequisites:['science.chemistry.atoms'], curriculumPaths:['maharashtra.11.science.structure']),
  // Biology NEET
  Chapter(conceptId:'science.biology.cell', name:'Cell', topic:'Biology', subject:'Biology', difficulty:0.4, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['maharashtra.9.science.biology']),
  Chapter(conceptId:'science.biology.tissues', name:'Tissues', topic:'Biology', subject:'Biology', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['science.biology.cell'], curriculumPaths:['maharashtra.9.science.biology']),
  Chapter(conceptId:'science.biology.genetics', name:'Genetics', topic:'Biology', subject:'Biology', difficulty:0.7, difficultyLabel:'Advanced', prerequisites:['science.biology.cell','science.biology.tissues'], curriculumPaths:['cbse.12.biology.genetics']),
  // Mathematics JEE
  Chapter(conceptId:'math.sets', name:'Sets', topic:'Sets', subject:'Mathematics', difficulty:0.3, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.mathematics.sets']),
  Chapter(conceptId:'math.linear_equations', name:'Linear Equations', topic:'Algebra', subject:'Mathematics', difficulty:0.5, difficultyLabel:'Intermediate', prerequisites:['math.sets'], curriculumPaths:['maharashtra.9.mathematics.linear_equations']),
  Chapter(conceptId:'math.trigonometry', name:'Trigonometry', topic:'Trigonometry', subject:'Mathematics', difficulty:0.6, difficultyLabel:'Advanced', prerequisites:['math.linear_equations'], curriculumPaths:['cbse.11.math.trigonometry']),
  Chapter(conceptId:'math.calculus.limits', name:'Limits', topic:'Calculus', subject:'Mathematics', difficulty:0.7, difficultyLabel:'Advanced', prerequisites:['math.trigonometry'], curriculumPaths:['cbse.11.math.calculus']),
];

List<String> getSubjectsForTrack(String trackId, int? classNum){
  final t = trackId.toLowerCase();
  if(t=='jee') return ['Physics','Chemistry','Mathematics'];
  if(t=='neet') return ['Physics','Chemistry','Biology'];
  if(t=='maharashtra' || t=='cbse') return ['Physics','Chemistry','Biology','Mathematics'];
  return [];
}

List<Chapter> getChapters(String trackId, String subject, int? classNum){
  // Filter seed by subject (and optionally class — simplified)
  var filtered = _seedChapters.where((c)=> c.subject==subject).toList();
  // NEET vs JEE filter if needed — keep same for scaffold
  // Topo sort by prerequisites (same Kahn as web)
  final idToChapter = {for(var c in filtered) c.conceptId: c};
  final indeg=<String,int>{}; final adj=<String, List<String>>{};
  for(var c in filtered){ indeg[c.conceptId]=0; adj[c.conceptId]=[]; }
  for(var c in filtered){
    for(var pre in c.prerequisites){
      if(idToChapter.containsKey(pre)){
        adj[pre]!.add(c.conceptId);
        indeg[c.conceptId]= indeg[c.conceptId]!+1;
      }
    }
  }
  final queue = filtered.where((c)=> indeg[c.conceptId]==0).toList()..sort((a,b)=> a.difficulty.compareTo(b.difficulty));
  final result=<Chapter>[];
  final visited=<String>{};
  while(queue.isNotEmpty){
    queue.sort((a,b)=> a.difficulty.compareTo(b.difficulty));
    final cur=queue.removeAt(0);
    result.add(cur); visited.add(cur.conceptId);
    for(var nxt in adj[cur.conceptId]!){
      indeg[nxt]=indeg[nxt]!-1;
      if(indeg[nxt]==0) queue.add(idToChapter[nxt]!);
    }
  }
  for(var c in filtered){ if(!visited.contains(c.conceptId)) result.add(c); }
  return result;
}

String toSubjectKey(String trackId, String subject, int? classNum){
  final t = trackId.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  final s = subject.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  if(t=='maharashtra' || t=='cbse'){
    return '${t}_${classNum ?? ''}_${s}'.replaceAll('__', '_');
  }
  return '${t}_$s';
}
