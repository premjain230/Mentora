// api/tutor.js
// Shared teaching endpoint for AI Chat and the Learning Hub.
//
// Mounted at /api/tutor (see app/api/tutor/route.ts). All actions reuse the
// existing authentication, rate limiting and Firestore helpers:
//   catalog  -> curriculum browsing (no AI)
//   state    -> compact learning-state summary (no AI)
//   lesson   -> adaptive teaching step (authored pack, or one cached generation)
//   evaluate -> answer evaluation + misconception + next authored question
//   chat     -> structured teaching answer for the chat page
//
// The daily free-plan chat limit is enforced here for `chat`, because this route
// calls the provider directly instead of /api/groq-proxy.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken, checkAndIncrementChat } = require("./_admin");
const {
  chatTutor,
  lessonTutor,
  evaluateTutor,
  catalogAction,
  stateAction,
  loadStudentState,
} = require("./_learn-core");
const { getConcept } = require("./_curriculum");

const ACTIONS = new Set(["catalog", "state", "lesson", "evaluate", "chat"]);

const ACTION_LIMITS = {
  catalog: { name: "tutor-catalog", limit: 40 },
  state: { name: "tutor-state", limit: 40 },
  lesson: { name: "tutor-lesson", limit: 20 },
  evaluate: { name: "tutor-evaluate", limit: 30 },
  chat: { name: "tutor-chat", limit: 15 },
};

function clip(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }
  const uid = decoded.uid;

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(req, res, err, "Invalid JSON body.");
  }

  const action = clip(body && body.action, 20);
  if (!ACTIONS.has(action)) {
    return res.status(400).json({ error: "Unknown action." });
  }

  const limit = ACTION_LIMITS[action];
  if (!rateLimit(req, res, limit)) return;

  // Free-plan daily chat quota — same server-authoritative gate as /api/groq-proxy.
  if (action === "chat") {
    let gate;
    try {
      gate = await checkAndIncrementChat(uid, decoded);
    } catch (err) {
      console.error("[tutor] chat gate failed (fail-closed):", err && err.message ? err.message : err);
      return res.status(503).json({ error: "Usage service temporarily unavailable. Please retry in a moment." });
    }
    if (!gate.allowed) {
      return res.status(gate.status || 429).json({
        error: {
          message: gate.error,
          code: "limit_reached",
          used: gate.used,
          limit: gate.limit === Infinity ? null : gate.limit,
          plan: gate.plan,
        },
      });
    }
    res.setHeader("X-Chat-Used", String(gate.used ?? ""));
    res.setHeader("X-Chat-Limit", gate.limit === Infinity ? "unlimited" : String(gate.limit ?? ""));
  }

  const conceptId = clip(body.conceptId, 160);
  const concept = conceptId ? getConcept(conceptId) : null;

  try {
    const state = await loadStudentState(uid, { conceptId: concept ? concept.conceptId : null });

    if (action === "catalog") {
      const payload = await catalogAction({ uid, body, state });
      return res.status(200).json({ ok: true, ...payload });
    }
    if (action === "state") {
      const payload = await stateAction({ uid, body: { ...body, conceptId: concept ? concept.conceptId : body.conceptId }, state });
      return res.status(200).json({ ok: true, ...payload });
    }
    if (action === "lesson") {
      const payload = await lessonTutor({ uid, body, state });
      return res.status(200).json({ ok: true, ...payload });
    }
    if (action === "evaluate") {
      const payload = await evaluateTutor({ uid, body, state });
      return res.status(200).json({ ok: true, ...payload });
    }

    const payload = await chatTutor({ uid, body, state });
    return res.status(200).json({ ok: true, ...payload });
  } catch (err) {
    const statusCode = err && err.statusCode ? err.statusCode : 500;
    console.error(`[tutor] ${action} failed:`, err && err.message ? err.message : err);
    if (statusCode >= 500) {
      return res.status(statusCode).json({
        error: "The tutor could not complete that request. Nothing was saved. Please retry.",
        retryable: true,
      });
    }
    return res.status(statusCode).json({ error: err.message || "Request failed." });
  }
};
