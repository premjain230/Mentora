// ─────────────────────────────────────────────────────────────
// Learning Allied Growth Agent — shared admin/auth server helpers.
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

  return {
    uid: payload.sub,
    email: payload.email || null,
    email_verified: payload.email_verified === true,
  };
}

const REVOCATION_ERROR_CODES = new Set([
  "auth/id-token-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

/**
 * True when the Admin SDK rejected a token because its refresh tokens were
 * revoked or the account was disabled/deleted. The public-key fallback cannot
 * observe revocation, so these detections must never fall through to it.
 */
function isRevocationError(err) {
  const code = String(
    (err && err.code) || (err && err.errorInfo && err.errorInfo.code) || ""
  ).trim().toLowerCase();
  return REVOCATION_ERROR_CODES.has(code);
}

/**
 * Verifies a Firebase ID token; returns decoded claims ({ uid, email, ... })
 * or null. Prefers the Admin SDK (needs a service account) and transparently
 * falls back to public-key JWT verification, so authentication still works
 * when the service account env var is missing or misconfigured.
 *
 * checkRevoked=true makes the Admin SDK compare the token's auth_time against
 * the user's tokensValidAfterTime, so a revoked session (or a token carrying a
 * stale Pro claim) is rejected immediately instead of lasting until expiry.
 */
async function verifyIdToken(token) {
  if (!token) return null;

  try {
    const decoded = await adminSdk().auth().verifyIdToken(token, true);
    return decoded;
  } catch (adminErr) {
    if (isRevocationError(adminErr)) {
      // Do not fall back: signature verification cannot see revocations.
      return null;
    }
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
  const allowlisted = decoded.email_verified === true && isAdminEmail(decoded.email || email);
  if (allowlisted) {
    // Hand out the claim once so future reads/writes can rely on it too.
    // Merge existing custom claims so a Pro grant is not overwritten.
    try {
      const record = await adminSdk().auth().getUser(decoded.uid);
      await adminSdk()
        .auth()
        .setCustomUserClaims(decoded.uid, { ...(record.customClaims || {}), admin: true });
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

const MAX_REFERRAL_BONUS_CHATS = 500;
const MAX_REFERRAL_PRO_DAYS = 3650;

/** Normalizes Firestore Timestamp / ISO string / seconds / ms to epoch ms. */
function toMillis(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }
  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function expiryIsFuture(value) {
  const ms = toMillis(value);
  return ms != null && ms > Date.now();
}

function expiryIsPast(value) {
  const ms = toMillis(value);
  return ms != null && ms <= Date.now();
}

/**
 * Admin identity comes ONLY from verified token claims / the server-controlled
 * ADMIN_EMAILS env list. Firestore fields such as users/{uid}.role or isAdmin
 * are never consulted, even though clients can no longer write them.
 */
function isAdminClaims(decoded) {
  if (!decoded) return false;
  return decoded.admin === true
    || decoded.role === "admin"
    || (decoded.email_verified === true && isAdminEmail(decoded.email));
}

/** Pro from verified custom claims. Expiry claims are validated server-side. */
function isProClaims(decoded) {
  if (!decoded || decoded.pro !== true) return false;
  const expiry = decoded.proExpiresAt || decoded.proUntil || decoded.subscriptionExpiresAt;
  return expiry ? expiryIsFuture(expiry) : true;
}

/**
 * Pro from an entitlement record. Callers must only pass data from a
 * server-owned source (entitlements/{uid} or a hardened users/{uid}).
 * Expiry is always evaluated at request time.
 */
function entitlementDataIsPro(data) {
  if (!data) return false;

  const proExpiresAt =
    data.subscriptionExpiresAt ||
    data.proExpiresAt ||
    data.proUntil ||
    data.referralRewards?.proExpiresAt;
  if (expiryIsPast(proExpiresAt)) return false;

  if (normalizePlanServer(data.plan) === "pro") return true;
  if (normalizePlanServer(data.tier) === "pro" || normalizePlanServer(data.subscriptionTier) === "pro") return true;
  if (data.isPro === true || data.pro === true || data.isPremium === true) return true;
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") return true;
  if (data.subscription?.status === "active" || normalizePlanServer(data.subscription?.plan) === "pro") return true;

  // Referral Pro days only count with an explicit, still-valid expiry.
  const proDays = Number(data.referralRewards?.proDays) || 0;
  if (proDays > 0 && proDays <= MAX_REFERRAL_PRO_DAYS && expiryIsFuture(proExpiresAt)) {
    return true;
  }

  return expiryIsFuture(proExpiresAt);
}

/** Bonus free-plan chats from referral rewards, clamped to a sane range. */
function referralBonusChats(data) {
  const raw = Number(data?.referralRewards?.bonusChats);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(Math.min(raw, MAX_REFERRAL_BONUS_CHATS));
}

/**
 * Pure entitlement resolution (no I/O) so it can be unit-tested.
 *
 * Precedence:
 *   1. verified custom claims (admin / Pro)
 *   2. server-owned entitlements/{uid} — authoritative when present
 *   3. hardened users/{uid} legacy fields
 *
 * Client-writable user fields were the previous trust boundary; the rules now
 * make placement in these sources meaningful. An existing entitlement record
 * suppresses the legacy user doc so a revocation cannot be undone by stale data.
 */
function resolveEntitlement({ claims, entitlementData, entitlementExists, userData } = {}) {
  const entitlement = entitlementExists ? entitlementData || {} : null;
  const bonusSource = entitlement || userData;

  if (isAdminClaims(claims)) {
    return { plan: "pro", source: "claims-admin", isAdmin: true, bonusChats: referralBonusChats(bonusSource) };
  }
  if (isProClaims(claims)) {
    return { plan: "pro", source: "claims-pro", isAdmin: false, bonusChats: referralBonusChats(bonusSource) };
  }
  if (entitlementExists) {
    return {
      plan: entitlementDataIsPro(entitlement) ? "pro" : "free",
      source: "entitlement",
      isAdmin: false,
      bonusChats: referralBonusChats(entitlement),
    };
  }
  return {
    plan: entitlementDataIsPro(userData) ? "pro" : "free",
    source: userData ? "user-doc" : "default",
    isAdmin: false,
    bonusChats: referralBonusChats(userData),
  };
}

/** Reads the server-owned sources and resolves the verified entitlement. */
async function getVerifiedEntitlement(uid, decoded) {
  const db = firestore();
  const [entitlementSnap, userSnap] = await Promise.all([
    db.doc(`entitlements/${uid}`).get(),
    db.doc(`users/${uid}`).get(),
  ]);

  return resolveEntitlement({
    claims: decoded,
    entitlementData: entitlementSnap.exists ? entitlementSnap.data() : null,
    entitlementExists: entitlementSnap.exists,
    userData: userSnap.exists ? userSnap.data() : null,
  });
}

/** Backwards-compatible pure helper (entitlement-shaped data only). */
function isProUserDataServer(data) {
  return entitlementDataIsPro(data);
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
async function checkAndIncrementChat(uid, decoded) {
  const entitlement = await getVerifiedEntitlement(uid, decoded);
  const plan = entitlement.plan === "pro" ? "pro" : "free";
  const limits = SERVER_PLAN_LIMITS[plan] || SERVER_PLAN_LIMITS.free;
  const limit = limits.chatLimit === Infinity ? Infinity : limits.chatLimit + entitlement.bonusChats;

  const db = firestore();
  const usageRef = db.doc(`usage/${uid}`);
  const today = serverTodayStr();

  let previousUsed = 0;
  let allowed = true;

  // Transaction prevents parallel requests from reading the same count and
  // each writing count+1 (which would let a free user exceed the daily limit).
  await db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    let usage = usageSnap.exists ? usageSnap.data() : {};
    if (!usage || usage.date !== today) {
      usage = { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
    }
    previousUsed = Number(usage.dailyChatCount) || 0;

    if (limit !== Infinity && previousUsed >= limit) {
      allowed = false;
      return;
    }

    tx.set(
      usageRef,
      {
        date: today,
        dailyChatCount: previousUsed + 1,
        dailyAnalysisCount: Number(usage.dailyAnalysisCount) || 0,
        plannerUsageMinutes: Number(usage.plannerUsageMinutes) || 0,
      },
      { merge: false }
    );
  });

  if (!allowed) {
    return {
      allowed: false,
      status: 429,
      plan,
      used: previousUsed,
      limit,
      error: `Daily chat limit reached (${limit}). Upgrade to Learning Allied Pro for unlimited access.`,
    };
  }

  return {
    allowed: true,
    plan,
    used: previousUsed,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - (previousUsed + 1)),
  };
}

module.exports = {
  adminSdk,
  firestore,
  verifyIdToken,
  isRevocationError,
  requireAdmin,
  requireCron,
  isAdminEmail,
  adminEmails,
  streamDocs,
  MIN_SAMPLE,
  checkAndIncrementChat,
  getVerifiedEntitlement,
  resolveEntitlement,
  entitlementDataIsPro,
  isProUserDataServer,
  isAdminClaims,
  isProClaims,
  referralBonusChats,
  toMillis,
  MAX_REFERRAL_BONUS_CHATS,
};