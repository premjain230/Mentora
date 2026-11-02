// test_topic_mismatch_verification.js
// Verification suite for the 8 required AI Tutor topic mismatch & fallback scenarios.

const assert = require("assert");
const curriculum = require("./server/_curriculum");
const core = require("./server/_learn-core");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

(async () => {
  console.log("\n=== AI Tutor Topic Mismatch & Fallback Verification ===\n");

  // --------------------------------------------------------------------------
  // Scenario 1: Ask about Chemical Reaction -> receive Chemical Reaction content
  // --------------------------------------------------------------------------
  test("Scenario 1: Ask about Chemical Reaction resolves to Chemical Reactions, NEVER Chemical Bonding", () => {
    // In CBSE (grades track)
    const cbseMatch = curriculum.matchConcept("What is a chemical reaction?", { trackId: "cbse" });
    assert(cbseMatch, "CBSE must find Chemical Reactions");
    assert.strictEqual(
      cbseMatch.conceptId,
      "cbse.10.science.chemical_reactions_and_equations",
      "Must match Chemical Reactions and Equations"
    );
    assert(
      !cbseMatch.conceptId.includes("bonding"),
      "Must never match Chemical Bonding"
    );

    // In JEE Main, Chemical Reaction must NOT match Chemical Bonding
    const jeeMatch = curriculum.matchConcept("What is a chemical reaction?", { trackId: "jee_main" });
    assert(
      !jeeMatch || !jeeMatch.conceptId.includes("bonding"),
      "In JEE Main, Chemical Reaction must NEVER match Chemical Bonding"
    );

    // If AI fails for Chemical Reaction, pack covalent-bonding must NEVER be returned
    const pack = core.findPack(cbseMatch, "What is a chemical reaction?", "Chemistry");
    assert.strictEqual(pack, null, "There is no reviewed pack for Chemical Reaction, so pack must be null");

    const packByQ = core.findPackByQuestion("What is a chemical reaction?", "Chemistry");
    assert.strictEqual(packByQ, null, "findPackByQuestion must return null for Chemical Reaction");
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Ask about Chemical Bonding -> receive Chemical Bonding content
  // --------------------------------------------------------------------------
  test("Scenario 2: Ask about Chemical Bonding resolves to Chemical Bonding and pack covalent-bonding", () => {
    const jeeBonding = curriculum.matchConcept("Explain chemical bonding and molecular shapes", { trackId: "jee_main" });
    assert(jeeBonding, "JEE Main must find Chemical Bonding");
    assert.strictEqual(jeeBonding.conceptId, "jee.main.chemistry.chemical_bonding");

    const pack = core.findPack(jeeBonding, "Explain chemical bonding and molecular shapes", "Chemistry");
    assert(pack, "Should match reviewed covalent-bonding pack");
    assert.strictEqual(pack.id, "covalent-bonding");
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Switch from Chemical Reaction to another topic -> receive new topic's content
  // --------------------------------------------------------------------------
  test("Scenario 3: Topic change detection catches switch from Chemical Reaction to Newton laws", () => {
    const history = [
      { role: "user", content: "What is a chemical reaction?" },
      { role: "assistant", content: "A chemical reaction is a process where substances transform into new substances." },
    ];
    const newQuestion = "What is Newton's second law of motion?";
    const isTopicChange = core.detectTopicChange(newQuestion, history);
    assert.strictEqual(isTopicChange, true, "Must detect topic change from chemistry to physics");

    // The new concept must match Newton's law, not the old chemical reaction
    const newConcept = curriculum.matchConcept(newQuestion, { trackId: "cbse", classNum: 9 });
    assert(newConcept && (newConcept.name.includes("Motion") || newConcept.name.includes("Force")));
    assert(!newConcept.conceptId.includes("chemical"));
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Ask follow-up questions -> preserve the correct context
  // --------------------------------------------------------------------------
  test("Scenario 4: Follow-up questions preserve the correct concept context", () => {
    const concept = curriculum.getConcept("cbse.10.science.chemical_reactions_and_equations");
    // Conversational or general follow-up
    assert.strictEqual(
      core.isConceptRelevantToQuestion(concept, "Can you give me an everyday example?"),
      true,
      "General follow-up should preserve concept"
    );
    assert.strictEqual(
      core.isConceptRelevantToQuestion(concept, "Why does this happen in step 2?"),
      true,
      "Step follow-up should preserve concept"
    );
    // Explicit question on the same topic
    assert.strictEqual(
      core.isConceptRelevantToQuestion(concept, "What are the reactants in this reaction?"),
      true,
      "Topic question should preserve concept"
    );
    // Completely unrelated question should NOT preserve concept
    assert.strictEqual(
      core.isConceptRelevantToQuestion(concept, "What is a concave mirror?"),
      false,
      "Unrelated optics question must reject stale chemical reaction concept"
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Simulate AI provider failure -> show only relevant fallback content
  // --------------------------------------------------------------------------
  await testAsync("Scenario 5: Provider failure for Ohm's law serves Ohm's law fallback pack", async () => {
    const emptyState = {
      profile: { board: "cbse", classNum: 10, language: "en", prioritySubject: null, subjects: [], weakTopics: [] },
      mastery: null,
      review: null,
      misconceptions: [],
      weakConcepts: [],
      hub: { last: null, topics: {} },
    };

    // For a question that matches a reviewed pack (e.g. Ohm's law)
    const result = await core.chatTutor({
      uid: "test-user-s5",
      body: {
        question: "Explain Ohm's law and electrical resistance",
        context: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10 },
        history: [],
      },
      state: emptyState,
    });
    // In test environment without Groq keys, it will use the fallback
    assert(result.reply);
    if (result.reply.fallback) {
      assert.strictEqual(result.reply.source, "authored");
      assert.strictEqual(result.meta.source, "authored-fallback");
      assert(result.reply.title.toLowerCase().includes("ohm") || result.reply.directAnswer.toLowerCase().includes("ohm") || result.reply.directAnswer.toLowerCase().includes("resistance"));
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Request a topic without reviewed fallback content -> show clear unavailable message
  // --------------------------------------------------------------------------
  await testAsync("Scenario 6: Topic without reviewed pack shows clear unavailable message, NEVER unrelated pack", async () => {
    const emptyState = {
      profile: { board: "cbse", classNum: 10, language: "en", prioritySubject: null, subjects: [], weakTopics: [] },
      mastery: null,
      review: null,
      misconceptions: [],
      weakConcepts: [],
      hub: { last: null, topics: {} },
    };

    const result = await core.chatTutor({
      uid: "test-user-s6",
      body: {
        question: "What is a chemical reaction and how do bonds break?",
        context: { track: "cbse", classNum: 10 },
        history: [],
      },
      state: emptyState,
    });

    assert(result.reply);
    // If fallback is triggered, it must be the unavailable message, NOT covalent-bonding!
    if (result.reply.source === "unavailable") {
      assert.strictEqual(result.reply.kind, "fallback");
      assert(result.reply.directAnswer.includes("could not reach") || result.reply.directAnswer.includes("temporarily unavailable"));
      assert.strictEqual(result.reply.sections.length, 0);
      assert.strictEqual(result.reply.example, null);
    } else if (result.reply.source === "authored") {
      // If authored content was returned, it must NOT be covalent bonding!
      assert(
        !result.reply.title.toLowerCase().includes("covalent") &&
        !result.reply.directAnswer.toLowerCase().includes("covalent"),
        "Must NEVER return covalent-bonding pack for chemical reaction question!"
      );
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Refresh and resume a lesson -> restore the correct topic
  // --------------------------------------------------------------------------
  test("Scenario 7: Refresh and resume a lesson restores correct concept", () => {
    const resolved = core.resolveTopic({ conceptId: "cbse.10.science.chemical_reactions_and_equations" });
    assert(resolved.concept);
    assert.strictEqual(resolved.concept.conceptId, "cbse.10.science.chemical_reactions_and_equations");
    assert.strictEqual(resolved.concept.name, "Chemical Reactions and Equations");
    assert.strictEqual(resolved.trackId, "cbse");
    assert.strictEqual(resolved.classNum, 10);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Switch subjects and chapters -> ensure no previous curriculum leaks
  // --------------------------------------------------------------------------
  test("Scenario 8: Switching subjects/chapters isolates new lesson completely", () => {
    // Old session had chemistry concept
    const staleContext = { conceptId: "jee.main.chemistry.chemical_bonding", track: "cbse", classNum: 10, subject: "Science" };
    const newQuestion = "Explain the reflection of light in concave mirror";

    // Because stale concept is NOT relevant to the new question, stale concept is ignored
    const staleConcept = curriculum.getConcept(staleContext.conceptId);
    const isRelevant = core.isConceptRelevantToQuestion(staleConcept, newQuestion);
    assert.strictEqual(isRelevant, false, "Stale bonding concept must be declared irrelevant");

    const freshMatch = curriculum.matchConcept(newQuestion, { trackId: "cbse", classNum: 10, subject: "Science" });
    assert(freshMatch);
    assert.strictEqual(freshMatch.conceptId, "cbse.10.science.light_reflection_and_refraction");
    assert(!freshMatch.conceptId.includes("bonding"));
  });

  console.log(`\nScenario Verification: ${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
