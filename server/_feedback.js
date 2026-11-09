// ─────────────────────────────────────────────────────────────
// Learning Allied — Feedback & Product Intelligence Server Engine
//
// Handles validation, sanitization, rate-limiting, Firestore
// persistence, upvoting, report aggregation, and CSV exports for
// all 7 feedback modules:
//   1. General Feedback
//   2. AI Response Feedback
//   3. Learning Experience Feedback
//   4. Bug Reporting
//   5. Feature Requests
//   6. UI/UX Feedback
//   7. Teacher Feedback
// ─────────────────────────────────────────────────────────────

const { firestore, adminSdk } = require("./_admin");

const serverTs = () => adminSdk().firestore.FieldValue.serverTimestamp();

// Allowed categories
const FEEDBACK_CATEGORIES = new Set([
  "general",
  "ai_response",
  "learning_experience",
  "bug_report",
  "feature_request",
  "ui_ux",
  "teacher",
]);

// Allowed bug severities
const BUG_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

// Allowed statuses
const FEEDBACK_STATUSES = new Set([
  "new",
  "reviewing",
  "in_progress",
  "resolved",
  "closed",
]);

// Feature request statuses
const FEATURE_STATUSES = new Set([
  "under_review",
  "planned",
  "in_development",
  "completed",
  "declined",
]);

// In-memory sliding rate limiter: max 30 submissions per 10 minutes per IP/user
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(key) {
  const now = Date.now();
  let record = rateLimitMap.get(key);
  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    record = { start: now, count: 1 };
    rateLimitMap.set(key, record);
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

// Clean in-memory cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now - v.start > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(k);
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Strips HTML tags and script injections, trims whitespace, and clamps length.
 */
function sanitizeText(str, maxLength = 2000) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // strip script tags + content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "") // strip style tags + content
    .replace(/<[^>]*>/g, "") // strip remaining HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "") // remove control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates optional screenshot attachment.
 * Must be a base64 encoded image data URL (png, jpeg, webp) under 1.5MB.
 */
function validateAttachment(attachment) {
  if (!attachment) return null;
  if (typeof attachment !== "string") {
    throw new Error("Attachment must be a base64 data URL string.");
  }
  const match = attachment.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("Invalid attachment format. Only PNG, JPEG, and WebP images are accepted.");
  }
  // Rough byte size: length * 3/4
  const estimatedBytes = (match[2].length * 3) / 4;
  if (estimatedBytes > 1.5 * 1024 * 1024) {
    throw new Error("Attachment exceeds maximum allowed size (1.5 MB).");
  }
  return attachment;
}

/**
 * Validates and normalizes feedback payload based on category.
 */
