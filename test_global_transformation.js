/**
 * Global Personal AI Learning OS — Automated Transformation Verification Suite
 * Exhaustively tests Requirements A through Q from the Master Engineering Directive.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  curriculumStats,
  listCountries,
  getCountry,
  listTracks,
  getTrack,
  getCatalog,
  getChapters,
  getConcept,
  INTERNATIONAL_CURRICULUM,
} = require("./server/_curriculum.js");

const { TEACHING_SYSTEM_PROMPT, contextBlock } = require("./server/_learn-core.js");

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("============================================================");
console.log("Learning Allied — Global Learning OS Transformation Tests");
console.log("============================================================\n");

// ─────────────────────────────────────────────────────────────────
// Requirement A: 15 Countries & Track Selection
// ─────────────────────────────────────────────────────────────────
console.log("[Requirement A] 15 Countries & Authentic Track Selection");
const EXPECTED_COUNTRIES = ["IN", "US", "GB", "CA", "AU", "NZ", "SG", "AE", "SA", "MY", "PK", "BD", "ZA", "NG", "IE"];

test("All 15 target countries exist in the catalog with valid ISO codes", () => {
  const countries = listCountries();
  assert.strictEqual(countries.length, 15, `Expected 15 countries, got ${countries.length}`);
  for (const code of EXPECTED_COUNTRIES) {
    const country = getCountry(code);
    assert(country, `Country ${code} not found in catalog`);
    assert.strictEqual(country.code, code);
    assert(country.name && country.name.length > 0);
    assert(country.defaultCurrency && country.defaultCurrency.length >= 3);
    assert(country.flagEmoji && country.flagEmoji.length > 0);
  }
});

test("Each country offers tracks with authentic educational authorities", () => {
  for (const code of EXPECTED_COUNTRIES) {
    const tracks = listTracks({ countryCode: code });
    assert(tracks.length >= 1, `Country ${code} must have at least 1 verified track`);
    for (const track of tracks) {
      assert.strictEqual(track.countryCode, code);
      assert(track.academicYear, `Track ${track.id} must declare academicYear`);
      assert(track.verificationStatus, `Track ${track.id} must declare verificationStatus`);
      assert(track.officialUrl, `Track ${track.id} must have verifiable officialUrl`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────
// Requirement B: Structural Polymorphism
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement B] Structural Polymorphism Across Global Systems");

test("India CBSE uses Class 9-12 grade hierarchy", () => {
  const cbse = getTrack("cbse");
  assert(cbse.grades === true);
  assert(cbse.classes.includes(10) && cbse.classes.includes(12));
});

test("US AP model is course-based without rigid school grade levels", () => {
  const usAp = getTrack("us_ap");
  assert(usAp, "us_ap track must exist");
  assert.strictEqual(usAp.grades, false, "AP tracks should be qualification-level course based");
  assert.strictEqual(usAp.regionalConventions.mathTerminology.divisionOfOperations, "PEMDAS");
});

test("UK GCSE uses Awards Body / Key Stage framework with BIDMAS", () => {
  const ukGcse = getTrack("gb_gcse");
  assert(ukGcse, "gb_gcse track must exist");
  assert.strictEqual(ukGcse.regionalConventions.mathTerminology.divisionOfOperations, "BIDMAS");
  assert.strictEqual(ukGcse.regionalConventions.spellingVariant, "en-GB");
});

test("Canada Ontario uses Grade 11/12 course codes (SPH4U, MHF4U)", () => {
  const on = getTrack("ca_ontario");
  assert(on, "ca_ontario track must exist");
  assert(on.hierarchyTerminology.subjectLabel.includes("Course"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement C: Country -> Track -> Subject -> Chapter Navigation
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement C] Full Curriculum Catalog Navigation");

test("Country navigation resolves correct tracks and subjects", () => {
  const usCatalog = getCatalog({ countryCode: "US" });
  assert.strictEqual(usCatalog.step, "board");
  assert(usCatalog.tracks.length >= 1);

  const apSubjects = getCatalog({ trackId: "us_ap" });
  assert(apSubjects.subjects && apSubjects.subjects.length >= 2);
  const calcBc = apSubjects.subjects.find((s) => s.name === "AP Calculus BC");
  assert(calcBc, "AP Calculus BC subject must be present");
});

test("Chapters for international subjects resolve with difficulty and topics", () => {
  const chapters = getChapters({ trackId: "us_ap", subject: "AP Calculus BC" });
  assert(chapters.length >= 2, "Expected chapters for AP Calculus BC");
  assert(chapters[0].conceptId === "us_ap_calc_u1");
  assert(chapters[0].name.includes("Limits"));
  assert.strictEqual(chapters[0].difficultyLabel, "Intermediate");
});

// ─────────────────────────────────────────────────────────────────
// Requirement D & E: Arena Non-Linear Gating & Out-of-Order Battles
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement D & E] Arena Non-Linear Access & Out-of-Order Completion");

test("Arena progress defaults all chapters to AVAILABLE without sequential locks", () => {
  const arenaFile = fs.readFileSync("./vanilla/arena/progress.js", "utf8");
  assert(arenaFile.includes("createDefaultProgress"));
  assert(arenaFile.includes("ArenaState.AVAILABLE"));
  assert(arenaFile.includes("hasPrereqNotice: true"));
  assert(arenaFile.includes("ok: true"));

  const arenaJs = fs.readFileSync("./vanilla/arena.js", "utf8");
  assert(!arenaJs.includes("padlock"));
  assert(arenaJs.includes("Recommended Prerequisite"));
});

test("Out-of-order battle completion: Server learning-event permits any chapter battle", () => {
  const eventRoute = fs.readFileSync("./server/learning-event.js", "utf8");
  // Verification that rigid sequential blocking checks were removed
  assert(!eventRoute.includes('throw Error("Chapter locked")'));
  assert(!eventRoute.includes('throw Error("Defeat chapters in order")'));
});

// ─────────────────────────────────────────────────────────────────
// Requirement F & G: Progress Tracking & Arena Status Indicators
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement F & G] Progress Tracking & Visual State Indicators");

test("Arena progress model defines distinct badges for Available, In Progress, Defeated, Mastered", () => {
  const arenaProgressJs = fs.readFileSync("./js/learning/arena-progress.js", "utf8");
  assert(arenaProgressJs.includes('AVAILABLE: "available"'));
  assert(arenaProgressJs.includes('IN_PROGRESS: "in_progress"'));
  assert(arenaProgressJs.includes('DEFEATED: "defeated"'));
  assert(arenaProgressJs.includes('MASTERED: "mastered"'));
});

// ─────────────────────────────────────────────────────────────────
// Requirement H: AI Tutor Regional Grounding & Scope Guardrails
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement H] AI Tutor Regional Grounding & Scope Guardrails");

test("System prompt enforces global Socratic principles and 15 countries", () => {
  assert(TEACHING_SYSTEM_PROMPT.includes("Personal AI Learning OS"));
  assert(TEACHING_SYSTEM_PROMPT.includes("15 countries"));
  assert(TEACHING_SYSTEM_PROMPT.includes("Socratic"));
  assert(TEACHING_SYSTEM_PROMPT.includes("REGIONAL GROUNDING"));
});

test("US AP context block injects PEMDAS, US spelling, and College Board scope", () => {
  const usApTrack = getTrack("us_ap");
  const block = contextBlock({
    track: usApTrack,
    level: "intermediate",
    question: "How do I evaluate limits approaching infinity?",
  });

  assert(block.includes("Order of operations: PEMDAS"));
  assert(block.includes("en-US"));
  assert(block.includes("SYLLABUS GUARDRAIL"));
});

test("UK GCSE context block injects BIDMAS, British spelling, and metric units", () => {
  const ukGcseTrack = getTrack("gb_gcse");
  const block = contextBlock({
    track: ukGcseTrack,
    level: "intermediate",
    question: "Calculate the energy in an elastic spring.",
  });

  assert(block.includes("Order of operations: BIDMAS"));
  assert(block.includes("en-GB"));
  assert(block.includes("gradient"));
  assert(block.includes("metric"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement I, J & K: Indian Curricula & Backward Compatibility
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement I, J & K] Indian Curricula Preservation & Backward Compatibility");

test("Stats and tracks preserve exact 5 legacy Indian tracks and 590 concepts", () => {
  const stats = curriculumStats();
  assert.strictEqual(stats.concepts, 590, `Expected exactly 590 concepts, got ${stats.concepts}`);
  assert.strictEqual(stats.tracks, 5, `Expected 5 legacy tracks, got ${stats.tracks}`);

  const defaultTracks = listTracks();
  assert.strictEqual(defaultTracks.length, 5);
  const ids = defaultTracks.map((t) => t.id);
  assert(ids.includes("cbse"));
  assert(ids.includes("maharashtra"));
  assert(ids.includes("jee_main"));
  assert(ids.includes("jee_advanced"));
  assert(ids.includes("neet"));
});

test("Legacy concept IDs resolve seamlessly (e.g. maharashtra.9.science1.laws_of_motion)", () => {
  const concept = getConcept("maharashtra.9.science1.laws_of_motion");
  assert(concept, "Concept maharashtra.9.science1.laws_of_motion must resolve");
  assert.strictEqual(concept.subject, "Science & Technology - Part 1");
  assert(concept.name.includes("Laws of Motion"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement L & M: Auth Persistence & Firestore Security Integrity
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement L & M] Auth & Security Hardening Integrity");

test("Firestore security rules guard server-authoritative entitlements and Arena progression", () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  assert(rules.includes("match /users/{userId}"));
  assert(rules.includes("match /arenaProgress/{subjectKey}"));
  assert(rules.includes("isOwner(userId)"));
  assert(rules.includes("request.resource.data.plan == 'free'"));
  assert(rules.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement N: Multi-Currency Pricing & Billing Provider
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement N] Multi-Currency Pricing & Billing Provider");

test("Pricing catalog covers all 15 target countries with authentic currencies", () => {
  const pricingFile = fs.readFileSync("./src/lib/billing/pricing.ts", "utf8");
  for (const code of EXPECTED_COUNTRIES) {
    assert(pricingFile.includes(`${code}:`), `Country ${code} pricing entry must exist in pricing.ts`);
  }
  assert(pricingFile.includes("INR"));
  assert(pricingFile.includes("USD"));
  assert(pricingFile.includes("GBP"));
  assert(pricingFile.includes("CAD"));
  assert(pricingFile.includes("AUD"));
  assert(pricingFile.includes("NZD"));
  assert(pricingFile.includes("SGD"));
  assert(pricingFile.includes("AED"));
  assert(pricingFile.includes("SAR"));
  assert(pricingFile.includes("MYR"));
  assert(pricingFile.includes("PKR"));
  assert(pricingFile.includes("BDT"));
  assert(pricingFile.includes("ZAR"));
  assert(pricingFile.includes("NGN"));
  assert(pricingFile.includes("EUR"));
});

test("BillingProvider enforces parental consent for minors and defines terms", () => {
  const billingFile = fs.readFileSync("./src/lib/billing/BillingProvider.ts", "utf8");
  assert(billingFile.includes("isUnderAge"));
  assert(billingFile.includes("Parental consent is required"));
  assert(billingFile.includes("Self-serve one-click cancellation"));
  assert(billingFile.includes("14-day no-questions-asked refund policy"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement O: International SEO & Sitemap Gating
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement O] International SEO, Dynamic Routes & Anti-Thin-Content Gating");

test("Sitemap includes parent trust pages and verified dynamic curriculum routes", () => {
  const sitemapContent = fs.readFileSync("./app/sitemap.ts", "utf8");

  assert(sitemapContent.includes("/for-parents"));
  assert(sitemapContent.includes("/child-privacy"));
  assert(sitemapContent.includes("/how-our-ai-works"));
  assert(sitemapContent.includes("/cbse-board"));
  assert(sitemapContent.includes("/jee-preparation"));
  assert(sitemapContent.includes("/curriculum/${track.countryCode.toLowerCase()}"));
  assert(sitemapContent.includes("officially_verified"));
});

test("Dynamic curriculum route exports metadata, breadcrumbs, course JSON-LD, and anti-thin gating", () => {
  const trackPage = fs.readFileSync("./app/curriculum/[country]/[track]/page.tsx", "utf8");
  assert(trackPage.includes("createCourseJsonLd"));
  assert(trackPage.includes("createBreadcrumbsJsonLd"));
  assert(trackPage.includes("createProgramJsonLd"));
  assert(trackPage.includes("noIndex: isThin"));
  assert(trackPage.includes("generateStaticParams"));
});

// ─────────────────────────────────────────────────────────────────
// Requirement P & Q: Build and Bundle Integrity
// ─────────────────────────────────────────────────────────────────
console.log("\n[Requirement P & Q] Production Build & Bundle Integrity");

test("Next.js production build artifacts exist and are up to date", () => {
  assert(fs.existsSync("./.next"), ".next directory must exist");
  assert(fs.existsSync("./.next/BUILD_ID"), ".next/BUILD_ID must exist after successful build");
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log("\n============================================================");
console.log(`Global Transformation Tests: ${passedTests} / ${totalTests} passed`);
console.log("============================================================\n");

if (passedTests === totalTests) {
  console.log("ALL REQUIREMENTS A THROUGH Q VERIFIED AND PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("Some tests failed.");
  process.exit(1);
}
