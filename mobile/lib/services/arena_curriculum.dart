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
  // JEE Main 2026 — Physics (20) — verified https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/10/202510311323551056.pdf
  Chapter(conceptId:'jee.main.physics.units_and_measurements', name:'Units And Measurements', topic:'Units and Measurements', subject:'Physics', difficulty:0.37, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['jee.main.physics.units_and_measurements']),
  Chapter(conceptId:'jee.main.physics.kinematics', name:'Kinematics', topic:'Kinematics', subject:'Physics', difficulty:0.39, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.units_and_measurements'], curriculumPaths:['jee.main.physics.kinematics']),
  Chapter(conceptId:'jee.main.physics.laws_of_motion', name:'Laws of Motion', topic:'Laws of Motion', subject:'Physics', difficulty:0.41, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.kinematics'], curriculumPaths:['jee.main.physics.laws_of_motion']),
  Chapter(conceptId:'jee.main.physics.work_energy_power', name:'Work, Energy and Power', topic:'Work, Energy and Power', subject:'Physics', difficulty:0.43, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.laws_of_motion'], curriculumPaths:['jee.main.physics.work_energy_power']),
  Chapter(conceptId:'jee.main.physics.rotational_motion', name:'Rotational Motion', topic:'Rotational Motion', subject:'Physics', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.work_energy_power'], curriculumPaths:['jee.main.physics.rotational_motion']),
  Chapter(conceptId:'jee.main.physics.gravitation', name:'Gravitation', topic:'Gravitation', subject:'Physics', difficulty:0.47, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.rotational_motion'], curriculumPaths:['jee.main.physics.gravitation']),
  Chapter(conceptId:'jee.main.physics.properties_solids_liquids', name:'Properties of Solids and Liquids', topic:'Properties of Solids and Liquids', subject:'Physics', difficulty:0.49, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.gravitation'], curriculumPaths:['jee.main.physics.properties_solids_liquids']),
  Chapter(conceptId:'jee.main.physics.thermodynamics', name:'Thermodynamics', topic:'Thermodynamics', subject:'Physics', difficulty:0.51, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.properties_solids_liquids'], curriculumPaths:['jee.main.physics.thermodynamics']),
  Chapter(conceptId:'jee.main.physics.kinetic_theory_gases', name:'Kinetic Theory of Gases', topic:'Kinetic Theory of Gases', subject:'Physics', difficulty:0.53, difficultyLabel:'Intermediate', prerequisites:['jee.main.physics.thermodynamics'], curriculumPaths:['jee.main.physics.kinetic_theory_gases']),
  Chapter(conceptId:'jee.main.physics.oscillations_waves', name:'Oscillations and Waves', topic:'Oscillations and Waves', subject:'Physics', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.kinetic_theory_gases'], curriculumPaths:['jee.main.physics.oscillations_waves']),
  Chapter(conceptId:'jee.main.physics.electrostatics', name:'Electrostatics', topic:'Electrostatics', subject:'Physics', difficulty:0.57, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.oscillations_waves'], curriculumPaths:['jee.main.physics.electrostatics']),
  Chapter(conceptId:'jee.main.physics.current_electricity', name:'Current Electricity', topic:'Current Electricity', subject:'Physics', difficulty:0.59, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.electrostatics'], curriculumPaths:['jee.main.physics.current_electricity']),
  Chapter(conceptId:'jee.main.physics.magnetic_effects', name:'Magnetic Effects of Current and Magnetism', topic:'Magnetic Effects of Current and Magnetism', subject:'Physics', difficulty:0.61, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.current_electricity'], curriculumPaths:['jee.main.physics.magnetic_effects']),
  Chapter(conceptId:'jee.main.physics.emi_alternating_currents', name:'Electromagnetic Induction and Alternating Currents', topic:'Electromagnetic Induction and Alternating Currents', subject:'Physics', difficulty:0.63, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.magnetic_effects'], curriculumPaths:['jee.main.physics.emi_alternating_currents']),
  Chapter(conceptId:'jee.main.physics.electromagnetic_waves', name:'Electromagnetic Waves', topic:'Electromagnetic Waves', subject:'Physics', difficulty:0.65, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.emi_alternating_currents'], curriculumPaths:['jee.main.physics.electromagnetic_waves']),
  Chapter(conceptId:'jee.main.physics.optics', name:'Optics', topic:'Optics', subject:'Physics', difficulty:0.67, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.electromagnetic_waves'], curriculumPaths:['jee.main.physics.optics']),
  Chapter(conceptId:'jee.main.physics.dual_nature', name:'Dual Nature of Matter and Radiation', topic:'Dual Nature of Matter and Radiation', subject:'Physics', difficulty:0.69, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.optics'], curriculumPaths:['jee.main.physics.dual_nature']),
  Chapter(conceptId:'jee.main.physics.atoms_nuclei', name:'Atoms and Nuclei', topic:'Atoms and Nuclei', subject:'Physics', difficulty:0.71, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.dual_nature'], curriculumPaths:['jee.main.physics.atoms_nuclei']),
  Chapter(conceptId:'jee.main.physics.electronic_devices', name:'Electronic Devices', topic:'Electronic Devices', subject:'Physics', difficulty:0.73, difficultyLabel:'Advanced', prerequisites:['jee.main.physics.atoms_nuclei'], curriculumPaths:['jee.main.physics.electronic_devices']),
  Chapter(conceptId:'jee.main.physics.experimental_skills', name:'Experimental Skills', topic:'Experimental Skills', subject:'Physics', difficulty:0.75, difficultyLabel:'Boss', prerequisites:['jee.main.physics.electronic_devices'], curriculumPaths:['jee.main.physics.experimental_skills']),
  Chapter(conceptId:'jee.main.chemistry.some_basic_concepts', name:'Some Basic Concepts of Chemistry', topic:'Some Basic Concepts of Chemistry', subject:'Chemistry', difficulty:0.37, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['jee.main.chemistry.some_basic_concepts']),
  Chapter(conceptId:'jee.main.chemistry.atomic_structure', name:'Atomic Structure', topic:'Atomic Structure', subject:'Chemistry', difficulty:0.39, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.some_basic_concepts'], curriculumPaths:['jee.main.chemistry.atomic_structure']),
  Chapter(conceptId:'jee.main.chemistry.chemical_bonding', name:'Chemical Bonding and Molecular Structure', topic:'Chemical Bonding and Molecular Structure', subject:'Chemistry', difficulty:0.41, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.atomic_structure'], curriculumPaths:['jee.main.chemistry.chemical_bonding']),
  Chapter(conceptId:'jee.main.chemistry.chemical_thermodynamics', name:'Chemical Thermodynamics', topic:'Chemical Thermodynamics', subject:'Chemistry', difficulty:0.43, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.chemical_bonding'], curriculumPaths:['jee.main.chemistry.chemical_thermodynamics']),
  Chapter(conceptId:'jee.main.chemistry.solutions', name:'Solutions', topic:'Solutions', subject:'Chemistry', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.chemical_thermodynamics'], curriculumPaths:['jee.main.chemistry.solutions']),
  Chapter(conceptId:'jee.main.chemistry.equilibrium', name:'Equilibrium', topic:'Equilibrium', subject:'Chemistry', difficulty:0.47, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.solutions'], curriculumPaths:['jee.main.chemistry.equilibrium']),
  Chapter(conceptId:'jee.main.chemistry.redox_electrochemistry', name:'Redox Reactions and Electrochemistry', topic:'Redox Reactions and Electrochemistry', subject:'Chemistry', difficulty:0.49, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.equilibrium'], curriculumPaths:['jee.main.chemistry.redox_electrochemistry']),
  Chapter(conceptId:'jee.main.chemistry.chemical_kinetics', name:'Chemical Kinetics', topic:'Chemical Kinetics', subject:'Chemistry', difficulty:0.51, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.redox_electrochemistry'], curriculumPaths:['jee.main.chemistry.chemical_kinetics']),
  Chapter(conceptId:'jee.main.chemistry.classification_periodicity', name:'Classification of Elements and Periodicity in Properties', topic:'Classification of Elements and Periodicity in Properties', subject:'Chemistry', difficulty:0.53, difficultyLabel:'Intermediate', prerequisites:['jee.main.chemistry.chemical_kinetics'], curriculumPaths:['jee.main.chemistry.classification_periodicity']),
  Chapter(conceptId:'jee.main.chemistry.p_block_elements', name:'p-Block Elements', topic:'p-Block Elements', subject:'Chemistry', difficulty:0.55, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.classification_periodicity'], curriculumPaths:['jee.main.chemistry.p_block_elements']),
  Chapter(conceptId:'jee.main.chemistry.d_f_block_elements', name:'d- and f-Block Elements', topic:'d- and f-Block Elements', subject:'Chemistry', difficulty:0.57, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.p_block_elements'], curriculumPaths:['jee.main.chemistry.d_f_block_elements']),
  Chapter(conceptId:'jee.main.chemistry.coordination_compounds', name:'Coordination Compounds', topic:'Coordination Compounds', subject:'Chemistry', difficulty:0.59, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.d_f_block_elements'], curriculumPaths:['jee.main.chemistry.coordination_compounds']),
  Chapter(conceptId:'jee.main.chemistry.purification_organic', name:'Purification and Characterisation of Organic Compounds', topic:'Purification and Characterisation of Organic Compounds', subject:'Chemistry', difficulty:0.61, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.coordination_compounds'], curriculumPaths:['jee.main.chemistry.purification_organic']),
  Chapter(conceptId:'jee.main.chemistry.basic_principles_organic', name:'Some Basic Principles of Organic Chemistry', topic:'Some Basic Principles of Organic Chemistry', subject:'Chemistry', difficulty:0.63, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.purification_organic'], curriculumPaths:['jee.main.chemistry.basic_principles_organic']),
  Chapter(conceptId:'jee.main.chemistry.hydrocarbons', name:'Hydrocarbons', topic:'Hydrocarbons', subject:'Chemistry', difficulty:0.65, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.basic_principles_organic'], curriculumPaths:['jee.main.chemistry.hydrocarbons']),
  Chapter(conceptId:'jee.main.chemistry.organic_halogens', name:'Organic Compounds Containing Halogens', topic:'Organic Compounds Containing Halogens', subject:'Chemistry', difficulty:0.67, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.hydrocarbons'], curriculumPaths:['jee.main.chemistry.organic_halogens']),
  Chapter(conceptId:'jee.main.chemistry.organic_oxygen', name:'Organic Compounds Containing Oxygen', topic:'Organic Compounds Containing Oxygen', subject:'Chemistry', difficulty:0.69, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.organic_halogens'], curriculumPaths:['jee.main.chemistry.organic_oxygen']),
  Chapter(conceptId:'jee.main.chemistry.organic_nitrogen', name:'Organic Compounds Containing Nitrogen', topic:'Organic Compounds Containing Nitrogen', subject:'Chemistry', difficulty:0.71, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.organic_oxygen'], curriculumPaths:['jee.main.chemistry.organic_nitrogen']),
  Chapter(conceptId:'jee.main.chemistry.biomolecules', name:'Biomolecules', topic:'Biomolecules', subject:'Chemistry', difficulty:0.73, difficultyLabel:'Advanced', prerequisites:['jee.main.chemistry.organic_nitrogen'], curriculumPaths:['jee.main.chemistry.biomolecules']),
  Chapter(conceptId:'jee.main.chemistry.principles_practical_chemistry', name:'Principles Related to Practical Chemistry', topic:'Principles Related to Practical Chemistry', subject:'Chemistry', difficulty:0.75, difficultyLabel:'Boss', prerequisites:['jee.main.chemistry.biomolecules'], curriculumPaths:['jee.main.chemistry.principles_practical_chemistry']),
  Chapter(conceptId:'jee.main.maths.sets_relations_functions', name:'SETS,RELATIONS AND FUNCTIONS', topic:'SETS,RELATIONS AND FUNCTIONS', subject:'Mathematics', difficulty:0.37, difficultyLabel:'Intermediate', prerequisites:[], curriculumPaths:['jee.main.maths.sets_relations_functions']),
  Chapter(conceptId:'jee.main.maths.complex_numbers_quadratic', name:'COMPLEX NUMBERS AND QUADRATIC EQUATIONS', topic:'COMPLEX NUMBERS AND QUADRATIC EQUATIONS', subject:'Mathematics', difficulty:0.39, difficultyLabel:'Intermediate', prerequisites:['jee.main.maths.sets_relations_functions'], curriculumPaths:['jee.main.maths.complex_numbers_quadratic']),
  Chapter(conceptId:'jee.main.maths.matrices_determinants', name:'MATRICES AND DETERMINANTS', topic:'MATRICES AND DETERMINANTS', subject:'Mathematics', difficulty:0.41, difficultyLabel:'Intermediate', prerequisites:['jee.main.maths.complex_numbers_quadratic'], curriculumPaths:['jee.main.maths.matrices_determinants']),
  Chapter(conceptId:'jee.main.maths.permutations_combinations', name:'PERMUTATIONS AND COMBINATIONS', topic:'PERMUTATIONS AND COMBINATIONS', subject:'Mathematics', difficulty:0.43, difficultyLabel:'Intermediate', prerequisites:['jee.main.maths.matrices_determinants'], curriculumPaths:['jee.main.maths.permutations_combinations']),
  Chapter(conceptId:'jee.main.maths.binomial_theorem', name:'BINOMIAL THEOREM AND ITS SIMPLE APPLICATIONS', topic:'BINOMIAL THEOREM AND ITS SIMPLE APPLICATIONS', subject:'Mathematics', difficulty:0.45, difficultyLabel:'Intermediate', prerequisites:['jee.main.maths.permutations_combinations'], curriculumPaths:['jee.main.maths.binomial_theorem']),
  Chapter(conceptId:'jee.main.maths.sequence_series', name:'SEQUENCE AND SERIES', topic:'SEQUENCE AND SERIES', subject:'Mathematics', difficulty:0.47, prerequisites:['jee.main.maths.binomial_theorem'], curriculumPaths:['jee.main.maths.sequence_series']),
  Chapter(conceptId:'jee.main.maths.limit_continuity_differentiability', name:'LIMIT, CONTINUITY AND DIFFERENTIABILITY', topic:'LIMIT, CONTINUITY AND DIFFERENTIABILITY', subject:'Mathematics', difficulty:0.49, prerequisites:['jee.main.maths.sequence_series'], curriculumPaths:['jee.main.maths.limit_continuity_differentiability']),
  Chapter(conceptId:'jee.main.maths.integral_calculus', name:'INTEGRAL CALCULUS', topic:'INTEGRAL CALCULUS', subject:'Mathematics', difficulty:0.51, prerequisites:['jee.main.maths.limit_continuity_differentiability'], curriculumPaths:['jee.main.maths.integral_calculus']),
  Chapter(conceptId:'jee.main.maths.differential_equations', name:'DIFFERENTIAL EQUATIONS', topic:'DIFFERENTIAL EQUATIONS', subject:'Mathematics', difficulty:0.53, prerequisites:['jee.main.maths.integral_calculus'], curriculumPaths:['jee.main.maths.differential_equations']),
  Chapter(conceptId:'jee.main.maths.coordinate_geometry', name:'CO-ORDINATE GEOMETRY', topic:'CO-ORDINATE GEOMETRY', subject:'Mathematics', difficulty:0.55, prerequisites:['jee.main.maths.differential_equations'], curriculumPaths:['jee.main.maths.coordinate_geometry']),
  Chapter(conceptId:'jee.main.maths.three_dimensional_geometry', name:'THREE DIMENSIONAL GEOMETRY', topic:'THREE DIMENSIONAL GEOMETRY', subject:'Mathematics', difficulty:0.57, prerequisites:['jee.main.maths.coordinate_geometry'], curriculumPaths:['jee.main.maths.three_dimensional_geometry']),
  Chapter(conceptId:'jee.main.maths.vector_algebra', name:'VECTOR ALGEBRA', topic:'VECTOR ALGEBRA', subject:'Mathematics', difficulty:0.59, prerequisites:['jee.main.maths.three_dimensional_geometry'], curriculumPaths:['jee.main.maths.vector_algebra']),
  Chapter(conceptId:'jee.main.maths.statistics_probability', name:'STATISTICS AND PROBABILITY', topic:'STATISTICS AND PROBABILITY', subject:'Mathematics', difficulty:0.61, prerequisites:['jee.main.maths.vector_algebra'], curriculumPaths:['jee.main.maths.statistics_probability']),
  Chapter(conceptId:'jee.main.maths.trigonometry', name:'TRIGONOMETRY', topic:'TRIGONOMETRY', subject:'Mathematics', difficulty:0.63, prerequisites:['jee.main.maths.statistics_probability'], curriculumPaths:['jee.main.maths.trigonometry']),
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