function validateFeedbackPayload(raw, user) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Feedback payload must be a valid JSON object.");
  }

  const category = String(raw.category || "").trim().toLowerCase();
  if (!FEEDBACK_CATEGORIES.has(category)) {
    throw new Error(`Invalid feedback category: ${category}`);
  }

  const message = sanitizeText(raw.message || raw.description || "", 4000);
  const page = sanitizeText(raw.page || "/", 200);

  let rating = null;
  if (raw.rating != null) {
    const r = Number(raw.rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      throw new Error("Rating must be a number between 1 and 5.");
    }
    rating = Math.round(r);
  }

  const subRatings = {};
  if (raw.subRatings && typeof raw.subRatings === "object") {
    for (const key of ["accuracy", "clarity", "relevance", "completeness", "usefulness"]) {
      if (raw.subRatings[key] != null) {
        const sr = Number(raw.subRatings[key]);
        if (Number.isFinite(sr) && sr >= 1 && sr <= 5) {
          subRatings[key] = Math.round(sr);
        }
      }
    }
  }

  const details = {};

  if (category === "ai_response") {
    details.provider = sanitizeText(raw.provider || raw.details?.provider || "groq", 60);
    details.model = sanitizeText(raw.model || raw.details?.model || "default", 100);
    details.responseId = sanitizeText(raw.responseId || raw.details?.responseId || "", 120);
    details.conversationId = sanitizeText(raw.conversationId || raw.details?.conversationId || "", 120);
    details.queryTopic = sanitizeText(raw.queryTopic || raw.details?.queryTopic || "", 200);
    details.feedbackType = raw.feedbackType === "down" ? "thumbs_down" : "thumbs_up";
  } else if (category === "learning_experience") {
    details.subject = sanitizeText(raw.subject || raw.details?.subject || "", 100);
    details.topic = sanitizeText(raw.topic || raw.details?.topic || "", 200);
    details.understood = raw.details?.understood != null ? Boolean(raw.details.understood) : null;
    details.easyToFollow = raw.details?.easyToFollow != null ? Boolean(raw.details.easyToFollow) : null;
    details.helpedTopic = raw.details?.helpedTopic != null ? Boolean(raw.details.helpedTopic) : null;
    details.confusingPart = sanitizeText(raw.details?.confusingPart || "", 1000);
    details.improvements = sanitizeText(raw.details?.improvements || "", 1000);
  } else if (category === "bug_report") {
    details.bugCategory = sanitizeText(raw.bugCategory || raw.details?.bugCategory || "broken_feature", 60);
    const severity = String(raw.severity || raw.details?.severity || "medium").toLowerCase();
    details.severity = BUG_SEVERITIES.has(severity) ? severity : "medium";
    details.device = {
      userAgent: sanitizeText(raw.device?.userAgent || raw.details?.device?.userAgent || "", 400),
      viewport: sanitizeText(raw.device?.viewport || raw.details?.device?.viewport || "", 60),
      os: sanitizeText(raw.device?.os || raw.details?.device?.os || "", 60),
    };
    if (raw.attachment) {
      details.attachment = validateAttachment(raw.attachment);
    }
  } else if (category === "feature_request") {
    details.title = sanitizeText(raw.title || raw.details?.title || "", 200);
    if (!details.title && message) {
      details.title = message.slice(0, 100);
    }
    details.featureCategory = sanitizeText(raw.featureCategory || raw.details?.featureCategory || "curriculum", 60);
    details.whyNeeded = sanitizeText(raw.whyNeeded || raw.details?.whyNeeded || "", 1500);
  } else if (category === "ui_ux") {
    details.aspect = sanitizeText(raw.aspect || raw.details?.aspect || "general_ux", 60);
    details.viewport = sanitizeText(raw.viewport || raw.details?.viewport || "", 60);
  } else if (category === "teacher") {
    details.subjectTaught = sanitizeText(raw.subjectTaught || raw.details?.subjectTaught || "", 100);
    details.gradeLevel = sanitizeText(raw.gradeLevel || raw.details?.gradeLevel || "", 60);
    details.institution = sanitizeText(raw.institution || raw.details?.institution || "", 150);
    details.curriculumRelevance = raw.details?.curriculumRelevance ? Number(raw.details.curriculumRelevance) : null;
    details.explanationQuality = raw.details?.explanationQuality ? Number(raw.details.explanationQuality) : null;
    details.educationalUsefulness = raw.details?.educationalUsefulness ? Number(raw.details.educationalUsefulness) : null;
    details.disclaimerAcknowledged = true;
  }

  const initialStatus = category === "feature_request" ? "under_review" : "new";

  return {
    userId: user?.uid || "anonymous",
    userEmail: user?.email ? String(user.email).toLowerCase() : null,
    isRegistered: Boolean(user?.uid),
    category,
    rating,
    subRatings,
    message,
    page,
    details,
    status: initialStatus,
    severity: details.severity || "medium",
    upvotes: category === "feature_request" ? 1 : 0,
    upvotedBy: category === "feature_request" && user?.uid ? [user.uid] : [],
    isPublic: category === "feature_request",
    adminNotes: [],
  };
}

/**
 * Submits feedback into Firestore collection `feedback/`
 * and logs to `feedback_events/`.
 */
async function submitFeedback(rawPayload, user, clientIp = "127.0.0.1") {
  const rateLimitKey = user?.uid ? `user:${user.uid}` : `ip:${clientIp}`;
  if (!checkRateLimit(rateLimitKey)) {
    throw Object.assign(new Error("Rate limit exceeded. Please wait a few moments before submitting more feedback."), {
      statusCode: 429,
    });
  }

  const record = validateFeedbackPayload(rawPayload, user);
  const db = firestore();

  const docRef = db.collection("feedback").doc();
  const feedbackDoc = {
    ...record,
    id: docRef.id,
    createdAt: serverTs(),
    updatedAt: serverTs(),
  };

  await docRef.set(feedbackDoc);

  // Non-blocking telemetry event in feedback_events
  try {
    await db.collection("feedback_events").add({
      type: "feedback_submitted",
      feedbackId: docRef.id,
      category: record.category,
      userId: record.userId,
      rating: record.rating,
      page: record.page,
      timestamp: serverTs(),
    });
  } catch (err) {
    console.warn("[feedback_events] telemetry log non-fatal error:", err.message);
  }

  return {
    ok: true,
    id: docRef.id,
    message: "Thank you! Your feedback has been received and will help improve Learning Allied.",
  };
}

