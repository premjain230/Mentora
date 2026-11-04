// test_dedicated_learning_experience.js
// Comprehensive Verification Suite for Dedicated Concept Learning Experience
// Tests the 10 required curriculum comparisons, automated content uniqueness checks,
// subject-aware layout selection, and dedicated URL routing.

const assert = require("assert");

const {
  resolveDedicatedConceptPackage,
  inferSubjectType,
  inferLayoutType,
  listRegisteredConcepts
} = require("./server/_concept-engine");

const {
  getConceptPackage
} = require("./server/_concept-registry");

const {
  getChapterOutline,
  getChapterMetadata
} = require("./server/_chapter-engine");

const {
  lessonTutor,
  evaluateTutor,
  catalogAction,
  chapterAction
} = require("./server/_learn-core");

async function runDedicatedExperienceTests() {
  console.log("============================================================");
  console.log("Learning Allied — Dedicated Concept Experience Verification");
  console.log("============================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log("[Suite 1] 10 Required Curriculum & Subject Comparisons");

  // 1. Maharashtra Board Physics — Motion
  test("1. Maharashtra Board Physics: Laws of Motion (Distance vs Displacement)", () => {
    const pkg = resolveDedicatedConceptPackage("maharashtra.9.science1.laws_of_motion", "distance_displacement_velocity");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "maharashtra");
    assert.strictEqual(pkg.subjectType, "physics");
    assert.strictEqual(pkg.layoutType, "physics_simulation");
    assert.strictEqual(pkg.conceptTitle, "Distance, Displacement, Speed and Velocity");
    assert.ok(pkg.learningObjectives.some(o => o.includes("scalar distance") && o.includes("vector displacement")));
    assert.ok(pkg.explain.definition.includes("minimum distance in a straight line"));
    assert.strictEqual(pkg.visualize.visualType, "motion_simulation");
    assert.strictEqual(pkg.practice.questions[0].expectedAnswer, "Distance = 1700 m, Displacement = 1300 m");
  });

  // 2. Two Different Concepts from the Same Chapter (Laws of Motion: Concept A vs Concept B)
  test("2. Intra-Chapter Differentiation: Concept A vs Concept B in Laws of Motion", () => {
    const pkgA = resolveDedicatedConceptPackage("maharashtra.9.science1.laws_of_motion", "distance_displacement_velocity");
    const pkgB = resolveDedicatedConceptPackage("maharashtra.9.science1.laws_of_motion", "acceleration_kinematic_equations");

    assert.ok(pkgA && pkgB, "Both concepts must resolve dedicated packages");
    assert.notStrictEqual(pkgA.conceptTitle, pkgB.conceptTitle, "Titles must be distinct");
    assert.notStrictEqual(pkgA.explain.definition, pkgB.explain.definition, "Definitions must be distinct");
    assert.notStrictEqual(pkgA.explain.keyTakeaway, pkgB.explain.keyTakeaway, "Key takeaways must be distinct");
    assert.notStrictEqual(pkgA.visualize.title, pkgB.visualize.title, "Visual titles must be distinct");
    assert.notStrictEqual(pkgA.practice.questions[0].prompt, pkgB.practice.questions[0].prompt, "Practice questions must be distinct");
    assert.notStrictEqual(pkgA.remember.essentialFormulas[0], pkgB.remember.essentialFormulas[0], "Formulas must be distinct");

    // Zero overlap in practice question IDs
    assert.strictEqual(pkgA.practice.questions[0].id, "mh9_motion_q1");
    assert.strictEqual(pkgB.practice.questions[0].id, "mh9_acc_q1");
  });

  // 3. CBSE Physics — Motion
  test("3. CBSE Physics: Motion (Uniform Motion and Distance-Time Graphs)", () => {
    const pkg = resolveDedicatedConceptPackage("cbse.9.science.motion", "uniform_motion_and_graphs");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "cbse");
    assert.strictEqual(pkg.board, "CBSE (NCERT)");
    assert.strictEqual(pkg.conceptTitle, "Uniform Motion, Non-Uniform Motion and Distance-Time Graphs");
    assert.ok(pkg.learningObjectives.some(o => o.includes("Distance-Time (s-t) graphs")));
    assert.strictEqual(pkg.visualize.visualType, "interactive_graph");
    assert.ok(pkg.explain.sections.some(s => s.heading.includes("Distance-Time Graphs")));
  });

  // 4. JEE Main Physics — Kinematics
  test("4. JEE Main Physics: Kinematics (Projectile Motion in 2D)", () => {
    const pkg = resolveDedicatedConceptPackage("jee.main.physics.kinematics", "projectile_motion");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "jee_main");
    assert.strictEqual(pkg.difficultyLabel, "Advanced");
    assert.ok(pkg.explain.detailedExplanation.includes("y = x * tan theta * (1 - x / R)"));
    assert.ok(pkg.learningObjectives.some(o => o.toLowerCase().includes("time of flight t")));
    assert.strictEqual(pkg.visualize.visualType, "motion_simulation");
    assert.ok(pkg.practice.questions[0].expectedAnswer.includes("125√3 m"));
  });

  // 5. JEE Advanced Physics — Laws of Motion
  test("5. JEE Advanced Physics: Laws of Motion (Pseudo Forces & Friction)", () => {
    const outline = getChapterOutline("jee.main.physics.laws_of_motion");
    assert.ok(outline, "Must have outline for JEE Laws of Motion");
    assert.ok(outline.concepts.some(c => c.id === "pseudo_forces_non_inertial"));
    const pkg = resolveDedicatedConceptPackage("jee.main.physics.laws_of_motion", "pseudo_forces_non_inertial");
    assert.ok(pkg, "Must resolve package");
    assert.strictEqual(pkg.subjectType, "physics");
    assert.strictEqual(pkg.layoutType, "physics_simulation");
    assert.ok(pkg.conceptTitle.includes("Non-Inertial Reference Frames and Pseudo Forces"));
  });

  // 6. NEET Biology — Cell: The Unit of Life
  test("6. NEET Biology: Cell Organelles and Fluid Mosaic Model", () => {
    const pkg = resolveDedicatedConceptPackage("neet.biology.cell.organelles_and_membrane", "organelles_and_membrane");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "neet");
    assert.strictEqual(pkg.subjectType, "biology");
    assert.strictEqual(pkg.layoutType, "biology_diagram");
    assert.ok(pkg.learningObjectives.some(o => o.includes("Singer and Nicolson's Fluid Mosaic Model")));
    assert.strictEqual(pkg.visualize.visualType, "labelled_diagram");
    assert.strictEqual(pkg.practice.questions[0].expectedAnswer, "C) Peroxisomes");
  });

  // 7. Chemistry — Chemical Reactions and Equations
  test("7. Chemistry: Balancing Chemical Equations and Reaction Types", () => {
    const pkg = resolveDedicatedConceptPackage("cbse.10.science.chemical_reactions_and_equations", "balancing_and_types");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.subjectType, "chemistry");
    assert.strictEqual(pkg.layoutType, "chemistry_reaction");
    assert.ok(pkg.learningObjectives.some(o => o.includes("Law of Conservation of Mass")));
    assert.strictEqual(pkg.visualize.visualType, "chemical_reaction");
    assert.ok(pkg.practice.questions[0].expectedAnswer.includes("2Al + Fe2O3 -> Al2O3 + 2Fe"));
  });

  // 8. Mathematics — Quadratic Equations
  test("8. Mathematics: Quadratic Formula and Nature of Roots", () => {
    const pkg = resolveDedicatedConceptPackage("cbse.10.mathematics.quadratic_equations", "roots_and_discriminant");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.subjectType, "mathematics");
    assert.strictEqual(pkg.layoutType, "math_derivation");
    assert.ok(pkg.learningObjectives.some(o => o.includes("Sridharacharya's rule")));
    assert.strictEqual(pkg.visualize.visualType, "step_by_step_derivation");
    assert.strictEqual(pkg.practice.questions[0].expectedAnswer, "D = -8, No real roots");
  });

  // 9. History — Sources of History
  test("9. History: Sources of History (Written, Material, Oral, Audio-Visual)", () => {
    const pkg = resolveDedicatedConceptPackage("maharashtra.9.history.sources_of_history", "primary_and_secondary_sources");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "maharashtra");
    assert.strictEqual(pkg.subjectType, "history");
    assert.strictEqual(pkg.layoutType, "history_timeline");
    assert.ok(pkg.explain.sections[0].highlight.includes("National Archives of India"));
    assert.strictEqual(pkg.visualize.visualType, "historical_timeline");
    assert.strictEqual(pkg.practice.questions[0].expectedAnswer, "B) New Delhi");
  });

  // 10. Geography — Distributional Maps
  test("10. Geography: Distributional Maps (Dot, Choropleth, Isopleth)", () => {
    const pkg = resolveDedicatedConceptPackage("maharashtra.9.geography.distributional_maps", "thematic_mapping_methods");
    assert.ok(pkg, "Must resolve dedicated package");
    assert.strictEqual(pkg.curriculumTrack, "maharashtra");
    assert.strictEqual(pkg.subjectType, "geography");
    assert.strictEqual(pkg.layoutType, "geography_map");
    assert.ok(pkg.learningObjectives.some(o => o.includes("Dot Method")));
    assert.ok(pkg.learningObjectives.some(o => o.includes("Choropleth Method")));
    assert.ok(pkg.learningObjectives.some(o => o.includes("Isopleth Method")));
    assert.strictEqual(pkg.visualize.visualType, "geographic_map");
    assert.strictEqual(pkg.practice.questions[0].expectedAnswer, "C) Isopleth Method");
  });

  console.log("\n[Suite 2] Automated Uniqueness and Plagiarism Checks");

  test("Automated Uniqueness: No two registered concept packages share definitions or questions", () => {
    const allKeys = listRegisteredConcepts();
    assert.ok(allKeys.length >= 8, `Must have registered concept packages, found ${allKeys.length}`);

    const titles = new Set();
    const definitions = new Set();
    const questionPrompts = new Set();

    for (const key of allKeys) {
      const pkg = getConceptPackage(key);
      assert.ok(pkg, `Package must load for ${key}`);

      // Check title uniqueness
      assert.ok(!titles.has(pkg.conceptTitle), `Duplicate concept title detected: ${pkg.conceptTitle}`);
      titles.add(pkg.conceptTitle);

      // Check definition uniqueness
      const def = pkg.explain.definition;
      assert.ok(!definitions.has(def), `Duplicate definition detected for ${key}`);
      definitions.add(def);

      // Check question prompt uniqueness
      const prompt = pkg.practice.questions[0].prompt;
      assert.ok(!questionPrompts.has(prompt), `Duplicate question prompt detected for ${key}`);
      questionPrompts.add(prompt);
    }
  });

  test("Automated Subject-Type and Layout-Type Classification", () => {
    assert.strictEqual(inferSubjectType("Physics"), "physics");
    assert.strictEqual(inferSubjectType("Science & Technology - Part 1"), "physics");
    assert.strictEqual(inferSubjectType("Chemistry"), "chemistry");
    assert.strictEqual(inferSubjectType("Biology"), "biology");
    assert.strictEqual(inferSubjectType("Mathematics"), "mathematics");
    assert.strictEqual(inferSubjectType("History"), "history");
    assert.strictEqual(inferSubjectType("Geography"), "geography");

    assert.strictEqual(inferLayoutType("physics", "Projectile Motion"), "physics_simulation");
    assert.strictEqual(inferLayoutType("biology", "Cell Structure"), "biology_diagram");
    assert.strictEqual(inferLayoutType("mathematics", "Quadratic Equations"), "math_derivation");
    assert.strictEqual(inferLayoutType("chemistry", "Chemical Reactions"), "chemistry_reaction");
    assert.strictEqual(inferLayoutType("history", "Sources of History"), "history_timeline");
    assert.strictEqual(inferLayoutType("geography", "Distributional Maps"), "geography_map");
  });

  console.log("\n[Suite 3] Server Core End-to-End Delivery");

  await testAsync("lessonTutor serves dedicated package with subConceptId", async () => {
    const res = await lessonTutor({
      uid: "test_user_dedicated",
      body: {
        conceptId: "maharashtra.9.science1.laws_of_motion",
        subConceptId: "distance_displacement_velocity"
      }
    });

    assert.ok(res.lesson, "Must return lesson object");
    assert.strictEqual(res.lesson.name, "Distance, Displacement, Speed and Velocity");
    assert.strictEqual(res.lesson.subjectType, "physics");
    assert.strictEqual(res.lesson.layoutType, "physics_simulation");
    assert.strictEqual(res.lesson.visual.renderer, "motion_simulation");
    assert.strictEqual(res.lesson.check.questionId, "mh9_motion_q1");
    assert.strictEqual(res.lesson.reviewed, true);
  });

  await testAsync("evaluateTutor evaluates answer from dedicated concept question", async () => {
    const res = await evaluateTutor({
      uid: "test_user_dedicated",
      body: {
        conceptId: "maharashtra.9.science1.laws_of_motion",
        subConceptId: "distance_displacement_velocity",
        questionId: "mh9_motion_q1",
        question: "Find the total distance traveled and the magnitude of her displacement.",
        answer: "Distance = 1700 m, Displacement = 1300 m"
      }
    });

    assert.ok(res.evaluation, "Must return evaluation");
    assert.strictEqual(res.evaluation.verdict, "correct");
  });

  console.log(`\n============================================================`);
  console.log(`ALL VERIFICATIONS PASSED: ${passed}/${total} tests passed!`);
  console.log(`============================================================\n`);
}

runDedicatedExperienceTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
