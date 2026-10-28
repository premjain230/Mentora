/**
 * Diagnostic question bank — deterministic, subject/topic/concept mapped.
 * Reuses quiz BANK concepts but adds conceptId/difficulty/source.
 * Keep small (30-40 Q) to avoid bloat; scope filtering picks relevant slice.
 */
export const DIAGNOSTIC_BANK = [
  // Mathematics — Algebra
  { questionId:"diag_m_alg1", subject:"Mathematics", topic:"Algebra", conceptId:"mathematics_algebra", difficulty:0.3, type:"mcq", question:"Solve: 2x + 4 = 10. x = ?", options:["2","3","4","5"], answer:"B" },
  { questionId:"diag_m_alg2", subject:"Mathematics", topic:"Algebra", conceptId:"mathematics_algebra", difficulty:0.5, type:"mcq", question:"Roots of x² -5x+6=0 are?", options:["2,3","1,6","-2,-3","2,-3"], answer:"A" },
  { questionId:"diag_m_alg3", subject:"Mathematics", topic:"Algebra", conceptId:"mathematics_algebra_linear", difficulty:0.6, type:"mcq", question:"If x²=49, x = ?", options:["±7","7 only","-7 only","49"], answer:"A" },
  // Mathematics — Geometry
  { questionId:"diag_m_geo1", subject:"Mathematics", topic:"Geometry", conceptId:"mathematics_geometry", difficulty:0.4, type:"mcq", question:"Longest side in right triangle is?", options:["Adjacent","Opposite","Hypotenuse","Base"], answer:"C" },
  { questionId:"diag_m_geo2", subject:"Mathematics", topic:"Geometry", conceptId:"mathematics_geometry", difficulty:0.5, type:"mcq", question:"Area of circle r=7 (π=22/7)?", options:["154","44","88","308"], answer:"A" },
  // Mathematics — Trigonometry
  { questionId:"diag_m_trig1", subject:"Mathematics", topic:"Trigonometry", conceptId:"mathematics_trigonometry", difficulty:0.4, type:"mcq", question:"sin(90°) = ?", options:["0","1","-1","Undefined"], answer:"B" },
  { questionId:"diag_m_trig2", subject:"Mathematics", topic:"Trigonometry", conceptId:"mathematics_trigonometry", difficulty:0.5, type:"mcq", question:"sin²θ + cos²θ = ?", options:["0","1","2","tanθ"], answer:"B" },
  // Physics — Kinematics
  { questionId:"diag_p_kin1", subject:"Physics", topic:"Kinematics", conceptId:"physics_kinematics", difficulty:0.3, type:"mcq", question:"SI unit of velocity?", options:["m/s","m/s²","kg·m/s","Newton"], answer:"A" },
  { questionId:"diag_p_kin2", subject:"Physics", topic:"Kinematics", conceptId:"physics_kinematics", difficulty:0.5, type:"mcq", question:"Slope of displacement-time graph gives?", options:["Acceleration","Velocity","Force","Energy"], answer:"B" },
  { questionId:"diag_p_kin3", subject:"Physics", topic:"Kinematics", conceptId:"physics_kinematics", difficulty:0.6, type:"mcq", question:"Free fall acceleration on Earth ≈?", options:["8.9 m/s²","9.8 m/s²","10.8 m/s²","6.6 m/s²"], answer:"B" },
  // Physics — Laws of Motion
  { questionId:"diag_p_lom1", subject:"Physics", topic:"Laws of Motion", conceptId:"physics_laws_of_motion", difficulty:0.4, type:"mcq", question:"F=ma is Newton's?", options:["First Law","Second Law","Third Law","Zeroth"], answer:"B" },
  { questionId:"diag_p_lom2", subject:"Physics", topic:"Laws of Motion", conceptId:"physics_laws_of_motion", difficulty:0.5, type:"mcq", question:"Action-reaction is Newton's?", options:["First","Second","Third","None"], answer:"C" },
  // Chemistry — Atomic Structure
  { questionId:"diag_c_atom1", subject:"Chemistry", topic:"Atomic Structure", conceptId:"chemistry_atomic_structure", difficulty:0.3, type:"mcq", question:"Nucleus contains?", options:["Electrons only","Protons and neutrons","Protons only","Neutrons only"], answer:"B" },
  { questionId:"diag_c_atom2", subject:"Chemistry", topic:"Atomic Structure", conceptId:"chemistry_atomic_structure", difficulty:0.4, type:"mcq", question:"Isotopes have same number of?", options:["Neutrons","Protons","Electrons","Mass number"], answer:"B" },
  // Chemistry — Bonding
  { questionId:"diag_c_bond1", subject:"Chemistry", topic:"Chemical Bonding", conceptId:"chemistry_chemical_bonding", difficulty:0.4, type:"mcq", question:"Ionic bonds form by transfer of?", options:["Neutrons","Protons","Electrons","Photons"], answer:"C" },
  { questionId:"diag_c_bond2", subject:"Chemistry", topic:"Chemical Bonding", conceptId:"chemistry_chemical_bonding", difficulty:0.5, type:"mcq", question:"Water (H2O) bond type?", options:["Ionic","Covalent","Metallic","Hydrogen only"], answer:"B" },
  // Biology — Cell
  { questionId:"diag_b_cell1", subject:"Biology", topic:"Cell Biology", conceptId:"biology_cell_biology", difficulty:0.3, type:"mcq", question:"Powerhouse of cell is?", options:["Nucleus","Mitochondria","Ribosome","Golgi"], answer:"B" },
  { questionId:"diag_b_cell2", subject:"Biology", topic:"Cell Biology", conceptId:"biology_cell_biology", difficulty:0.5, type:"mcq", question:"Cell membrane mainly composed of?", options:["Cellulose","Phospholipids","Chitin","Starch"], answer:"B" },
  { questionId:"diag_b_cell3", subject:"Biology", topic:"Cell Biology", conceptId:"biology_cell_biology", difficulty:0.5, type:"mcq", question:"Photosynthesis organelle?", options:["Chloroplast","Mitochondria","Nucleus","Ribosome"], answer:"A" },
  // Biology — Genetics
  { questionId:"diag_b_gen1", subject:"Biology", topic:"Genetics", conceptId:"biology_genetics", difficulty:0.4, type:"mcq", question:"Basic unit of heredity is?", options:["Chromosome","Gene","Allele","Genome"], answer:"B" },
  { questionId:"diag_b_gen2", subject:"Biology", topic:"Genetics", conceptId:"biology_genetics", difficulty:0.5, type:"mcq", question:"Humans have how many chromosomes?", options:["44","46","48","23"], answer:"B" },
  // General — True/False examples
  { questionId:"diag_tf1", subject:"Mathematics", topic:"Algebra", conceptId:"mathematics_algebra", difficulty:0.3, type:"tf", question:"2 is a prime number.", options:["True","False"], answer:"A" },
  { questionId:"diag_tf2", subject:"Physics", topic:"Kinematics", conceptId:"physics_kinematics", difficulty:0.3, type:"tf", question:"Velocity is a scalar quantity.", options:["True","False"], answer:"B" },
];