/**
 * Toggles an upvote on a public feature request.
 */
async function toggleFeatureUpvote(feedbackId, user) {
  if (!user || !user.uid) {
    throw Object.assign(new Error("Sign in required to support feature requests."), { statusCode: 401 });
  }

  const db = firestore();
  const docRef = db.collection("feedback").doc(feedbackId);

  return await db.runTransaction(async (t) => {
    const snap = await t.get(docRef);
    if (!snap.exists) {
      throw Object.assign(new Error("Feature request not found."), { statusCode: 404 });
    }
    const data = snap.data();
    if (data.category !== "feature_request") {
      throw Object.assign(new Error("Item is not a feature request."), { statusCode: 400 });
    }

    const upvotedBy = Array.isArray(data.upvotedBy) ? [...data.upvotedBy] : [];
    const index = upvotedBy.indexOf(user.uid);
    let newUpvotes = Number(data.upvotes) || 0;

    let hasUpvoted = false;
    if (index > -1) {
      // Remove upvote
      upvotedBy.splice(index, 1);
      newUpvotes = Math.max(0, newUpvotes - 1);
      hasUpvoted = false;
    } else {
      // Add upvote
      upvotedBy.push(user.uid);
      newUpvotes += 1;
      hasUpvoted = true;
    }

    t.update(docRef, {
      upvotes: newUpvotes,
      upvotedBy,
      updatedAt: serverTs(),
    });

    return { ok: true, upvotes: newUpvotes, hasUpvoted };
  });
}

/**
 * Queries feedback list with search, category/status/rating filtering, and pagination.
 */
async function listFeedback({ category, status, severity, rating, search, limit = 50, startAfterId }, isAdmin = false, currentUid = null) {
  const db = firestore();
  let query = db.collection("feedback");

  if (!isAdmin) {
    // Non-admin can only browse public feature requests
    query = query.where("isPublic", "==", true);
  } else {
    if (category && category !== "all" && FEEDBACK_CATEGORIES.has(category)) {
      query = query.where("category", "==", category);
    }
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }
    if (severity && severity !== "all" && BUG_SEVERITIES.has(severity)) {
      query = query.where("severity", "==", severity);
    }
    if (rating && rating !== "all") {
      const r = Number(rating);
      if (r >= 1 && r <= 5) query = query.where("rating", "==", r);
    }
  }

  const queryLimit = Math.min(Math.max(1, Number(limit) || 50), 100);

  // In Firestore, ordering by createdAt requires index when combined with where.
  // Order by createdAt desc
  query = query.orderBy("createdAt", "desc");

  if (startAfterId) {
    const afterSnap = await db.collection("feedback").doc(startAfterId).get();
    if (afterSnap.exists) {
      query = query.startAfter(afterSnap);
    }
  }

  const snapshot = await query.limit(queryLimit).get();
  let items = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
      updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
      hasUserUpvoted: currentUid && Array.isArray(d.upvotedBy) ? d.upvotedBy.includes(currentUid) : false,
      // For privacy, redact email if requester is not admin
      userEmail: isAdmin ? d.userEmail : undefined,
      upvotedBy: isAdmin ? d.upvotedBy : undefined, // omit user id list to clients
    };
  });

  // Client-side text search if specified
  if (search && typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter((item) => {
      return (
        item.message?.toLowerCase().includes(q) ||
        item.page?.toLowerCase().includes(q) ||
        item.details?.title?.toLowerCase().includes(q) ||
        item.details?.topic?.toLowerCase().includes(q) ||
        (isAdmin && item.userEmail?.toLowerCase().includes(q))
      );
    });
  }

  const lastItem = items.length > 0 ? items[items.length - 1] : null;

  return {
    items,
    nextCursor: items.length >= queryLimit && lastItem ? lastItem.id : null,
    totalReturned: items.length,
  };
}

/**
 * Admin action: update feedback status and add audit note.
 */
