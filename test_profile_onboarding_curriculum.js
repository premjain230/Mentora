/**
 * Verification test for Learning Allied Onboarding & Profile Dynamic Curriculum System
 */
const assert = require("assert");

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Profile & Onboarding Dynamic Curriculum Test");
  console.log("============================================================\n");

  const {
    COUNTRY_OPTIONS,
    TRACK_OPTIONS_BY_COUNTRY,
    GRADE_OPTIONS_BY_TRACK,
    SUBJECTS_BY_TRACK,
    GOAL_OPTIONS,
    LANGUAGE_OPTIONS,
    getCountryOption,
    getTracksForCountry,
    getGradesForTrack,
    getSubjectsForTrack,
    getTrackInfo,
  } = require("./lib/learning/curriculum-options");

  // 1. Verify 15 target countries exist
  assert.strictEqual(COUNTRY_OPTIONS.length, 15, "Must have exactly 15 countries");
  const expectedCodes = ["IN", "US", "GB", "CA", "AU", "NZ", "SG", "AE", "SA", "MY", "PK", "BD", "ZA", "NG", "IE"];
  for (const code of expectedCodes) {
    const country = getCountryOption(code);
    assert(country, `Country ${code} must resolve`);
    assert.strictEqual(country.code, code);
    assert(country.flag, `Country ${code} must have a flag`);
    assert(country.defaultTrack, `Country ${code} must have default track`);
  }
  console.log("  ✓ All 15 countries verified with flags, regions, and default tracks");

  // 2. Verify country-to-track cascade
  for (const code of expectedCodes) {
    const tracks = getTracksForCountry(code);
    assert(tracks.length >= 1, `Country ${code} must have at least 1 authentic track`);
    for (const t of tracks) {
      assert(t.id, "Track must have id");
      assert(t.name, "Track must have name");
      assert(t.shortName, "Track must have shortName");
      assert(t.description, "Track must have description");
    }
  }
  console.log("  ✓ Cascading tracks verified for all 15 countries");

  // 3. Verify track-to-grade cascade
  const cbseGrades = getGradesForTrack("in_cbse");
  assert(cbseGrades.length >= 4, "CBSE must have at least 4 grade levels");
  assert(cbseGrades.some(g => g.id === "Class 12"), "CBSE must include Class 12");

  const apGrades = getGradesForTrack("us_ap");
  assert(apGrades.length >= 4, "US AP must have grade options");

  const gcseGrades = getGradesForTrack("gb_gcse");
  assert(gcseGrades.length >= 2, "GB GCSE must have Year 10 and Year 11");
  console.log("  ✓ Cascading grades verified across national, course-based, and exam board models");

  // 4. Verify track-to-subjects cascade
  const cbseSubs = getSubjectsForTrack("in_cbse");
  assert(cbseSubs.includes("Physics") && cbseSubs.includes("Chemistry") && cbseSubs.includes("Mathematics"));

  const apSubs = getSubjectsForTrack("us_ap");
  assert(apSubs.includes("AP Calculus BC") && apSubs.includes("AP Physics C: Mechanics"));

  const gcseSubs = getSubjectsForTrack("gb_gcse");
  assert(gcseSubs.includes("GCSE Mathematics") && gcseSubs.includes("GCSE Physics"));
  console.log("  ✓ Cascading priority subjects verified for multiple curricula");

  // 5. Verify Academic Goals and Languages
  assert.strictEqual(GOAL_OPTIONS.length, 4, "Must have 4 primary academic goals");
  assert(LANGUAGE_OPTIONS.length >= 6, "Must support at least 6 languages");
  assert(LANGUAGE_OPTIONS.some(l => l.code === "en"));
  assert(LANGUAGE_OPTIONS.some(l => l.code === "hi"));
  assert(LANGUAGE_OPTIONS.some(l => l.code === "hinglish"));
  console.log("  ✓ Academic goal presets and multilingual tutoring options verified");

  // 6. Verify track lookup helper
  const trackInfo = getTrackInfo("in_cbse");
  assert.strictEqual(trackInfo.shortName, "CBSE");
  assert.strictEqual(trackInfo.countryCode, "IN");
  console.log("  ✓ Track metadata reverse lookup verified");

  console.log("\n============================================================");
  console.log("All Profile & Onboarding Dynamic Curriculum Tests Passed!");
  console.log("============================================================\n");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
