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

// Maharashtra State Board Std. 9 — 62 chapters (web mirror)
final List<Chapter> _seedChapters = [
  // Science & Technology - Part 1 (5)
  Chapter(conceptId:'maharashtra.9.science1.laws_of_motion', name:'Laws of Motion', topic:'General Science', subject:'Science & Technology - Part 1', difficulty:0.35, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.science1.laws_of_motion']),
  Chapter(conceptId:'maharashtra.9.science1.work_and_energy', name:'Work and Energy', topic:'General Science', subject:'Science & Technology - Part 1', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science1.laws_of_motion'], curriculumPaths:['maharashtra.9.science1.work_and_energy']),
  Chapter(conceptId:'maharashtra.9.science1.current_electricity', name:'Current Electricity', topic:'General Science', subject:'Science & Technology - Part 1', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science1.work_and_energy'], curriculumPaths:['maharashtra.9.science1.current_electricity']),
  Chapter(conceptId:'maharashtra.9.science1.measurement_of_matter', name:'Measurement of Matter', topic:'General Science', subject:'Science & Technology - Part 1', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science1.current_electricity'], curriculumPaths:['maharashtra.9.science1.measurement_of_matter']),
  Chapter(conceptId:'maharashtra.9.science1.acids_bases_and_salts', name:'Acids, Bases and Salts', topic:'General Science', subject:'Science & Technology - Part 1', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science1.measurement_of_matter'], curriculumPaths:['maharashtra.9.science1.acids_bases_and_salts']),
  // Science & Technology - Part 2 (13)
  Chapter(conceptId:'maharashtra.9.science2.classification_of_plants', name:'Classification of Plants', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.35, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.science2.classification_of_plants']),
  Chapter(conceptId:'maharashtra.9.science2.energy_flow_in_an_ecosystem', name:'Energy Flow in an Ecosystem', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science2.classification_of_plants'], curriculumPaths:['maharashtra.9.science2.energy_flow_in_an_ecosystem']),
  Chapter(conceptId:'maharashtra.9.science2.useful_and_harmful_microbes', name:'Useful and Harmful Microbes', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science2.energy_flow_in_an_ecosystem'], curriculumPaths:['maharashtra.9.science2.useful_and_harmful_microbes']),
  Chapter(conceptId:'maharashtra.9.science2.environmental_management', name:'Environmental Management', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science2.useful_and_harmful_microbes'], curriculumPaths:['maharashtra.9.science2.environmental_management']),
  Chapter(conceptId:'maharashtra.9.science2.ict_new_direction_of_progress', name:'Information Communication Technology (ICT): The New Direction of Progress', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science2.environmental_management'], curriculumPaths:['maharashtra.9.science2.ict_new_direction_of_progress']),
  Chapter(conceptId:'maharashtra.9.science2.reflection_of_light', name:'Reflection of Light', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.ict_new_direction_of_progress'], curriculumPaths:['maharashtra.9.science2.reflection_of_light']),
  Chapter(conceptId:'maharashtra.9.science2.study_of_sound', name:'Study of Sound', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.science2.reflection_of_light'], curriculumPaths:['maharashtra.9.science2.study_of_sound']),
  Chapter(conceptId:'maharashtra.9.science2.carbon_an_important_element', name:'Carbon: An Important Element', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.60, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.study_of_sound'], curriculumPaths:['maharashtra.9.science2.carbon_an_important_element']),
  Chapter(conceptId:'maharashtra.9.science2.substances_in_common_use', name:'Substances in Common Use', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.carbon_an_important_element'], curriculumPaths:['maharashtra.9.science2.substances_in_common_use']),
  Chapter(conceptId:'maharashtra.9.science2.life_processes_in_living_organisms', name:'Life Processes in Living Organisms', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.60, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.substances_in_common_use'], curriculumPaths:['maharashtra.9.science2.life_processes_in_living_organisms']),
  Chapter(conceptId:'maharashtra.9.science2.heredity_and_variation', name:'Heredity and Variation', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.65, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.life_processes_in_living_organisms'], curriculumPaths:['maharashtra.9.science2.heredity_and_variation']),
  Chapter(conceptId:'maharashtra.9.science2.introduction_to_biotechnology', name:'Introduction to Biotechnology', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.65, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.heredity_and_variation'], curriculumPaths:['maharashtra.9.science2.introduction_to_biotechnology']),
  Chapter(conceptId:'maharashtra.9.science2.observing_space_telescopes', name:'Observing Space: Telescopes', topic:'General Science', subject:'Science & Technology - Part 2', difficulty:0.60, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.science2.introduction_to_biotechnology'], curriculumPaths:['maharashtra.9.science2.observing_space_telescopes']),
  // Mathematics - Part 1 (7)
  Chapter(conceptId:'maharashtra.9.maths1.sets', name:'Sets', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.30, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.maths1.sets']),
  Chapter(conceptId:'maharashtra.9.maths1.real_numbers', name:'Real Numbers', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.35, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths1.sets'], curriculumPaths:['maharashtra.9.maths1.real_numbers']),
  Chapter(conceptId:'maharashtra.9.maths1.polynomials', name:'Polynomials', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths1.real_numbers'], curriculumPaths:['maharashtra.9.maths1.polynomials']),
  Chapter(conceptId:'maharashtra.9.maths1.ratio_and_proportion', name:'Ratio and Proportion', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths1.polynomials'], curriculumPaths:['maharashtra.9.maths1.ratio_and_proportion']),
  Chapter(conceptId:'maharashtra.9.maths1.linear_equations_in_two_variables', name:'Linear Equations in Two Variables', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths1.ratio_and_proportion'], curriculumPaths:['maharashtra.9.maths1.linear_equations_in_two_variables']),
  Chapter(conceptId:'maharashtra.9.maths1.financial_planning', name:'Financial Planning', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths1.linear_equations_in_two_variables'], curriculumPaths:['maharashtra.9.maths1.financial_planning']),
  Chapter(conceptId:'maharashtra.9.maths1.statistics', name:'Statistics', topic:'Mathematics', subject:'Mathematics - Part 1', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths1.financial_planning'], curriculumPaths:['maharashtra.9.maths1.statistics']),
  // Mathematics - Part 2 (9)
  Chapter(conceptId:'maharashtra.9.maths2.basic_concepts_in_geometry', name:'Basic Concepts in Geometry', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.30, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.maths2.basic_concepts_in_geometry']),
  Chapter(conceptId:'maharashtra.9.maths2.parallel_lines', name:'Parallel Lines', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths2.basic_concepts_in_geometry'], curriculumPaths:['maharashtra.9.maths2.parallel_lines']),
  Chapter(conceptId:'maharashtra.9.maths2.triangles', name:'Triangles', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths2.parallel_lines'], curriculumPaths:['maharashtra.9.maths2.triangles']),
  Chapter(conceptId:'maharashtra.9.maths2.constructions_of_triangles', name:'Constructions of Triangles', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.maths2.triangles'], curriculumPaths:['maharashtra.9.maths2.constructions_of_triangles']),
  Chapter(conceptId:'maharashtra.9.maths2.quadrilaterals', name:'Quadrilaterals', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths2.constructions_of_triangles'], curriculumPaths:['maharashtra.9.maths2.quadrilaterals']),
  Chapter(conceptId:'maharashtra.9.maths2.circle', name:'Circle', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths2.quadrilaterals'], curriculumPaths:['maharashtra.9.maths2.circle']),
  Chapter(conceptId:'maharashtra.9.maths2.coordinate_geometry', name:'Coordinate Geometry', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.60, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths2.circle'], curriculumPaths:['maharashtra.9.maths2.coordinate_geometry']),
  Chapter(conceptId:'maharashtra.9.maths2.trigonometry', name:'Trigonometry', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.60, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths2.coordinate_geometry'], curriculumPaths:['maharashtra.9.maths2.trigonometry']),
  Chapter(conceptId:'maharashtra.9.maths2.surface_area_and_volume', name:'Surface Area and Volume', topic:'Mathematics', subject:'Mathematics - Part 2', difficulty:0.65, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.maths2.trigonometry'], curriculumPaths:['maharashtra.9.maths2.surface_area_and_volume']),
  // History (10)
  Chapter(conceptId:'maharashtra.9.history.sources_of_history', name:'Sources of History', topic:'History', subject:'History', difficulty:0.30, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.history.sources_of_history']),
  Chapter(conceptId:'maharashtra.9.history.india_events_after_1960', name:'India: Events after 1960', topic:'History', subject:'History', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.sources_of_history'], curriculumPaths:['maharashtra.9.history.india_events_after_1960']),
  Chapter(conceptId:'maharashtra.9.history.indias_internal_challenges', name:"India's Internal Challenges", topic:'History', subject:'History', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.india_events_after_1960'], curriculumPaths:['maharashtra.9.history.indias_internal_challenges']),
  Chapter(conceptId:'maharashtra.9.history.economic_development', name:'Economic Development', topic:'History', subject:'History', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.indias_internal_challenges'], curriculumPaths:['maharashtra.9.history.economic_development']),
  Chapter(conceptId:'maharashtra.9.history.education', name:'Education', topic:'History', subject:'History', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.economic_development'], curriculumPaths:['maharashtra.9.history.education']),
  Chapter(conceptId:'maharashtra.9.history.empowerment_of_women_and_other_weaker_sections', name:'Empowerment of Women and Other Weaker Sections', topic:'History', subject:'History', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.education'], curriculumPaths:['maharashtra.9.history.empowerment_of_women_and_other_weaker_sections']),
  Chapter(conceptId:'maharashtra.9.history.science_and_technology', name:'Science and Technology', topic:'History', subject:'History', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.empowerment_of_women_and_other_weaker_sections'], curriculumPaths:['maharashtra.9.history.science_and_technology']),
  Chapter(conceptId:'maharashtra.9.history.industry_and_trade', name:'Industry and Trade', topic:'History', subject:'History', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.history.science_and_technology'], curriculumPaths:['maharashtra.9.history.industry_and_trade']),
  Chapter(conceptId:'maharashtra.9.history.changing_life_1', name:'Changing Life: 1', topic:'History', subject:'History', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.history.industry_and_trade'], curriculumPaths:['maharashtra.9.history.changing_life_1']),
  Chapter(conceptId:'maharashtra.9.history.changing_life_2', name:'Changing Life: 2', topic:'History', subject:'History', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.history.changing_life_1'], curriculumPaths:['maharashtra.9.history.changing_life_2']),
  // Political Science (6)
  Chapter(conceptId:'maharashtra.9.political_science.post_world_war_political_developments', name:'Post World War Political Developments', topic:'Political Science', subject:'Political Science', difficulty:0.35, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.political_science.post_world_war_political_developments']),
  Chapter(conceptId:'maharashtra.9.political_science.indias_foreign_policy', name:"India's Foreign Policy", topic:'Political Science', subject:'Political Science', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.political_science.post_world_war_political_developments'], curriculumPaths:['maharashtra.9.political_science.indias_foreign_policy']),
  Chapter(conceptId:'maharashtra.9.political_science.indias_defence_system', name:"India's Defence System", topic:'Political Science', subject:'Political Science', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.political_science.indias_foreign_policy'], curriculumPaths:['maharashtra.9.political_science.indias_defence_system']),
  Chapter(conceptId:'maharashtra.9.political_science.the_united_nations', name:'The United Nations', topic:'Political Science', subject:'Political Science', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.political_science.indias_defence_system'], curriculumPaths:['maharashtra.9.political_science.the_united_nations']),
  Chapter(conceptId:'maharashtra.9.political_science.india_and_other_countries', name:'India and Other Countries', topic:'Political Science', subject:'Political Science', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.political_science.the_united_nations'], curriculumPaths:['maharashtra.9.political_science.india_and_other_countries']),
  Chapter(conceptId:'maharashtra.9.political_science.international_problems', name:'International Problems', topic:'Political Science', subject:'Political Science', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['maharashtra.9.political_science.india_and_other_countries'], curriculumPaths:['maharashtra.9.political_science.international_problems']),
  // Geography (12)
  Chapter(conceptId:'maharashtra.9.geography.distributional_maps', name:'Distributional Maps', topic:'Geography', subject:'Geography', difficulty:0.30, difficultyLabel:'Foundation', prerequisites:[], curriculumPaths:['maharashtra.9.geography.distributional_maps']),
  Chapter(conceptId:'maharashtra.9.geography.endogenetic_movements', name:'Endogenetic Movements', topic:'Geography', subject:'Geography', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.distributional_maps'], curriculumPaths:['maharashtra.9.geography.endogenetic_movements']),
  Chapter(conceptId:'maharashtra.9.geography.exogenetic_processes_part_i', name:'Exogenetic Processes – Part I', topic:'Geography', subject:'Geography', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.endogenetic_movements'], curriculumPaths:['maharashtra.9.geography.exogenetic_processes_part_i']),
  Chapter(conceptId:'maharashtra.9.geography.exogenetic_processes_part_ii', name:'Exogenetic Processes – Part II', topic:'Geography', subject:'Geography', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.exogenetic_processes_part_i'], curriculumPaths:['maharashtra.9.geography.exogenetic_processes_part_ii']),
  Chapter(conceptId:'maharashtra.9.geography.precipitation', name:'Precipitation', topic:'Geography', subject:'Geography', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.exogenetic_processes_part_ii'], curriculumPaths:['maharashtra.9.geography.precipitation']),
  Chapter(conceptId:'maharashtra.9.geography.the_properties_of_sea_water', name:'The Properties of Sea Water', topic:'Geography', subject:'Geography', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.precipitation'], curriculumPaths:['maharashtra.9.geography.the_properties_of_sea_water']),
  Chapter(conceptId:'maharashtra.9.geography.international_date_line', name:'International Date Line', topic:'Geography', subject:'Geography', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.the_properties_of_sea_water'], curriculumPaths:['maharashtra.9.geography.international_date_line']),
  Chapter(conceptId:'maharashtra.9.geography.introduction_to_economics', name:'Introduction to Economics', topic:'Geography', subject:'Geography', difficulty:0.40, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.international_date_line'], curriculumPaths:['maharashtra.9.geography.introduction_to_economics']),
  Chapter(conceptId:'maharashtra.9.geography.trade', name:'Trade', topic:'Geography', subject:'Geography', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.introduction_to_economics'], curriculumPaths:['maharashtra.9.geography.trade']),
  Chapter(conceptId:'maharashtra.9.geography.urbanisation', name:'Urbanisation', topic:'Geography', subject:'Geography', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.trade'], curriculumPaths:['maharashtra.9.geography.urbanisation']),
  Chapter(conceptId:'maharashtra.9.geography.transport_and_communication', name:'Transport and Communication', topic:'Geography', subject:'Geography', difficulty:0.50, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.urbanisation'], curriculumPaths:['maharashtra.9.geography.transport_and_communication']),
  Chapter(conceptId:'maharashtra.9.geography.tourism', name:'Tourism', topic:'Geography', subject:'Geography', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['maharashtra.9.geography.transport_and_communication'], curriculumPaths:['maharashtra.9.geography.tourism']),
];

List<String> getSubjectsForTrack(String trackId, int? classNum){
  final t = trackId.toLowerCase();
  if(t=='jee') return ['Physics','Chemistry','Mathematics'];
  if(t=='neet') return ['Physics','Chemistry','Biology'];
  if(t=='maharashtra'){
    if(classNum==9) return ['Science & Technology - Part 1','Science & Technology - Part 2','Mathematics - Part 1','Mathematics - Part 2','History','Political Science','Geography'];
    return ['Physics','Chemistry','Biology','Mathematics'];
  }
  if(t=='cbse') return ['Physics','Chemistry','Biology','Mathematics'];
  return [];
}

List<Chapter> getChapters(String trackId, String subject, int? classNum){
  // Exact subject match (web normalizeSubject already preserves these 7)
  var filtered = _seedChapters.where((c)=> c.subject==subject).toList();
  // Fallback for board/class filtering already exact, but keep class check for future expansion
  if(trackId.toLowerCase()=='maharashtra' && classNum!=null && classNum!=9){
    // No data for other classes yet
    filtered = [];
  }
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