async function updateFeedbackAdmin(feedbackId, updates, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    throw Object.assign(new Error("Admin access required."), { statusCode: 403 });
  }

  const db = firestore();
  const docRef = db.collection("feedback").doc(feedbackId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw Object.assign(new Error("Feedback record not found."), { statusCode: 404 });
  }

  const existing = snap.data();
  const allowedUpdates = {};

  if (updates.status) {
    const s = String(updates.status).toLowerCase();
    const isFeature = existing.category === "feature_request";
    if (isFeature ? FEATURE_STATUSES.has(s) : FEEDBACK_STATUSES.has(s)) {
      allowedUpdates.status = s;
      if (s === "resolved" || s === "completed") {
        allowedUpdates.resolvedAt = serverTs();
      }
    } else {
      throw new Error(`Invalid status: ${s}`);
    }
  }

  if (updates.severity && BUG_SEVERITIES.has(updates.severity)) {
    allowedUpdates.severity = updates.severity;
  }

  if (updates.isPublic != null && existing.category === "feature_request") {
    allowedUpdates.isPublic = Boolean(updates.isPublic);
  }

  const noteText = sanitizeText(updates.note || "", 1500);
  const notes = Array.isArray(existing.adminNotes) ? [...existing.adminNotes] : [];

  if (noteText) {
    notes.push({
      adminEmail: adminUser.email || "admin",
      note: noteText,
      timestamp: new Date().toISOString(),
    });
    allowedUpdates.adminNotes = notes;
  }

  allowedUpdates.updatedAt = serverTs();
  allowedUpdates.reviewedBy = adminUser.email || "admin";

  await docRef.update(allowedUpdates);

  // Telemetry audit
  await db.collection("feedback_events").add({
    type: "status_changed",
    feedbackId,
    adminEmail: adminUser.email,
    newStatus: allowedUpdates.status || existing.status,
    timestamp: serverTs(),
  });

  return { ok: true, message: "Feedback updated successfully." };
}

/**
 * Aggregates statistics for the Admin Feedback & Product Intelligence Dashboard.
 */
async function getFeedbackIntelligenceStats() {
  const db = firestore();
  const snap = await db.collection("feedback").limit(1000).get();

  const counts = {
    total: snap.size,
    byCategory: {},
    byStatus: {},
    bySeverity: {},
    ratingSum: 0,
    ratingCount: 0,
    positiveCount: 0, // rating >= 4 or thumbs up
    negativeCount: 0, // rating <= 2 or thumbs down
    openBugs: 0,
    resolvedBugs: 0,
    pendingFeatures: 0,
    aiMetrics: {
      total: 0,
      thumbsUp: 0,
      thumbsDown: 0,
      byModel: {},
      subRatingSums: { accuracy: 0, clarity: 0, relevance: 0, completeness: 0 },
      subRatingCounts: { accuracy: 0, clarity: 0, relevance: 0, completeness: 0 },
    },
    learningMetrics: {
      total: 0,
      understoodCount: 0,
      easyToFollowCount: 0,
      helpedTopicCount: 0,
      commonConfusingTopics: {},
    },
    teacherMetrics: {
      total: 0,
      usefulnessSum: 0,
      qualitySum: 0,
      relevanceSum: 0,
      count: 0,
    },
  };

  snap.docs.forEach((doc) => {
    const d = doc.data();
    const cat = d.category || "general";
    counts.byCategory[cat] = (counts.byCategory[cat] || 0) + 1;

    const st = d.status || "new";
    counts.byStatus[st] = (counts.byStatus[st] || 0) + 1;

    if (d.rating) {
      counts.ratingSum += d.rating;
      counts.ratingCount++;
      if (d.rating >= 4) counts.positiveCount++;
      if (d.rating <= 2) counts.negativeCount++;
    }

    if (cat === "bug_report") {
      const sev = d.severity || "medium";
      counts.bySeverity[sev] = (counts.bySeverity[sev] || 0) + 1;
      if (st === "resolved" || st === "closed") {
        counts.resolvedBugs++;
      } else {
        counts.openBugs++;
      }
    }

    if (cat === "feature_request") {
      if (st === "under_review" || st === "planned") {
        counts.pendingFeatures++;
      }
    }

    if (cat === "ai_response") {
      counts.aiMetrics.total++;
      const isDown = d.details?.feedbackType === "thumbs_down" || (d.rating && d.rating <= 2);
      if (isDown) {
        counts.aiMetrics.thumbsDown++;
        counts.negativeCount++;
      } else {
        counts.aiMetrics.thumbsUp++;
        counts.positiveCount++;
      }

      const model = d.details?.model || "default";
      if (!counts.aiMetrics.byModel[model]) {
        counts.aiMetrics.byModel[model] = { total: 0, thumbsUp: 0, thumbsDown: 0 };
      }
      counts.aiMetrics.byModel[model].total++;
      if (isDown) counts.aiMetrics.byModel[model].thumbsDown++;
      else counts.aiMetrics.byModel[model].thumbsUp++;

      if (d.subRatings) {
        for (const [key, val] of Object.entries(d.subRatings)) {
          if (counts.aiMetrics.subRatingSums[key] != null && typeof val === "number") {
            counts.aiMetrics.subRatingSums[key] += val;
            counts.aiMetrics.subRatingCounts[key]++;
          }
        }
      }
    }

    if (cat === "learning_experience") {
      counts.learningMetrics.total++;
      if (d.details?.understood === true) counts.learningMetrics.understoodCount++;
      if (d.details?.easyToFollow === true) counts.learningMetrics.easyToFollowCount++;
      if (d.details?.helpedTopic === true) counts.learningMetrics.helpedTopicCount++;
      if (d.details?.topic) {
        const top = d.details.topic;
        counts.learningMetrics.commonConfusingTopics[top] =
          (counts.learningMetrics.commonConfusingTopics[top] || 0) + 1;
      }
    }

    if (cat === "teacher") {
      counts.teacherMetrics.total++;
      if (d.details?.educationalUsefulness) {
        counts.teacherMetrics.usefulnessSum += d.details.educationalUsefulness;
        counts.teacherMetrics.qualitySum += (d.details.explanationQuality || 0);
        counts.teacherMetrics.relevanceSum += (d.details.curriculumRelevance || 0);
        counts.teacherMetrics.count++;
      }
    }
  });

  const averageRating = counts.ratingCount > 0 ? (counts.ratingSum / counts.ratingCount).toFixed(2) : "5.00";

  return {
    ...counts,
    averageRating,
  };
}

