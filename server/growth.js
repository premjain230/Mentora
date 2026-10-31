// ─────────────────────────────────────────────────────────────
// Learning Allied Growth Agent — single consolidated serverless function.
//
// One Vercel function serves every growth-agent endpoint (Hobby
// plan allows ≤12 functions; this keeps us at 10 total). Paths are
// rewritten in vercel.json into `?route=…`:
//
//   /api/track                   → route=track
//   /api/admin                   → route=admin            (?view=…)
//   /api/admin/content[/{id}|/generate|/{id}/transition]  → route=admin/content/…
//   /api/admin/campaigns|…       → route=admin/campaigns/…
//   /api/admin/settings          → route=admin/settings
//   /api/admin/analyst           → route=admin/analyst
//   /api/admin/experiments|…     → route=admin/experiments/…
//   /api/admin/research|…        → route=admin/research/…
//   /api/cron/growth             → route=cron
//
// Every admin route is guarded by requireAdmin (server-side ID-token
// verification + email allowlist). The cron route uses requireCron.
// ─────────────────────────────────────────────────────────────

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { requireAdmin, requireCron, firestore, adminSdk, adminEmails } = require("./_admin");
const { groqComplete } = require("./_ai");
const {
  EVENT_TYPES,
  recordEvent,
  ensureVisitor,
  eventRange,
  visitorsFrom,
  usersCreated,
  activeDays,
  activatedUids,
  MIN_SAMPLE,
} = require("./_growth");
const {
  parseWindow,
  overview,
  acquisition,
  funnel,
  retention,
  usersView,
  dayStr,
} = require("./_metrics");

const DAY_MS = 86400000;
const serverTs = () => adminSdk().firestore.FieldValue.serverTimestamp();
const nowTs = () => Date.now();

function toDate(ts) {
  return ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null;
}
function toIso(ts) {
  if (!ts) return null;
  const t = toDate(ts);
  return t && !isNaN(t.getTime()) ? t.toISOString() : null;
}
function safeDate(x) {
  if (!x) return null;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = async function handler(req, res) {
  const route = String(req.query.route || req.query.action || "").trim();
  const seg = route.split("/").filter(Boolean);

  if (seg[0] === "track") return routeTrack(req, res);
  if (seg[0] === "cron") return routeCron(req, res);
  if (seg[0] === "admin") {
    const adminSeg = seg.slice(1);
    return routeAdmin(req, res, adminSeg);
  }
  return res.status(404).json({ error: "Not found." });
}

/* ─────────────────────────────────────────────────────────────
   /api/track — first-party event ingestion (anonymous + signed-in)
───────────────────────────────────────────────────────────── */
async function routeTrack(req, res) {
  if (!applyCors(req, res, ["POST"])) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!rateLimit(req, res, { name: "track", limit: 240 })) return;

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(req, res, err, "Invalid request body.");
  }

  const ev = String(body.ev || "").trim();
  const visitorId = String(body.visitorId || "").trim().slice(0, 64);
  if (!EVENT_TYPES.has(ev)) return res.status(400).json({ error: "Unknown event type." });
  if (!visitorId) return res.status(400).json({ error: "Missing visitorId." });

  let uid = null;
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const { verifyIdToken } = require("./_admin");
    const decoded = await verifyIdToken(authHeader.slice(7).trim());
    if (decoded && decoded.uid) uid = decoded.uid;
  }

  const nowDate = new Date().toISOString().slice(0, 10);
  try {
    if (ev === "first_visit") {
      await ensureVisitor(visitorId, body.props || {}, nowDate);
      await recordEvent({ ev, visitorId, uid, props: {}, nowDate });
    } else {
      await recordEvent({ ev, visitorId, uid, props: body.props || {}, nowDate });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return sendError(req, res, err, "Could not record the event.");
  }
}

