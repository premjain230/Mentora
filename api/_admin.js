// ─────────────────────────────────────────────────────────────
// Aquila Growth Agent — shared admin/auth server helpers.
//
// Every /api/admin/*, /api/marketing/* and /api/cron/* endpoint
// must call requireAdmin/verifyCron before touching data.
// Authorization is ALWAYS verified server-side with the Firebase
// Admin SDK + a server-controlled email allowlist (env ADMIN_EMAILS).
// Never trust a client-side flag.
// ─────────────────────────────────────────────────────────────

const DEFAULT_ADMIN_EMAILS = "premjains106@gmail.com";
const crypto = require("crypto");

let _admin = null;

function adminSdk() {
  if (_admin) return _admin;
  const admin = require("firebase-admin");
  const serviceAccountRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_ADMIN_SA;
  if (!serviceAccountRaw) {
    throw Object.assign(
      new Error("Firebase service account is not configured on the server."),
      { statusCode: 500 }
    );
  }
  let credential;
  try {
    const parsed = JSON.parse(serviceAccountRaw);
    credential = admin.credential.cert(parsed);
    if (!process.env.FIREBASE_PROJECT_ID && parsed.project_id) {
      process.env.FIREBASE_PROJECT_ID = parsed.project_id;
    }
  } catch (e) {
    throw Object.assign(
      new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON."),
      { statusCode: 500 }
    );
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || "mentora-c6dca",
    });
  }
  _admin = admin;
  return admin;
}

function firestore() {
  return adminSdk().firestore();
}

function adminEmails() {
  const raw = (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(raw)];
}

function isAdminEmail(email) {
  return Boolean(email) && adminEmails().includes(email.trim().toLowerCase());
}

let _firebaseKeysCache = null;
let _firebaseKeysCachedAt = 0;

/**
 * Verifies a Firebase ID token using Google's published public keys. This path
 * needs ONLY the project id (no service account), so /api/* functions keep
 * working even when FIREBASE_SERVICE_ACCOUNT is not configured on the
 * deployment. Signature + iss/aud/exp are all checked; returns decoded claims
 * ({ uid, email, ... }) or null when invalid.
 */
