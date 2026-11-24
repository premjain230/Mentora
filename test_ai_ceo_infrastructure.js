const assert = require("assert");
const { aiCeo, DEPARTMENTS } = require("./server/_ai-ceo");

console.log("\n============================================================");
console.log("Learning Allied — AI CEO Infrastructure Verification");
console.log("============================================================\n");

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test("Roster includes all 12 specialized autonomous departments", () => {
  assert.strictEqual(DEPARTMENTS.length, 12, "Must contain exactly 12 departments");
  const expected = [
    "product_manager",
    "ui_ux_designer",
    "frontend_engineer",
    "backend_engineer",
    "ai_engineer",
    "qa_engineer",
    "security_engineer",
    "performance_engineer",
    "seo_specialist",
    "accessibility_specialist",
    "data_analyst",
    "growth_strategist",
  ];
  for (const id of expected) {
    assert(DEPARTMENTS.some((d) => d.id === id), `Missing department: ${id}`);
  }
});

test("Executive brief aggregates mission, roadmap, and department statuses", () => {
  const brief = aiCeo.getExecutiveBrief();
  assert(brief.mission && brief.mission.includes("Learning Allied"), "Mission statement missing");
  assert.strictEqual(brief.departmentCount, 12, "Department count must be 12");
  assert(brief.roadmapMetrics && typeof brief.roadmapMetrics.velocityPercent === "number", "Roadmap metrics missing");
  assert(Array.isArray(brief.roadmap) && brief.roadmap.length > 0, "Roadmap items missing");
  assert(Array.isArray(brief.recentDecisions), "Decisions log missing");
});

test("Autonomous task delegation assigns tasks to specialized departments", () => {
  const task = aiCeo.delegateTask(
    "ai_engineer",
    "Calibrate Misconception Confidence Threshold",
    "Increase sensitivity of misconception detection from 75% to 85%",
    "P0"
  );
  assert(task && task.id.startsWith("task-"), "Valid task object returned");
  assert.strictEqual(task.departmentId, "ai_engineer");
  assert.strictEqual(task.status, "executing");

  const completed = aiCeo.completeTask(task.id, "Threshold successfully updated in _ai-intelligence.js");
  assert.strictEqual(completed.status, "completed");
  assert(completed.completedAt, "Completion timestamp recorded");
});

test("Decision history captures strategic tradeoffs and audit trail", () => {
  const decision = aiCeo.logDecision(
    "architecture",
    "Standardize on Web Audio Synth",
    "Eliminates bandwidth bottlenecks and provides zero-latency focus soundscapes",
    "Zero bandwidth overhead, 100% offline capability",
    "AI CEO Autonomous"
  );
  assert(decision && decision.id.startsWith("dec-"), "Decision record created");
  assert.strictEqual(decision.approvedBy, "AI CEO Autonomous");
});

test("Human approval workflow handles high-impact initiatives securely", () => {
  const request = aiCeo.requestHumanApproval(
    "Production Database Index Migration",
    "Create composite index on learning_events collection for timestamp and subject",
    "Low risk, non-blocking online index build"
  );
  assert(request && request.id.startsWith("req-"));
  assert.strictEqual(request.status, "pending_review");

  const approved = aiCeo.approveRequest(request.id, "admin@learningallied.world");
  assert.strictEqual(approved.status, "approved");
  assert.strictEqual(approved.approvedBy, "admin@learningallied.world");
});

console.log("\n============================================================");
console.log("All AI CEO Infrastructure Tests Passed Successfully!");
console.log("============================================================\n");