/* ─────────────────────────────────────────────────────────────
   /api/cron/growth — daily job (Vercel cron → x-vercel-cron/CRON_SECRET)
───────────────────────────────────────────────────────────── */
async function routeCron(req, res) {
  if (!applyCors(req, res, ["POST", "GET"])) return;
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!requireCron(req, res)) return;

  const db = firestore();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dayStart = new Date(now.getTime() - DAY_MS);

  try {
    const [events, visitors] = await Promise.all([
      eventRange(dayStart, now),
      visitorsFrom(dayStart, now),
    ]);
    const signupUids = new Set();
    const chatUids = new Set();
    for (const e of events) {
      const d = e.data() || {};
      if (d.uid && d.ev === "signup") signupUids.add(d.uid);
      if (d.uid && d.ev === "ai_chat_started") chatUids.add(d.uid);
    }
    await db
      .collection("growth_reports")
      .doc("daily_" + today)
      .set(
        {
          day: today,
          visitors: visitors.length,
          signups: signupUids.size,
          chatUsers: chatUids.size,
          events: events.length,
          generatedAt: serverTs(),
        },
        { merge: true }
      );

    let published = 0;
    const due = await db
      .collection("growth_content")
      .where("status", "==", "scheduled")
      .where("publishAt", "<=", now)
      .limit(50)
      .get();
    for (const doc of due.docs) {
      await doc.ref.update({ status: "published", publishedAt: serverTs(), updatedAt: serverTs() });
      published++;
    }

    await db.collection("growth_reports").doc("logs").collection("events").add({
      kind: "daily_cron",
      day: today,
      published,
      summary: { visitors: visitors.length, signups: signupUids.size },
      ts: serverTs(),
    });

    return res.status(200).json({ ok: true, day: today, published });
  } catch (err) {
    console.error("[cron/growth]", err);
    return res.status(500).json({ error: "Cron run failed." });
  }
}

/* ─────────────────────────────────────────────────────────────
   /api/admin/* — hub with sub-routes
───────────────────────────────────────────────────────────── */
async function routeAdmin(req, res, seg) {
  if (seg.length === 0) return adminMetrics(req, res);
  switch (seg[0]) {
    case "settings": return adminSettings(req, res);
    case "content": return adminContent(req, res, seg[1] || null, seg[2] || null);
    case "campaigns": return adminCampaigns(req, res, seg[1] || null, seg[2] || null);
    case "analyst": return adminAnalyst(req, res);
    case "experiments": return adminExperiments(req, res, seg[1] || null, seg[2] || null);
    case "research": return adminResearch(req, res, seg[1] || null);
    default: return res.status(404).json({ error: "Not found." });
  }
}

