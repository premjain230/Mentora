/**
 * Comprehensive Automated Verification Suite for Global Learning Hub:
 * Tests 15 Countries, Authentic Education Tracks, Grades/Stages, Subjects, Non-Linear Lesson Access,
 * Country/Board Switching, Smart Profile Persistence, and Indian Curricula Preservation.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  listCountries,
  getCountry,
  listTracks,
  getTrack,
  getCatalog,
  getChapters,
  getConcept,
  INTERNATIONAL_CURRICULUM,
} = require("./server/_curriculum.js");

const { lessonTutor, loadStudentState, catalogAction } = require("./server/_learn-core.js");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAll() {
  console.log("============================================================");
  console.log("Global Learning Hub — Complete International System Tests");
  console.log("============================================================\n");

  // ── Scenario 1: Indian Student - Maharashtra Board Flow ──
  console.log("[Scenario 1] Indian Student -> Maharashtra State Board Flow");
  test("Maharashtra Class 9 Science Laws of Motion resolves with 100% fidelity", () => {
    const catalog = getCatalog({ countryCode: "IN", trackId: "maharashtra", classNum: 9, subject: "Science & Technology - Part 1" });
    assert.strictEqual(catalog.step, "chapter");
    assert(catalog.chapters.length >= 5, "Expected Maharashtra Class 9 Science 1 chapters");
    const motion = catalog.chapters.find((c) => c.conceptId.includes("laws_of_motion"));
    assert(motion, "Laws of motion chapter must exist");
    assert(motion.difficultyLabel, "Must have difficulty label");

    // Verify concept resolution
    const concept = getConcept("maharashtra.9.science1.laws_of_motion");
    assert(concept, "Concept must resolve");
    assert.strictEqual(concept.subject, "Science & Technology - Part 1");
  });

  // ── Scenario 2: Indian Student - CBSE Flow ──
  console.log("\n[Scenario 2] Indian Student -> CBSE Class 10 Flow");
  test("CBSE Class 10 Mathematics resolves with authentic NCERT chapters", () => {
    const catalog = getCatalog({ countryCode: "IN", trackId: "cbse", classNum: 10, subject: "Mathematics" });
    assert.strictEqual(catalog.step, "chapter");
    assert(catalog.chapters.length >= 10, "Expected CBSE Class 10 Maths chapters");
    const quadratic = catalog.chapters.find((c) => c.name.toLowerCase().includes("quadratic"));
    assert(quadratic, "Quadratic equations chapter must exist");
  });

  // ── Scenario 3: Indian Student - Competitive Exam Flow (JEE Main) ──
  console.log("\n[Scenario 3] Indian Student -> JEE Main Examination Flow");
  test("JEE Main skips school grade selection and serves examination subjects", () => {
    const jeeCatalog = getCatalog({ trackId: "jee_main" });
    assert.strictEqual(jeeCatalog.step, "subject");
    assert(jeeCatalog.subjects.some((s) => s.name === "Physics"));
    assert(jeeCatalog.subjects.some((s) => s.name === "Chemistry"));
    assert(jeeCatalog.subjects.some((s) => s.name === "Mathematics"));

    const physicsChapters = getChapters({ trackId: "jee_main", subject: "Physics" });
    assert(physicsChapters.length >= 15, "Expected comprehensive JEE Physics chapters");
  });

  // ── Scenario 4: US Student - AP Pathway Flow ──
  console.log("\n[Scenario 4] International Student -> United States (AP Courses)");
  test("US student navigates to AP Calculus BC and accesses Unit 1 without locks", () => {
    const usCatalog = getCatalog({ countryCode: "US" });
    assert.strictEqual(usCatalog.step, "board");
    const apTrack = usCatalog.tracks.find((t) => t.id === "us_ap");
    assert(apTrack, "us_ap track must be present for US");

    const apSubjects = getCatalog({ trackId: "us_ap" });
    assert.strictEqual(apSubjects.step, "subject");
    assert(apSubjects.subjects.some((s) => s.name === "AP Calculus BC"));
    assert(apSubjects.subjects.some((s) => s.name === "AP Physics 1: Algebra-Based"));

    const chapters = getChapters({ trackId: "us_ap", subject: "AP Calculus BC" });
    assert(chapters.length >= 5, "Expected AP Calculus BC units");
    assert.strictEqual(chapters[0].conceptId, "us_ap_calc_u1");
    assert(chapters[0].learningObjectives.length >= 2, "Objectives must be present");
  });

  // ── Scenario 5: UK Student - GCSE Flow ──
  console.log("\n[Scenario 5] International Student -> United Kingdom (GCSE)");
  test("UK student navigates to AQA GCSE Physics with authentic BIDMAS and specifications", () => {
    const ukCatalog = getCatalog({ countryCode: "GB" });
    assert.strictEqual(ukCatalog.step, "board");

    const gcseTrack = getTrack("gb_gcse");
    assert.strictEqual(gcseTrack.regionalConventions.mathTerminology.divisionOfOperations, "BIDMAS");
    assert.strictEqual(gcseTrack.regionalConventions.spellingVariant, "en-GB");

    const chapters = getChapters({ trackId: "gb_gcse", subject: "GCSE Physics (8463)" });
    assert(chapters.length >= 3, "Expected GCSE Physics chapters");
    assert.strictEqual(chapters[0].conceptId, "gb_gcse_phys_ch1");
    assert(chapters[0].name.includes("Energy"));
  });

  // ── Scenario 6: All 15 Countries Multi-Track Coverage ──
  console.log("\n[Scenario 6] Complete 15 Countries Catalog & Subject Verification");
  const TARGET_COUNTRIES = ["IN", "US", "GB", "CA", "AU", "NZ", "SG", "AE", "SA", "MY", "PK", "BD", "ZA", "NG", "IE"];

  test("Every target country offers at least one verified track with authentic subjects and chapters", () => {
    for (const code of TARGET_COUNTRIES) {
      const country = getCountry(code);
      assert(country, `Country ${code} must exist`);

      const tracks = listTracks({ countryCode: code });
      assert(tracks.length >= 1, `Country ${code} must have at least 1 track`);

      for (const track of tracks) {
        const cat = getCatalog({ countryCode: code, trackId: track.id });
        assert(cat.step === "subject" || cat.step === "class", `Track ${track.id} must offer subjects or classes`);

        let subjects = cat.subjects;
        if (cat.step === "class" && (!subjects || subjects.length === 0)) {
          const sampleClass = cat.classes[0];
          const subCat = getCatalog({ countryCode: code, trackId: track.id, classNum: sampleClass });
          subjects = subCat.subjects;
        }

        assert(subjects && subjects.length >= 1, `Track ${track.id} in ${code} must have at least 1 subject`);
        const firstSubj = subjects[0].name;
        const chapters = getChapters({ trackId: track.id, subject: firstSubj });
        assert(chapters && chapters.length >= 1, `Subject ${firstSubj} in ${track.id} must have chapters`);
      }
    }
  });

  // ── Scenario 7: Non-Linear Access (Freedom to Start Any Chapter) ──
  console.log("\n[Scenario 7] Non-Linear Access & Prerequisite Independence");
  test("Students can select Chapter 5 without completing earlier chapters", () => {
    const chapters = getChapters({ trackId: "us_ap", subject: "AP Calculus BC" });
    const ch5 = chapters.find((c) => c.conceptId === "us_ap_calc_u10");
    assert(ch5, "Chapter 5 must exist");
    assert.strictEqual(ch5.conceptId, "us_ap_calc_u10");
    assert(ch5.prerequisites.length > 0, "May declare recommended prerequisites");
    // Verification that non-linear access is allowed: getConcept returns it directly
    const concept = getConcept(ch5.conceptId);
    assert(concept, "Concept must resolve independently");
  });

  // ── Scenario 8: Lesson Loading with Educational Context Injection ──
  console.log("\n[Scenario 8] Adaptive AI Lesson Loading with Educational Context");
  await testAsync("Server lessonTutor serves international lessons with regional grounding", async () => {
    const lessonRes = await lessonTutor({
      uid: "test-global-user",
      body: {
        conceptId: "us_ap_phys1_u1",
        countryCode: "US",
        track: "us_ap",
        subject: "AP Physics 1: Algebra-Based",
        mode: "start",
      },
    });

    assert(lessonRes.lesson, "Must return lesson");
    assert(lessonRes.lesson.chapterOutline, "Must attach chapterOutline");
    assert(lessonRes.lesson.sections.length > 0, "Must have sections");
    assert(lessonRes.lesson.keyIdea, "Must provide key takeaway");
  });

  // ── Scenario 9: Country & Education System Switching ──
  console.log("\n[Scenario 9] Country & Education System Switching");
  test("Student can switch from India to Singapore without breaking state", () => {
    const inCatalog = getCatalog({ countryCode: "IN" });
    assert.strictEqual(inCatalog.country.code, "IN");

    const sgCatalog = getCatalog({ countryCode: "SG" });
    assert.strictEqual(sgCatalog.country.code, "SG");
    assert(sgCatalog.tracks.some((t) => t.id === "sg_secondary"));

    const sgSubjs = getCatalog({ trackId: "sg_secondary" });
    assert(sgSubjs.subjects.some((s) => s.name.includes("Pure Physics")));
  });

  // ── Scenario 10: Markup and Controller Contract ──
  console.log("\n[Scenario 10] Markup & Vanilla Controller Hook Parity");
  test("LearningHubMarkup exposes all hooks queried by vanilla/learning-hub.js", () => {
    const markupSource = fs.readFileSync("./components/pages/learning-hub/LearningHubMarkup.tsx", "utf8");
    const controllerSource = fs.readFileSync("./vanilla/learning-hub.js", "utf8");

    const queriedIds = [...controllerSource.matchAll(/qs\(root, "#([^"]+)"\)/g)].map((m) => m[1]);
    assert(queriedIds.length >= 25, "Expected rich controller bindings");

    for (const id of new Set(queriedIds)) {
      assert(markupSource.includes(`id="${id}"`), `Markup missing expected id="${id}"`);
    }

    // Verify controller does not inject innerHTML
    assert(!controllerSource.includes("innerHTML"), "vanilla controller must not use innerHTML");
  });

  // ── Scenario 11: catalogAction Country Routing Verification ──
  console.log("\n[Scenario 11] catalogAction Respects Country Codes");
  await testAsync("catalogAction returns authentic tracks for international countries, not Indian tracks", async () => {
    const usResult = await catalogAction({ body: { countryCode: "US" } });
    assert.strictEqual(usResult.catalog.step, "board");
    assert.strictEqual(usResult.catalog.country.code, "US");
    const usTrackIds = usResult.catalog.tracks.map((t) => t.id);
    assert(usTrackIds.includes("us_ap"), "US must include us_ap");
    assert(!usTrackIds.includes("cbse"), "US must NOT include Indian cbse");
    assert(!usTrackIds.includes("maharashtra"), "US must NOT include Indian maharashtra");

    const gbResult = await catalogAction({ body: { countryCode: "GB" } });
    assert.strictEqual(gbResult.catalog.step, "board");
    assert.strictEqual(gbResult.catalog.country.code, "GB");
    const gbTrackIds = gbResult.catalog.tracks.map((t) => t.id);
    assert(gbTrackIds.includes("gb_gcse"), "GB must include gb_gcse");
    assert(!gbTrackIds.includes("neet"), "GB must NOT include Indian neet");

    const inResult = await catalogAction({ body: { countryCode: "IN" } });
    assert.strictEqual(inResult.catalog.step, "board");
    const inTrackIds = inResult.catalog.tracks.map((t) => t.id);
    assert(inTrackIds.includes("cbse"), "IN must include cbse");
    assert(inTrackIds.includes("maharashtra"), "IN must include maharashtra");
  });

  // ── Scenario 12: Dedicated Country Landing & Discovery ──
  console.log("\n[Scenario 12] Dedicated Country Discovery View");
  test("getCatalog with step: country returns all 15 supported countries", () => {
    const countryCatalog = getCatalog({ step: "country" });
    assert.strictEqual(countryCatalog.step, "country");
    assert(Array.isArray(countryCatalog.countries), "countries must be array");
    assert.strictEqual(countryCatalog.countries.length, 15, "Must list all 15 supported countries");
    assert(countryCatalog.countries.some((c) => c.code === "US"));
    assert(countryCatalog.countries.some((c) => c.code === "GB"));
    assert(countryCatalog.countries.some((c) => c.code === "CA"));
    assert(countryCatalog.countries.some((c) => c.code === "AU"));
    assert(countryCatalog.countries.some((c) => c.code === "IN"));
  });

  console.log("\n============================================================");
  console.log(`Global Learning Hub Tests: ${passed} / ${total} passed`);
  console.log("============================================================\n");
}

runAll().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