async function verifyIdTokenWithPublicKey(token) {
  const projectId = process.env.FIREBASE_PROJECT_ID || "mentora-c6dca";

  if (!token || token.split(".").length !== 3) return null;

  const now = Date.now();
  if (!_firebaseKeysCache || now - _firebaseKeysCachedAt > 3600e3) {
    const resp = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
      { headers: { "Cache-Control": "max-age=3600" } }
    );
    if (!resp.ok) {
      throw new Error(`Failed to fetch Firebase signing keys (${resp.status})`);
    }
    _firebaseKeysCache = await resp.json();
    _firebaseKeysCachedAt = now;
  }

  const [h, p, s] = token.split(".");
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || header.kid === undefined) return null;
  const key = _firebaseKeysCache[header.kid];
  if (!key) return null;

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${h}.${p}`);
  try {
    if (!verifier.verify(key, Buffer.from(s, "base64url"))) return null;
  } catch {
    return null;
  }

  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
  if (!payload.sub) return null;

  return { uid: payload.sub, email: payload.email || null };
}

/**
 * Verifies a Firebase ID token; returns decoded claims ({ uid, email, ... })
 * or null. Prefers the Admin SDK (needs a service account) and transparently
 * falls back to public-key JWT verification, so authentication still works
 * when the service account env var is missing or misconfigured.
 */
async function verifyIdToken(token) {
  if (!token) return null;

  try {
    const decoded = await adminSdk().auth().verifyIdToken(token);
    return decoded;
  } catch (adminErr) {
    // Admin SDK path failed (missing service account, bad env, transient).
    // Only log the config-class failures; a plain invalid token is expected
    // traffic and should not spam the logs.
    const msg = String((adminErr && adminErr.message) || adminErr);
    if (/not configured|FIREBASE_SERVICE_ACCOUNT|Service account|invalid credential/i.test(msg)) {
      console.error("[verifyIdToken] Admin SDK unavailable, using public-key verification:", msg);
    }
  }

  try {
    return await verifyIdTokenWithPublicKey(token);
  } catch (pubErr) {
    console.error("[verifyIdToken] public-key verification failed:", pubErr && pubErr.message ? pubErr.message : pubErr);
    return null;
  }
}

/**
 * Admin gate for /api/admin/* and /api/marketing/* endpoints.
 * Reads `Authorization: Bearer <Firebase ID token>`, verifies it server-side,
 * then checks BOTH custom claims and the email allowlist (belt & suspenders —
 * claims may lag the first login). On success returns { uid, email, isAdmin }.
 * On failure writes a 401/403 JSON response and returns null.
 */
async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }
  const email = decoded.email ? decoded.email.toLowerCase() : "";
  const claimAdmin = decoded.admin === true;
  const allowlisted = isAdminEmail(decoded.email || email);
  if (allowlisted) {
    // Hand out the claim once so future reads/writes can rely on it too.
    try {
      await adminSdk().auth().setCustomUserClaims(decoded.uid, { admin: true });
    } catch (_) {
      /* non-fatal: allowlist still passes */
    }
  }
  if (!claimAdmin && !allowlisted) {
    res.status(403).json({ error: "Forbidden. Admin access required." });
    return null;
  }
  return { uid: decoded.uid, email: email || decoded.email, isAdmin: true };
}

/**
 * Gate for scheduled Vercel crons (Path-based). Verifies the
 * `x-vercel-cron` header Vercel injects AND an optional shared secret
 * (CRON_SECRET). Returns true when authenticated.
 */
function requireCron(req, res) {
  const viaVercel = req.headers["x-vercel-cron"] === "1";
  const secret = process.env.CRON_SECRET;
  const viaSecret = secret && req.headers["x-cron-secret"] === secret;
  if (!viaVercel && !viaSecret) {
    res.status(403).json({ error: "Forbidden." });
    return false;
  }
  return true;
}

/** Paginates a Firestore query stream into a plain array (reads ≤ limit). */
async function streamDocs(query, limit = 20000) {
  const out = [];
  let snap = await query.limit(500).get();
  while (!snap.empty && out.length < limit) {
    for (const d of snap.docs) out.push(d);
    if (snap.size < 500) break;
    const last = snap.docs[snap.docs.length - 1];
    snap = await query.startAfter(last).limit(500).get();
  }
  return out;
}

const MIN_SAMPLE = 10;

/* ─────────────────────────────────────────────────────────────
   Server-authoritative daily usage gate for /api/groq-proxy.
   Usage counters live in Firestore but are only writable via the
   Admin SDK (see firestore.rules: usage is read-only for clients),
   so free-plan limits cannot be reset from the browser.
   ───────────────────────────────────────────────────────────── */

const SERVER_PLAN_LIMITS = {
  free: { chatLimit: 20 },
  pro: { chatLimit: Infinity },
};

function normalizePlanServer(raw) {
  const p = String(raw || "").trim().toLowerCase();
  if (p === "pro" || p === "premium" || p === "paid" || p === "unlimited" || p === "lifetime") return "pro";
  return "free";
}

function isProUserDataServer(data) {
  if (!data) return false;
  if (normalizePlanServer(data.plan) === "pro") return true;
  if (data.isPro === true || data.pro === true || data.isPremium === true) return true;
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") return true;
  const proDays = Number(data.referralRewards?.proDays) || 0;
  const proExpiresAt = data.referralRewards?.proExpiresAt || data.proExpiresAt || data.subscriptionExpiresAt || data.proUntil;
  if (proDays > 0) {
    if (!proExpiresAt) return true;
    const exp = new Date(proExpiresAt);
    if (!isNaN(exp.getTime()) && exp.getTime() > Date.now()) return true;
  }
  if (proExpiresAt) {
    const exp = new Date(proExpiresAt);
    if (!isNaN(exp.getTime()) && exp.getTime() > Date.now()) return true;
  }
  // Admin emails are always pro on server (belt & suspenders)
  if (data.email && isAdminEmail(data.email)) return true;
  return false;
}

function serverTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Checks the user's daily chat limit and increments the counter — all
 * server-side. Returns { allowed:true, plan, used, limit, remaining } on
 * success, or { allowed:false, status:429, error, plan, used, limit } when
 * the free-plan limit has been reached.
 */
async function checkAndIncrementChat(uid) {
  const db = firestore();
  const [userSnap, usageSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`usage/${uid}`).get(),
  ]);

  const userData = userSnap.exists ? userSnap.data() : {};
  const plan = isProUserDataServer(userData) ? "pro" : "free";
  const limits = SERVER_PLAN_LIMITS[plan] || SERVER_PLAN_LIMITS.free;

  const today = serverTodayStr();
  let usage = usageSnap.exists ? usageSnap.data() : {};
  if (!usage || usage.date !== today) {
    usage = { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  }
  const used = Number(usage.dailyChatCount) || 0;

  const bonusChats = Number(userData?.referralRewards?.bonusChats) || 0;
  const limit = limits.chatLimit === Infinity ? Infinity : limits.chatLimit + bonusChats;

  if (limit !== Infinity && used >= limit) {
    return {
      allowed: false,
      status: 429,
      plan,
      used,
      limit,
      error: `Daily chat limit reached (${limit}). Upgrade to Aquila Pro for unlimited access.`,
    };
  }

  await db
    .doc(`usage/${uid}`)
    .set(
      {
        ...usage,
        date: today,
        dailyChatCount: used + 1,
        dailyAnalysisCount: Number(usage.dailyAnalysisCount) || 0,
        plannerUsageMinutes: Number(usage.plannerUsageMinutes) || 0,
      },
      { merge: false }
    );

  return {
    allowed: true,
    plan,
    used,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - (used + 1)),
  };
}

module.exports = {
  adminSdk,
  firestore,
  verifyIdToken,
  requireAdmin,
  requireCron,
  isAdminEmail,
  adminEmails,
  streamDocs,
  MIN_SAMPLE,
  checkAndIncrementChat,
};