/* ── /api/admin — metrics views ─────────────────────────────── */
async function adminMetrics(req, res) {
  if (!applyCors(req, res, ["GET"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!rateLimit(req, res, { name: "admin", limit: 120 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  // No ?view= → identity/capabilities check (used by the admin gate).
  const view = req.query.view;
  if (!view) {
    return res.status(200).json({
      ok: true,
      admin: { uid: auth.uid, email: auth.email },
      views: ["overview", "acquisition", "funnel", "retention", "users"],
      minSample: MIN_SAMPLE,
    });
  }

  try {
    const { from, to } = parseWindow(req.query);
    if (view === "overview") return res.status(200).json(await overview(from, to));
    if (view === "acquisition") return res.status(200).json(await acquisition(from, to));
    if (view === "funnel") return res.status(200).json(await funnel(from, to));
    if (view === "retention") return res.status(200).json(await retention(from, to));
    if (view === "users") return res.status(200).json(await usersView(from, to));
    return res.status(200).json({
      admin: { uid: auth.uid, email: auth.email },
      views: ["overview", "acquisition", "funnel", "retention", "users"],
      minSample: MIN_SAMPLE,
    });
  } catch (err) {
    return sendError(req, res, err, "Could not load analytics.");
  }
}

/* ── /api/admin/settings ────────────────────────────────────── */
async function adminSettings(req, res) {
  if (!applyCors(req, res, ["GET", "PUT"])) return;
  if (!rateLimit(req, res, { name: "admin-settings", limit: 120 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const settingsRef = db.doc("growth_settings/admin");

  try {
    if (req.method === "GET") {
      const snap = await settingsRef.get();
      let s = {};
      if (snap.exists) s = snap.data() || {};
      return res.status(200).json({
        admin: { uid: auth.uid, email: auth.email },
        adminEmails: adminEmails(),
        capabilities: {
          groq: Boolean(process.env.GROQ_API_KEY),
          search: Boolean((process.env.SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY) && (process.env.SEARCH_ENGINE_ID || process.env.GOOGLE_CX)),
          cronSecret: Boolean(process.env.CRON_SECRET),
        },
        minSample: 10,
        settings: {
          autoAnalystDaily: s.autoAnalystDaily ?? false,
          attributionWindowDays: s.attributionWindowDays ?? 45,
          notes: s.notes || "",
        },
      });
    }

    if (req.method === "PUT") {
      const b = await readJsonBody(req);
      const patch = {};
      if ("autoAnalystDaily" in b) patch.autoAnalystDaily = Boolean(b.autoAnalystDaily);
      if ("attributionWindowDays" in b) {
        const n = Number(b.attributionWindowDays);
        patch.attributionWindowDays = isNaN(n) ? 45 : Math.max(7, Math.min(180, Math.round(n)));
      }
      if ("notes" in b) patch.notes = String(b.notes).slice(0, 1000);
      patch.updatedAt = serverTs();
      await settingsRef.set(patch, { merge: true });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return sendError(req, res, err, "Could not load settings.");
  }
}

/* ── /api/admin/content — Content Studio ────────────────────── */
const CONTENT_TYPES = new Set([
  "shorts_script", "social", "educational", "blog", "email", "hook", "cta",
]);
const CONTENT_STATUSES = new Set(["draft", "review", "approved", "scheduled", "published", "archived"]);

function cleanContent(item) {
  return {
    id: item.id,
    type: item.data().type || "",
    title: item.data().title || "",
    body: item.data().body || "",
    status: item.data().status || "draft",
    audience: item.data().audience || "",
    topics: item.data().topics || [],
    publishAt: toIso(item.data().publishAt),
    publishedAt: toIso(item.data().publishedAt),
    updatedAt: toIso(item.data().updatedAt),
    createdAt: toIso(item.data().createdAt),
  };
}

function contentStatusError(action, from) {
  const rules = {
    review: ["draft"],
    approve: ["review"],
    schedule: ["approved"],
    publish: ["approved", "scheduled"],
    draft: ["review", "approved", "scheduled", "published", "archived"],
    reject: ["draft", "review", "approved", "scheduled"],
    archive: ["draft", "review", "approved", "scheduled", "published"],
  };
  const allowed = rules[action] || [];
  const next = action === "reject" ? "draft" : action === "publish" ? "published"
    : action === "schedule" ? "scheduled" : action;
  if (!allowed.includes(from)) return { error: `Cannot go from "${from}" to "${next}".` };
  return null;
}

async function adminContent(req, res, id, sub) {
  if (!applyCors(req, res, ["GET", "POST", "PUT", "DELETE"])) return;
  if (!rateLimit(req, res, { name: "admin-content", limit: 300 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const col = db.collection("growth_content");
  const isGenerate = id === "generate";
  if (isGenerate) id = null; // /api/admin/content/generate

  try {
    // generate (AI draft, not saved)
    if (req.method === "POST" && isGenerate) {
      const body = await readJsonBody(req);
      const out = await groqComplete({
        messages: contentPrompt(body.type, body.topic, body.audience, body.instructions),
        json: false,
      });
      return res.status(200).json({ result: out });
    }

    // create
    if (req.method === "POST" && !id) {
      const body = await readJsonBody(req);
      if (!CONTENT_TYPES.has(body.type)) return res.status(400).json({ error: "Unknown content type." });
      const status = CONTENT_STATUSES.has(body.status) ? body.status : "draft";
      if (status === "published" || status === "approved" || status === "scheduled") {
        return res.status(400).json({ error: "New items start as draft — then send to review." });
      }
      const doc = await col.add({
        type: body.type,
        title: String(body.title || "").slice(0, 200),
        body: String(body.body || ""),
        status,
        audience: String(body.audience || "").slice(0, 200),
        topics: Array.isArray(body.topics) ? body.topics.map(String).slice(0, 20) : [],
        publishAt: safeDate(body.publishAt),
        publishedAt: null,
        authorUid: auth.uid,
        createdAt: serverTs(),
        updatedAt: serverTs(),
      });
      return res.status(201).json({ id: doc.id });
    }

    // list
    if (req.method === "GET") {
      const snap = await col.orderBy("updatedAt", "desc").limit(300).get();
      let items = snap.docs.map(cleanContent);
      const type = req.query.type;
      const status = req.query.status;
      if (type && CONTENT_TYPES.has(type)) items = items.filter((i) => i.type === type);
      if (status && CONTENT_STATUSES.has(status)) items = items.filter((i) => i.status === status);
      return res.status(200).json({ items });
    }

    if (!id) return res.status(404).json({ error: "Not found." });

    // transition
    if (req.method === "POST" && sub === "transition") {
      const body = await readJsonBody(req);
      const action = String(body.action || "");
      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found." });
      const from = doc.data().status;
      const err = contentStatusError(action, from);
      if (err) return res.status(400).json(err);
      const patch = { status: action === "reject" ? "draft" : action === "publish" ? "published" : action };
      if (action === "publish") patch.publishedAt = serverTs();
      if (action === "schedule") patch.publishAt = safeDate(body.publishAt);
      await col.doc(id).update({ ...patch, updatedAt: serverTs() });
      return res.status(200).json({ ok: true, status: patch.status });
    }

    // update
    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found." });
      const patch = {};
      if ("title" in body) patch.title = String(body.title).slice(0, 200);
      if ("body" in body) patch.body = String(body.body);
      if ("audience" in body) patch.audience = String(body.audience).slice(0, 200);
      if ("topics" in body) patch.topics = Array.isArray(body.topics) ? body.topics.map(String).slice(0, 20) : [];
      if (body.status && CONTENT_STATUSES.has(body.status) && ["draft", "review", "archived"].includes(body.status)) {
        patch.status = body.status;
      }
      if ("publishAt" in body) patch.publishAt = safeDate(body.publishAt);
      patch.updatedAt = serverTs();
      await col.doc(id).update(patch);
      return res.status(200).json({ ok: true });
    }

    // delete
    if (req.method === "DELETE") {
      await col.doc(id).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return sendError(req, res, err, "Content operation failed.");
  }
}

function contentPrompt(type, topic, audience, instructions) {
  const intro =
    "You are the content strategist for Learning Allied, a study companion for Indian school students (JEE, NEET, boards). " +
    "Create genuinely useful, honest student content. NEVER invent statistics, testimonials, or exam claims. " +
    `Format: a ready-to-share piece. Type: ${type}. Topic: ${topic}. Audience: ${audience || "students"}. ` +
    (instructions ? `Extra guidance: ${instructions}` : "");
  const shape =
    type === "shorts_script"
      ? "Return a YouTube Shorts script: <HOOK> … <SCRIPT with visual notes> … <CTA>. Keep under 45 seconds."
      : type === "hook"
        ? "Return 5 attention hooks (each 1 line)."
        : type === "cta"
          ? "Return 5 CTA variations for email/social."
          : type === "email"
            ? "Return a complete email draft with subject line and body."
            : "Return: TITLE, then the full content, then 3 HOOKS and 3 CTA VARIATIONS clearly labeled.";
  return [
    { role: "system", content: intro },
    { role: "user", content: shape },
  ];
}

/* ── /api/admin/campaigns ───────────────────────────────────── */
const CAMPAIGN_STATUS = new Set(["draft", "active", "paused", "completed"]);

function cleanCampaign(doc) {
  const d = doc.data() || {};
  return {
    id: doc.id,
    name: d.name || "",
    objective: d.objective || "",
    audience: d.audience || "",
    topic: d.topic || "",
    channels: (d.channels || []).map(String),
    status: d.status || "draft",
    startAt: toIso(d.startAt),
    endAt: toIso(d.endAt),
    contentId: d.contentId || null,
    links: (d.links || []).slice(0, 20).map(String),
    notes: d.notes || "",
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

async function campaignPerf(db, campaigns, now) {
  if (!campaigns.length) return new Map();
  const windowStart = new Date(now.getTime() - 45 * DAY_MS);
  const events = await eventRange(windowStart, new Date(now.getTime() + DAY_MS));
  const buckets = new Map();
  for (const c of campaigns) {
    buckets.set(c.name, { visitors: new Set(), signups: new Set(), activated: new Set(), returning: new Set(), converted: new Set(), days: new Map() });
  }
  const ACT = new Set(["ai_chat_started", "study_plan_created", "quiz_completed"]);
  for (const e of events) {
    const d = e.data() || {};
    const cm = (d.props && d.props.utm_campaign) || "";
    const b = cm && buckets.get(cm);
    if (!b) continue;
    if (d.visitorId) b.visitors.add(d.visitorId);
    if (d.uid) {
      if (d.ev === "signup") b.signups.add(d.uid);
      if (ACT.has(d.ev)) b.activated.add(d.uid);
      if (d.ev === "subscription_started") b.converted.add(d.uid);
      if (!b.days.has(d.uid)) b.days.set(d.uid, new Set());
      if (d.day) b.days.get(d.uid).add(d.day);
    }
  }
  const out = new Map();
  for (const [name, b] of buckets) {
    let returning = 0;
    for (const [uid, ds] of b.days) if (ds.size >= 2) returning++;
    out.set(name, {
      visitors: b.visitors.size,
      signups: b.signups.size,
      activated: b.activated.size,
      returning,
      converted: b.converted.size,
      signupRate: b.visitors.size ? Math.round((b.signups.size / b.visitors.size) * 1000) / 10 : 0,
    });
  }
  return out;
}

async function adminCampaigns(req, res, id, sub) {
  if (!applyCors(req, res, ["GET", "POST", "PUT", "DELETE"])) return;
  if (!rateLimit(req, res, { name: "admin-campaigns", limit: 300 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const col = db.collection("growth_campaigns");

  try {
    if (req.method === "POST" && !id) {
      const b = await readJsonBody(req);
      if (!String(b.name || "").trim()) return res.status(400).json({ error: "Name required." });
      const status = CAMPAIGN_STATUS.has(b.status) ? b.status : "draft";
      const doc = await col.add({
        name: String(b.name).trim().slice(0, 120),
        objective: String(b.objective || "").slice(0, 300),
        audience: String(b.audience || "").slice(0, 200),
        topic: String(b.topic || "").slice(0, 200),
        channels: Array.isArray(b.channels) ? b.channels.map(String).slice(0, 10) : [],
        status,
        startAt: safeDate(b.startAt),
        endAt: safeDate(b.endAt),
        contentId: b.contentId ? String(b.contentId) : null,
        links: Array.isArray(b.links) ? b.links.map(String).slice(0, 20) : [],
        notes: String(b.notes || "").slice(0, 1000),
        createdAt: serverTs(),
        updatedAt: serverTs(),
      });
      return res.status(201).json({ id: doc.id });
    }

    if (req.method === "GET" && !id) {
      const snap = await col.orderBy("updatedAt", "desc").limit(200).get();
      const camps = snap.docs.map(cleanCampaign);
      const perf = await campaignPerf(db, camps, new Date());
      const items = camps.map((c) => ({ ...c, performance: perf.get(c.name) || null }));
      return res.status(200).json({ items });
    }

    if (!id) return res.status(404).json({ error: "Not found." });
    const ref = col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Not found." });

    if (req.method === "POST" && sub === "transition") {
      const b = await readJsonBody(req);
      const action = String(b.action || "");
      const next = { activate: "active", pause: "paused", complete: "completed", draft: "draft" }[action];
      if (!next) return res.status(400).json({ error: "Unknown action." });
      await ref.update({ status: next, updatedAt: serverTs() });
      return res.status(200).json({ ok: true, status: next });
    }

    if (req.method === "PUT") {
      const b = await readJsonBody(req);
      const patch = {};
      if ("name" in b && String(b.name).trim()) patch.name = String(b.name).trim().slice(0, 120);
      if ("objective" in b) patch.objective = String(b.objective).slice(0, 300);
      if ("audience" in b) patch.audience = String(b.audience).slice(0, 200);
      if ("topic" in b) patch.topic = String(b.topic).slice(0, 200);
      if ("channels" in b) patch.channels = Array.isArray(b.channels) ? b.channels.map(String).slice(0, 10) : [];
      if ("links" in b) patch.links = Array.isArray(b.links) ? b.links.map(String).slice(0, 20) : [];
      if ("notes" in b) patch.notes = String(b.notes).slice(0, 1000);
      if ("status" in b && CAMPAIGN_STATUS.has(b.status)) patch.status = b.status;
      if ("startAt" in b) patch.startAt = safeDate(b.startAt);
      if ("endAt" in b) patch.endAt = safeDate(b.endAt);
      patch.updatedAt = serverTs();
      await ref.update(patch);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await ref.delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return sendError(req, res, err, "Campaign operation failed.");
  }
}

/* ── /api/admin/analyst ─────────────────────────────────────── */
async function adminAnalyst(req, res) {
  if (!applyCors(req, res, ["GET"])) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!rateLimit(req, res, { name: "admin-analyst", limit: 30 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const cacheRef = db.collection("growth_reports").doc("analyst_latest");
  try {
    if (req.query.fresh !== "1") {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        const age = nowTs() - new Date(data.generatedAtTs).getTime();
        if (age < 6 * 3600000) {
          return res.status(200).json({ cached: true, report: data });
        }
      }
    }

    const to = new Date();
    const from30 = new Date(to.getTime() - 29 * DAY_MS);
    const [ov30, ret30] = await Promise.all([overview(from30, to), retention(from30, to)]);

    const facts = buildFacts(ov30, ret30);
    const report = await groqComplete({
      json: true,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "You are Learning Allied's growth analyst. You receive only real, server-collected numbers. " +
            "STRICT RULES: (1) Never invent, estimate, guess or extrapolate any statistic — if you don't " +
            "have a number, say so. (2) Distinguish correlation from causation: use language like " +
            "'is associated with' and 'correlated with', never 'causes', unless the user proves it. " +
            "(3) If the facts say the sample is too small, your recommendation is to wait. " +
            "(4) Return strict JSON with this shape: " +
            '{"observations":[{title,detail,evidence}],"anomalies":[{title,detail,evidence}],' +
            '"opportunities":[{title,action,why}],"retention":[{finding,recommendation}],' +
            '"content":[{format,topic,angle}],"experiments":[{hypothesis,setup,successMetric}]}.',
        },
        { role: "user", content: facts },
      ],
    });

    const doc = {
      generatedAt: serverTs(),
      generatedAtTs: nowTs(),
      range: { from: dayStr(from30), to: dayStr(to) },
      overview: ov30.metrics,
      convention: "correlation-not-causation",
      report,
    };
    await cacheRef.set(doc);
    await db.collection("growth_reports").doc("analyst_" + dayStr(to)).set(doc, { merge: true });
    return res.status(200).json({ cached: false, report: doc });
  } catch (err) {
    return sendError(req, res, err, "Could not run the analyst.");
  }
}

function buildFacts(ov30, ret30) {
  const m = ov30.metrics;
  if (!m) {
    return "FACTS: The sample is too small to analyze yet (" + MIN_SAMPLE +
      "+ signups needed). Recommended action: wait and re-run in a few days.";
  }
  const lines = [
    "REAL DATA (last 30 days), do not exceed or invent beyond these:",
    `- Visitors: ${m.visitors}`,
    `- Signups: ${m.signups}`,
    `- Activated: ${m.activated} (${m.activationRate}%)`,
    `- Returning (>=2 active days): ${m.returning} (${m.returningRate}%)`,
    `- Subscriptions started: ${m.converted} (${m.conversionRate}%)`,
    `- Visitor→signup: ${m.signupRate}%`,
    "- Funnel: visitors→signups→activated→returning→converted with the rates above.",
    "- Retention cohorts: ",
  ];
  const ok = ret30.cohorts || [];
  if (ok.length === 0) {
    lines.push("  * No mature cohorts yet (need ≥" + MIN_SAMPLE + " signups per cohort week).");
  } else {
    for (const c of ok.slice(0, 6)) {
      const d1 = c.d1 ? c.d1.pct + "%" : "n/a";
      const d7 = c.d7 ? c.d7.pct + "%" : "n/a";
      const d30 = c.d30 ? c.d30.pct + "%" : "n/a";
      lines.push(`  * Cohort ${c.cohort}: n=${c.signups}, d1=${d1}, d7=${d7}, d30=${d30}`);
    }
  }
  if (ret30.insufficient) lines.push("- Retention note: " + ret30.insufficient);
  return lines.join("\n");
}

/* ── /api/admin/experiments ─────────────────────────────────── */
const EXP_STATUS = new Set(["draft", "running", "paused", "concluded"]);
const MIN_VARIANT_EVENTS = 30;
const MIN_LIFT = 0.1;

function cleanExperiment(doc) {
  const d = doc.data() || {};
  return {
    id: doc.id,
    name: d.name || "",
    kind: d.kind || "",
    hypothesis: d.hypothesis || "",
    urlField: d.urlField || "",
    variants: (d.variants || []).map((v) => ({ id: v.id, label: v.label, url: v.url || "" })),
    status: d.status || "draft",
    startAt: toIso(d.startAt),
    endAt: toIso(d.endAt),
    winner: d.winner || null,
    notes: d.notes || "",
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  };
}

async function experimentStats(db, exp, now) {
  const ids = (exp.variants || []).map((v) => String(v.id));
  if (!ids.length) return { variants: [], sufficient: false };

  const from = new Date(Math.min(Date.parse(exp.startAt || now.toISOString()), now.getTime() - 30 * DAY_MS));
  const to = new Date(now.getTime() + DAY_MS);
  const events = await eventRange(from, to);

  const count = new Map();
  const conv = new Map();
  for (const e of events) {
    const d = e.data() || {};
    const p = d.props || {};
    if (p.experiment !== exp.id) continue;
    const vid = String(p.variant || "");
    if (!ids.includes(vid)) continue;
    count.set(vid, (count.get(vid) || 0) + 1);
    if (d.ev === "experiment_conversion") conv.set(vid, (conv.get(vid) || 0) + 1);
  }

  const variants = ids.map((id) => {
    const n = count.get(id) || 0;
    const c = conv.get(id) || 0;
    return { id, events: n, conversions: c, conversion: n ? Math.round((c / n) * 1000) / 10 : 0 };
  });

  const minN = Math.min(...variants.map((v) => v.events));
  const sufficient = minN >= MIN_VARIANT_EVENTS;

  let recommendation = null;
  if (sufficient) {
    const sorted = [...variants].sort((a, b) => b.conversion - a.conversion);
    const top = sorted[0];
    const base = sorted[sorted.length - 1];
    if (base.events >= MIN_VARIANT_EVENTS && top.conversion >= base.conversion * (1 + MIN_LIFT)) {
      recommendation = {
        lead: top.id,
        note: "Correlational comparison only — configure the same traffic split and re-run before trusting.",
      };
    } else {
      recommendation = { lead: null, note: "No meaningful lift yet. Collect more data before deciding." };
    }
  }

  return { variants, sufficient, minRequired: MIN_VARIANT_EVENTS, recommendation };
}

async function adminExperiments(req, res, id, sub) {
  if (!applyCors(req, res, ["GET", "POST", "PUT", "DELETE"])) return;
  if (!rateLimit(req, res, { name: "admin-experiments", limit: 120 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const col = db.collection("growth_experiments");

  try {
    if (req.method === "POST" && !id) {
      const b = await readJsonBody(req);
      if (!String(b.name || "").trim()) return res.status(400).json({ error: "Name required." });
      const doc = await col.add({
        name: String(b.name).trim().slice(0, 120),
        kind: String(b.kind || "landing").slice(0, 40),
        hypothesis: String(b.hypothesis || "").slice(0, 1000),
        urlField: String(b.urlField || "").slice(0, 200),
        variants: Array.isArray(b.variants)
          ? b.variants.slice(0, 10).map((v) => ({ id: String(v.id || "").slice(0, 64), label: String(v.label || "").slice(0, 120), url: String(v.url || "").slice(0, 300) }))
          : [],
        status: "draft",
        startAt: safeDate(b.startAt),
        endAt: safeDate(b.endAt),
        winner: null,
        notes: String(b.notes || "").slice(0, 1000),
        createdAt: serverTs(),
        updatedAt: serverTs(),
      });
      return res.status(201).json({ id: doc.id });
    }

    if (req.method === "GET" && !id) {
      const snap = await col.orderBy("updatedAt", "desc").limit(100).get();
      return res.status(200).json({ items: snap.docs.map(cleanExperiment) });
    }

    if (id && req.method === "GET" && sub === "stats") {
      const doc = await col.doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found." });
      const stats = await experimentStats(db, cleanExperiment(doc), new Date());
      return res.status(200).json(stats);
    }

    if (!id) return res.status(404).json({ error: "Not found." });
    const ref = col.doc(id);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Not found." });

    if (req.method === "POST") {
      const b = await readJsonBody(req);
      const actionMap = { launch: "running", pause: "paused", conclude: "concluded", draft: "draft" };
      const next = actionMap[String(b.action || "")];
      if (!next) return res.status(400).json({ error: "Unknown action." });
      const patch = { status: next, updatedAt: serverTs() };
      if (next === "running") patch.startAt = safeDate(b.startAt) || new Date();
      if (next === "concluded") patch.endAt = safeDate(b.endAt) || new Date();
      await ref.update(patch);
      return res.status(200).json({ ok: true, status: next });
    }

    if (req.method === "PUT") {
      const b = await readJsonBody(req);
      const patch = {};
      if ("name" in b && String(b.name).trim()) patch.name = String(b.name).trim().slice(0, 120);
      if ("hypothesis" in b) patch.hypothesis = String(b.hypothesis).slice(0, 1000);
      if ("urlField" in b) patch.urlField = String(b.urlField).slice(0, 200);
      if ("variants" in b)
        patch.variants = Array.isArray(b.variants)
          ? b.variants.slice(0, 10).map((v) => ({ id: String(v.id || "").slice(0, 64), label: String(v.label || "").slice(0, 120), url: String(v.url || "").slice(0, 300) }))
          : [];
      if ("status" in b && EXP_STATUS.has(b.status)) patch.status = b.status;
      if ("startAt" in b) patch.startAt = safeDate(b.startAt);
      if ("endAt" in b) patch.endAt = safeDate(b.endAt);
      if ("winner" in b) patch.winner = b.winner ? String(b.winner).slice(0, 64) : null;
      if ("notes" in b) patch.notes = String(b.notes).slice(0, 1000);
      patch.updatedAt = serverTs();
      await ref.update(patch);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await ref.delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return sendError(req, res, err, "Experiment operation failed.");
  }
}

/* ── /api/admin/research ────────────────────────────────────── */
function cleanResearch(doc) {
  const d = doc.data() || {};
  return {
    id: doc.id,
    topic: d.topic || "",
    source: d.source || "",
    summary: d.summary || "",
    problem: d.problem || "",
    audience: d.audience || "",
    opportunityScore: typeof d.opportunityScore === "number" ? d.opportunityScore : null,
    suggestedContent: d.suggestedContent || "",
    createdAt: toIso(d.createdAt),
  };
}

async function doResearch(topic, n) {
  const key = process.env.SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID || process.env.GOOGLE_CX;
  let sources = [];
  if (key && cx) {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}` +
      `&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(topic + " student exam preparation")}` +
      `&num=${Math.min(5, n || 5)}&fields=items(title,link,snippet)`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      sources = (data.items || []).map((it) => ({
        title: it.title || "",
        link: it.link || "",
        snippet: (it.snippet || "").slice(0, 400),
      }));
    }
  }

  const srcText = sources.length
    ? sources.map((s, i) => `${i + 1}. ${s.title} — ${s.snippet}\n   ${s.link}`).join("\n")
    : "(No search results — use general knowledge of common student pain points.)";

  const out = await groqComplete({
    json: true,
    temperature: 0.5,
    maxTokens: 4000,
    messages: [
      {
        role: "system",
        content:
          "You are Learning Allied's research analyst for educational content (Indian school students). " +
          "Identify REAL, common study problems and content opportunities around a topic. " +
          "NEVER invent statistics, testimonials or false claims about apps/companies. " +
          'Return strict JSON: {"items":[{"topic","problem","audience","opportunityScore"(0-100 int),' +
          '"suggestedContent","source"(where you learned this), "summary"}]}. ' +
          `Produce up to ${n || 5} items.`,
      },
      { role: "user", content: `Topic: ${topic}\n\nResearch snippets:\n${srcText}` },
    ],
  });

  return (out.items || []).map((it) => ({
    topic: trimStr(it.topic),
    summary: trimStr(it.summary),
    problem: trimStr(it.problem),
    audience: trimStr(it.audience),
    opportunityScore: clampScore(it.opportunityScore),
    suggestedContent: trimStr(it.suggestedContent),
    source: it.source || (sources[0] && sources[0].link) || "",
  }));
}

function trimStr(s) {
  return String(s || "").trim();
}
function clampScore(v) {
  const n = Number(v);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function adminResearch(req, res, sub) {
  if (!applyCors(req, res, ["GET", "POST", "DELETE"])) return;
  if (!rateLimit(req, res, { name: "admin-research", limit: 120 })) return;

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const db = firestore();
  const col = db.collection("growth_research");

  try {
    if (req.method === "POST" && sub === "generate") {
      const b = await readJsonBody(req);
      if (!String(b.topic || "").trim()) return res.status(400).json({ error: "Topic required." });
      const items = await doResearch(String(b.topic).trim(), Number(b.n) || 5);
      const ids = [];
      if (b.save) {
        for (const it of items) {
          const doc = await col.add({ ...it, createdAt: serverTs() });
          ids.push(doc.id);
        }
      }
      return res.status(200).json({ items, saved: ids });
    }

    if (req.method === "GET") {
      const snap = await col.orderBy("createdAt", "desc").limit(200).get();
      return res.status(200).json({ items: snap.docs.map(cleanResearch) });
    }

    if (req.method === "POST" && !sub) {
      const b = await readJsonBody(req);
      if (!String(b.topic || "").trim()) return res.status(400).json({ error: "Topic required." });
      const doc = await col.add({
        topic: String(b.topic).trim().slice(0, 200),
        source: String(b.source || "").slice(0, 500),
        summary: String(b.summary || "").slice(0, 2000),
        problem: String(b.problem || "").slice(0, 1000),
        audience: String(b.audience || "").slice(0, 200),
        opportunityScore: clampScore(b.opportunityScore),
        suggestedContent: String(b.suggestedContent || "").slice(0, 2000),
        createdAt: serverTs(),
      });
      return res.status(201).json({ id: doc.id });
    }

    if (req.method === "DELETE" && sub) {
      await col.doc(sub).delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    return sendError(req, res, err, "Research operation failed.");
  }
}