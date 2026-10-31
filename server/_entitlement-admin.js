"use strict";

/**
 * Pure helpers for the admin entitlement grant/revoke endpoint. No I/O here so
 * the rules can be unit tested without Firebase credentials.
 */

const DAY_MS = 86400000;
const MAX_GRANT_DAYS = 3650;
const MAX_REASON_LENGTH = 500;
const UID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const PRO_CLAIM_KEYS = ["pro", "proExpiresAt", "proUntil", "subscriptionExpiresAt"];

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function toMillis(value) {
  if (value == null) return null;
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function validateTargetUid(value) {
  const uid = typeof value === "string" ? value.trim() : "";
  if (!uid) throw httpError(400, "uid is required.");
  if (!UID_PATTERN.test(uid)) throw httpError(400, "uid contains invalid characters.");
  return uid;
}

function validateGrantExpiry(value, now = Date.now()) {
  if (value == null || value === "") {
    throw httpError(400, "expiresAt is required for a Pro grant.");
  }
  const ms = toMillis(value);
  if (ms == null) throw httpError(400, "expiresAt is not a valid date.");
  if (ms <= now) throw httpError(400, "expiresAt must be in the future.");
  if (ms > now + MAX_GRANT_DAYS * DAY_MS) {
    throw httpError(400, `expiresAt cannot be more than ${MAX_GRANT_DAYS} days away.`);
  }
  return ms;
}

function clampBonusChats(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(500, Math.max(0, Math.floor(n)));
}

/**
 * Explicit value wins; otherwise preserve the existing entitlement's bonus
 * chats, then the legacy user document's (clamped). Prevents a grant from
 * silently dropping referral bonuses that the resolver reads from the
 * entitlement once one exists.
 */
function resolveBonusChats({ explicit = null, entitlementData = null, userData = null } = {}) {
  let raw = explicit;
  if (raw == null) raw = entitlementData?.referralRewards?.bonusChats;
  if (raw == null) raw = userData?.referralRewards?.bonusChats;
  return clampBonusChats(raw);
}

function validateReason(value, { required = false, fallback = "" } = {}) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (!reason) {
    if (required) throw httpError(400, "reason is required for a revocation.");
    return fallback;
  }
  if (reason.length > MAX_REASON_LENGTH) {
    throw httpError(400, `reason cannot exceed ${MAX_REASON_LENGTH} characters.`);
  }
  return reason;
}

/** Removes every claim that can grant Pro; keeps admin and unrelated claims. */
function stripProClaims(claims) {
  if (!claims || typeof claims !== "object") {
    return { claims: {}, removed: [], changed: false };
  }
  const next = { ...claims };
  const removed = [];
  for (const key of PRO_CLAIM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      delete next[key];
      removed.push(key);
    }
  }
  return { claims: next, removed, changed: removed.length > 0 };
}

module.exports = {
  DAY_MS,
  MAX_GRANT_DAYS,
  MAX_REASON_LENGTH,
  toMillis,
  validateTargetUid,
  validateGrantExpiry,
  clampBonusChats,
  resolveBonusChats,
  validateReason,
  stripProClaims,
};
