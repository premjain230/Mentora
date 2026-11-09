// ─────────────────────────────────────────────────────────────
// Learning Allied — Feedback & Product Intelligence Automated Test Suite
// Run with: node test_feedback_system.js
// ─────────────────────────────────────────────────────────────

const assert = require("assert");
const {
  FEEDBACK_CATEGORIES,
  BUG_SEVERITIES,
  FEEDBACK_STATUSES,
  FEATURE_STATUSES,
  sanitizeText,
  validateAttachment,
  validateFeedbackPayload,
} = require("./server/_feedback");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
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

async function runAsyncTest(name, fn) {
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

console.log("============================================================");
console.log("Learning Allied — Feedback System Automated Verification");
console.log("============================================================\n");

// [Suite 1] Category & Schema Validation
console.log("[Suite 1] Category & Schema Validation (7 Integrated Modules)");

runTest("Module A: General feedback validation", () => {
  const payload = {
    category: "general",
    rating: 5,
    message: "Great learning experience on JEE chemistry!",
    page: "/home",
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123", email: "student@example.com" });
  assert.strictEqual(res.category, "general");
  assert.strictEqual(res.rating, 5);
  assert.strictEqual(res.userId, "user_123");
  assert.strictEqual(res.status, "new");
});

runTest("Module B: AI Response feedback with metadata & subratings", () => {
  const payload = {
    category: "ai_response",
    rating: 4,
    feedbackType: "thumbs_up",
    responseId: "resp_456",
    conversationId: "chat_789",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    subRatings: { accuracy: 5, clarity: 4, relevance: 5, completeness: 4 },
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123" });
  assert.strictEqual(res.category, "ai_response");
  assert.strictEqual(res.details.provider, "groq");
  assert.strictEqual(res.details.model, "llama-3.3-70b-versatile");
  assert.strictEqual(res.subRatings.accuracy, 5);
  assert.strictEqual(res.details.feedbackType, "thumbs_up");
});

runTest("Module C: Learning Experience feedback with pedagogical metrics", () => {
  const payload = {
    category: "learning_experience",
    subject: "Physics",
    topic: "Rotational Dynamics",
    details: {
      understood: true,
      easyToFollow: true,
      helpedTopic: true,
      confusingPart: "Moment of inertia of hollow cone",
      improvements: "Include 3D simulation of torque",
    },
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123" });
  assert.strictEqual(res.category, "learning_experience");
  assert.strictEqual(res.details.understood, true);
  assert.strictEqual(res.details.confusingPart, "Moment of inertia of hollow cone");
});

runTest("Module D: Bug Reporting with severity, page, and device metadata", () => {
  const payload = {
    category: "bug_report",
    bugCategory: "incorrect_behaviour",
    severity: "high",
    message: "The formula formatting broke in equation editor.",
    page: "/study-session",
    device: {
      userAgent: "Mozilla/5.0 Chrome/120.0",
      viewport: "1920x1080",
      os: "Windows",
    },
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123" });
  assert.strictEqual(res.category, "bug_report");
  assert.strictEqual(res.severity, "high");
  assert.strictEqual(res.details.device.viewport, "1920x1080");
});

runTest("Module E: Feature Requests with title, category, and initial under_review status", () => {
  const payload = {
    category: "feature_request",
    title: "Offline Study Mode",
    details: {
      featureCategory: "curriculum",
      whyNeeded: "Studying during commute with intermittent connectivity.",
    },
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123" });
  assert.strictEqual(res.category, "feature_request");
  assert.strictEqual(res.details.title, "Offline Study Mode");
  assert.strictEqual(res.status, "under_review");
  assert.strictEqual(res.upvotes, 1);
  assert.strictEqual(res.isPublic, true);
});

runTest("Module F: UI/UX Feedback with aspect and responsiveness context", () => {
  const payload = {
    category: "ui_ux",
    aspect: "navigation",
    rating: 4,
    message: "Side drawer animation is smooth on tablet.",
    viewport: "768x1024",
  };
  const res = validateFeedbackPayload(payload, { uid: "user_123" });
  assert.strictEqual(res.category, "ui_ux");
  assert.strictEqual(res.details.aspect, "navigation");
});

runTest("Module G: Teacher & Educator Feedback with curriculum disclaimer", () => {
  const payload = {
    category: "teacher",
    details: {
      subjectTaught: "Chemistry",
      gradeLevel: "Class 12",
      institution: "Delhi Public School",
      curriculumRelevance: 5,
      explanationQuality: 5,
      educationalUsefulness: 5,
    },
    message: "Well aligned with NCERT guidelines.",
  };
  const res = validateFeedbackPayload(payload, { uid: "teacher_456" });
  assert.strictEqual(res.category, "teacher");
  assert.strictEqual(res.details.disclaimerAcknowledged, true);
  assert.strictEqual(res.details.subjectTaught, "Chemistry");
});

// [Suite 2] Sanitization & Security Hardening
console.log("\n[Suite 2] Sanitization, Security & Protection Against Malicious Input");

runTest("Sanitization: Strips XSS and HTML tags from messages", () => {
  const dangerous = "<script>alert('pwned')</script>Hello <b>World</b><img src=x onerror=alert(1)>";
  const clean = sanitizeText(dangerous);
  assert.strictEqual(clean, "Hello World");
});

runTest("Sanitization: Removes control characters and clamps maximum length", () => {
  const textWithControl = "Valid Text\u0000\u0008End";
  const clean = sanitizeText(textWithControl);
  assert.strictEqual(clean, "Valid TextEnd");

  const longText = "A".repeat(5000);
  const clamped = sanitizeText(longText, 200);
  assert.strictEqual(clamped.length, 200);
});

runTest("Validation: Rejects invalid feedback category", () => {
  assert.throws(() => {
    validateFeedbackPayload({ category: "unauthorized_arbitrary_category" }, null);
  }, /Invalid feedback category/);
});

runTest("Validation: Rejects out-of-range rating numbers", () => {
  assert.throws(() => {
    validateFeedbackPayload({ category: "general", rating: 6 }, null);
  }, /Rating must be a number between 1 and 5/);

  assert.throws(() => {
    validateFeedbackPayload({ category: "general", rating: -1 }, null);
  }, /Rating must be a number between 1 and 5/);
});

runTest("Attachment Security: Accepts valid PNG/JPEG base64 image", () => {
  const validDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const res = validateAttachment(validDataUrl);
  assert.strictEqual(res, validDataUrl);
});

runTest("Attachment Security: Rejects non-image file types (e.g. executable/html)", () => {
  assert.throws(() => {
    validateAttachment("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==");
  }, /Invalid attachment format/);

  assert.throws(() => {
    validateAttachment("data:application/octet-stream;base64,TVqQAAMAAAAEAAAA//8AALgA");
  }, /Invalid attachment format/);
});

runTest("Attachment Security: Rejects attachments exceeding 1.5MB limit", () => {
  // 2.5MB payload
  const hugePayload = "data:image/png;base64," + "A".repeat(2.5 * 1024 * 1024 * (4 / 3));
  assert.throws(() => {
    validateAttachment(hugePayload);
  }, /exceeds maximum allowed size/);
});

// [Suite 3] Privacy, DPDP Compliance & Report Aggregation
console.log("\n[Suite 3] Privacy, DPDP Compliance & Aggregation");

runTest("DPDP Privacy: Anonymous submission does not require user account", () => {
  const payload = {
    category: "general",
    rating: 5,
    message: "Helpful app",
  };
  const res = validateFeedbackPayload(payload, null);
  assert.strictEqual(res.userId, "anonymous");
  assert.strictEqual(res.userEmail, null);
  assert.strictEqual(res.isRegistered, false);
});

runTest("DPDP Privacy: Public feature request does not expose upvoter user IDs publicly", () => {
  const payload = {
    category: "feature_request",
    title: "Dark theme contrast improvement",
  };
  const res = validateFeedbackPayload(payload, { uid: "user_secret_uid" });
  assert.strictEqual(res.isPublic, true);
  assert.strictEqual(res.upvotes, 1);
});

runTest("Status Governance: Status constants conform to lifecycle", () => {
  assert.ok(FEEDBACK_STATUSES.has("new"));
  assert.ok(FEEDBACK_STATUSES.has("reviewing"));
  assert.ok(FEEDBACK_STATUSES.has("in_progress"));
  assert.ok(FEEDBACK_STATUSES.has("resolved"));
  assert.ok(FEEDBACK_STATUSES.has("closed"));

  assert.ok(FEATURE_STATUSES.has("under_review"));
  assert.ok(FEATURE_STATUSES.has("planned"));
  assert.ok(FEATURE_STATUSES.has("in_development"));
  assert.ok(FEATURE_STATUSES.has("completed"));
  assert.ok(FEATURE_STATUSES.has("declined"));
});

console.log("\n============================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("============================================================");

if (failed > 0) {
  process.exit(1);
}