/**
 * Generates aggregated weekly/monthly report data (no PII).
 */
async function generateFeedbackReport(timeframe = "weekly") {
  const stats = await getFeedbackIntelligenceStats();
  const db = firestore();

  const now = new Date();
  const reportId = `${timeframe}_${now.toISOString().slice(0, 10)}`;

  const report = {
    id: reportId,
    timeframe,
    generatedAt: now.toISOString(),
    totalFeedback: stats.total,
    averageRating: stats.averageRating,
    positiveRatio: stats.total > 0 ? ((stats.positiveCount / stats.total) * 100).toFixed(1) + "%" : "100%",
    openBugs: stats.openBugs,
    resolvedBugs: stats.resolvedBugs,
    pendingFeatures: stats.pendingFeatures,
    aiResponseMetrics: {
      total: stats.aiMetrics.total,
      thumbsUp: stats.aiMetrics.thumbsUp,
      thumbsDown: stats.aiMetrics.thumbsDown,
      modelQualityBreakdown: stats.aiMetrics.byModel,
    },
    learningComprehension: {
      totalSessions: stats.learningMetrics.total,
      understoodPct: stats.learningMetrics.total > 0
        ? Math.round((stats.learningMetrics.understoodCount / stats.learningMetrics.total) * 100) + "%"
        : "N/A",
      easyToFollowPct: stats.learningMetrics.total > 0
        ? Math.round((stats.learningMetrics.easyToFollowCount / stats.learningMetrics.total) * 100) + "%"
        : "N/A",
    },
    teacherFeedback: {
      total: stats.teacherMetrics.total,
      averageUsefulness: stats.teacherMetrics.count > 0
        ? (stats.teacherMetrics.usefulnessSum / stats.teacherMetrics.count).toFixed(2)
        : "N/A",
    },
    notice: "Aggregated intelligence report generated strictly without student PII under DPDP data protection guidelines.",
  };

  await db.collection("feedback_reports").doc(reportId).set({
    ...report,
    serverTimestamp: serverTs(),
  }, { merge: true });

  return report;
}

/**
 * Generates privacy-preserving CSV export of feedback items.
 */
async function generateFeedbackCsv(filters = {}, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    throw Object.assign(new Error("Admin access required to export data."), { statusCode: 403 });
  }

  const { items } = await listFeedback({ ...filters, limit: 500 }, true);

  const headers = [
    "ID",
    "Category",
    "Rating",
    "Status",
    "Severity",
    "Page",
    "Message",
    "CreatedAt",
  ];

  const escapeCsv = (str) => {
    if (str == null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map((item) => {
    return [
      escapeCsv(item.id),
      escapeCsv(item.category),
      escapeCsv(item.rating || "N/A"),
      escapeCsv(item.status),
      escapeCsv(item.severity || "N/A"),
      escapeCsv(item.page),
      escapeCsv(item.message),
      escapeCsv(item.createdAt),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

module.exports = {
  FEEDBACK_CATEGORIES,
  BUG_SEVERITIES,
  FEEDBACK_STATUSES,
  FEATURE_STATUSES,
  sanitizeText,
  validateAttachment,
  validateFeedbackPayload,
  submitFeedback,
  toggleFeatureUpvote,
  listFeedback,
  updateFeedbackAdmin,
  getFeedbackIntelligenceStats,
  generateFeedbackReport,
  generateFeedbackCsv,
};
