"use strict";

/**
 * Admin-only entitlement grant/revoke endpoint.
 *
 *   POST /api/admin/entitlements
 *   Authorization: Bearer <Firebase ID token>
 *   { "action": "grant",  "uid": "...", "expiresAt": "2027-01-01T00:00:00Z",
 *     "reason": "...", "referralBonusChats": 0 }
 *   { "action": "revoke", "uid": "...", "reason": "..." }
 *
 * Grants write the server-owned entitlements/{uid} record. Revocations write a
 * tombstone (never delete) and clear Pro custom claims, because claims outrank
 * the entitlement record in the resolver. Every action is logged to the
 * server-only entitlementAudit collection (Firestore rules default-deny reads
 * and writes for clients).
 */

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { requireAdmin, adminSdk, firestore } = require("./_admin");
const {
  toMillis,
  validateTargetUid,
  validateGrantExpiry,
  resolveBonusChats,
  validateReason,
  stripProClaims,
} = require("./_entitlement-admin");

const AUDIT_COLLECTION = "entitlementAudit";

function serverTs() {
  return adminSdk().firestore.FieldValue.serverTimestamp();
}

function timestampFromMs(ms) {
  return adminSdk().firestore.Timestamp.fromMillis(ms);
}

function summarizeEntitlement(data) {
  if (!data) return { exists: false, plan: null, status: null, expiry: null };
  const ms = toMillis(data.proExpiresAt ?? data.subscriptionExpiresAt ?? data.proUntil);
  return {
    exists: true,
    plan: data.plan || null,
    status: data.status || null,
    expiry: ms == null ? null : new Date(ms).toISOString(),
  };
}

function safeErrorCode(err) {
  const raw = err && err.code;
  const value = typeof raw === "number" ? String(raw) : String(raw || "");
  return /^[a-z0-9-]{1,40}$/i.test(value) ? value.toLowerCase() : "unknown";
}

async function grantPro({ db, admin, uid, expiresAtMs, reason, explicitBonus }) {
  const entRef = db.doc(`entitlements/${uid}`);
  const userRef = db.doc(`users/${uid}`);
  let bonusChats = 0;

  await db.runTransaction(async (tx) => {
    const [entSnap, userSnap] = await Promise.all([tx.get(entRef), tx.get(userRef)]);
    const before = summarizeEntitlement(entSnap.exists ? entSnap.data() : null);
    bonusChats = resolveBonusChats({
      explicit: explicitBonus,
      entitlementData: entSnap.exists ? entSnap.data() : null,
      userData: userSnap.exists ? userSnap.data() : null,
    });

    const payload = {
      plan: "pro",
      status: "active",
      proExpiresAt: timestampFromMs(expiresAtMs),
      source: "admin",
      version: 2,
      grantedBy: admin.uid,
      grantedAt: serverTs(),
      reason,
    };
    if (bonusChats > 0) payload.referralRewards = { bonusChats };

    tx.set(entRef, payload);
    tx.set(db.collection(AUDIT_COLLECTION).doc(), {
      action: "grant",
      targetUid: uid,
      actorUid: admin.uid,
      before,
      after: {
        exists: true,
        plan: "pro",
        status: "active",
        expiry: new Date(expiresAtMs).toISOString(),
      },
      referralBonusChats: bonusChats,
      reason,
      at: serverTs(),
    });
  });

  return { bonusChats };
}

async function revokePro({ db, admin, uid, reason }) {
  const entRef = db.doc(`entitlements/${uid}`);
  const userRef = db.doc(`users/${uid}`);
  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  let bonusChats = 0;

  await db.runTransaction(async (tx) => {
    const [entSnap, userSnap] = await Promise.all([tx.get(entRef), tx.get(userRef)]);
    const existing = entSnap.exists ? entSnap.data() : null;
    const before = summarizeEntitlement(existing);
    bonusChats = resolveBonusChats({
      entitlementData: existing,
      userData: userSnap.exists ? userSnap.data() : null,
    });

    const payload = {
      plan: "free",
      status: "revoked",
      proExpiresAt: null,
      proUntil: null,
      subscriptionExpiresAt: null,
      source: "admin",
      version: 2,
      revokedBy: admin.uid,
      revokedAt: serverTs(),
      reason,
    };
    if (bonusChats > 0) payload.referralRewards = { bonusChats };

    tx.set(entRef, payload);
    tx.set(auditRef, {
      action: "revoke",
      targetUid: uid,
      actorUid: admin.uid,
      before,
      after: { exists: true, plan: "free", status: "revoked", expiry: null },
      referralBonusChats: bonusChats,
      reason,
      claimsUpdated: false,
      claimError: null,
      sessionsRevoked: false,
      sessionError: null,
      at: serverTs(),
    });
  });

  let claimsUpdated = false;
  let claimError = null;
  try {
    const record = await adminSdk().auth().getUser(uid);
    const stripped = stripProClaims(record.customClaims);
    if (stripped.changed) {
      await adminSdk().auth().setCustomUserClaims(uid, stripped.claims);
      claimsUpdated = true;
    }
  } catch (err) {
    if (err && err.code !== "auth/user-not-found") claimError = safeErrorCode(err);
  }

  // Invalidates every outstanding refresh token, so the next ID-token refresh
  // drops the Pro claim. verifyIdToken(checkRevoked) then rejects ID tokens
  // issued before this moment instead of honouring them for up to an hour.
  let sessionsRevoked = false;
  let sessionError = null;
  try {
    await adminSdk().auth().revokeRefreshTokens(uid);
    sessionsRevoked = true;
  } catch (err) {
    if (err && err.code !== "auth/user-not-found") sessionError = safeErrorCode(err);
  }

  try {
    await auditRef.set(
      { claimsUpdated, claimError, sessionsRevoked, sessionError },
      { merge: true }
    );
  } catch (err) {
    console.error("[admin-entitlements] audit update failed:", safeErrorCode(err));
  }

  return { bonusChats, claimsUpdated, claimError, sessionsRevoked, sessionError };
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST"])) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!rateLimit(req, res, { name: "admin-entitlements", limit: 20 })) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = firestore();
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(req, res, err, "Invalid request body.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  if (action !== "grant" && action !== "revoke") {
    return res.status(400).json({ error: "action must be 'grant' or 'revoke'." });
  }

  try {
    const uid = validateTargetUid(body.uid);

    if (action === "grant") {
      const expiresAtMs = validateGrantExpiry(body.expiresAt);
      const reason = validateReason(body.reason, { fallback: "Admin grant" });
      let explicitBonus = null;
      if (body.referralBonusChats != null && body.referralBonusChats !== "") {
        const n = Number(body.referralBonusChats);
        if (!Number.isFinite(n)) {
          return res.status(400).json({ error: "referralBonusChats must be a number." });
        }
        explicitBonus = n;
      }

      try {
        await adminSdk().auth().getUser(uid);
      } catch (err) {
        if (err && err.code === "auth/user-not-found") {
          return res.status(404).json({ error: "Target user does not exist." });
        }
        throw err;
      }

      const { bonusChats } = await grantPro({
        db,
        admin,
        uid,
        expiresAtMs,
        reason,
        explicitBonus,
      });
      return res.status(200).json({
        ok: true,
        action: "grant",
        plan: "pro",
        proExpiresAt: new Date(expiresAtMs).toISOString(),
        referralBonusChats: bonusChats,
      });
    }

    const reason = validateReason(body.reason, { required: true });
    const { bonusChats, claimsUpdated, claimError, sessionsRevoked, sessionError } =
      await revokePro({ db, admin, uid, reason });
    if (claimError || sessionError) {
      return res.status(500).json({
        error: claimError
          ? "Entitlement revoked, but Pro claims could not be cleared. Retry the revoke."
          : "Entitlement revoked, but active sessions could not be revoked. Retry the revoke.",
        retryable: true,
        claimsCleared: !claimError,
        sessionsRevoked,
      });
    }
    return res.status(200).json({
      ok: true,
      action: "revoke",
      plan: "free",
      claimsCleared: true,
      claimsUpdated,
      sessionsRevoked,
      referralBonusChats: bonusChats,
    });
  } catch (err) {
    if (err && err.statusCode && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return sendError(req, res, err, "Could not update entitlement.");
  }
};
