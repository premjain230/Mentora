"use strict";

/**
 * Read-only entitlement classification shared by the audit and migration
 * scripts. Uses the exact server resolver (server/_admin.js) so the audit can
 * never disagree with what the API enforces.
 *
 * This module performs no I/O. The only writes in the entire scripts/ tree
 * happen in migrate-entitlements.js behind --apply.
 */

const crypto = require("crypto");
const {
  entitlementDataIsPro,
  isProClaims,
  isAdminClaims,
  isAdminEmail,
  toMillis,
} = require("../../server/_admin.js");

const DAY_MS = 86400000;
const EXPIRY_SOURCES = [
  ["subscriptionExpiresAt", "user-subscription-expires-at"],
  ["proExpiresAt", "user-pro-expires-at"],
  ["proUntil", "user-pro-until"],
];

function normalizePlan(raw) {
  return String(raw || "").trim().toLowerCase();
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function claimsFromAuthUser(authUser, uid) {
  if (!authUser) return null;
  return {
    ...(authUser.customClaims || {}),
    uid,
    email: authUser.email || null,
    email_verified: authUser.emailVerified === true,
  };
}

function expiryFromData(data) {
  if (!isObject(data)) return null;
  let latest = null;
  for (const [field] of EXPIRY_SOURCES) {
    const ms = toMillis(data[field]);
    if (ms != null && (latest == null || ms > latest)) latest = ms;
  }
  const referralExpiry = toMillis(data.referralRewards?.proExpiresAt);
  if (referralExpiry != null && (latest == null || referralExpiry > latest)) latest = referralExpiry;
  return latest;
}

function expiryFromClaims(claims) {
  if (!isObject(claims)) return null;
  let latest = null;
  for (const field of ["proExpiresAt", "proUntil", "subscriptionExpiresAt"]) {
    const ms = toMillis(claims[field]);
    if (ms != null && (latest == null || ms > latest)) latest = ms;
  }
  return latest;
}

/** Raw (expiry-agnostic) signals from a legacy user document. */
function userDocSignals(data) {
  if (!isObject(data)) {
    return {
      exists: false,
      planPro: false,
      tierPro: false,
      subscriptionTierPro: false,
      flagPro: false,
      activeStatus: false,
      subscriptionObject: false,
      subscriptionIdPresent: false,
      referralProDays: 0,
      referralBonusChats: 0,
      legacyAdminFields: false,
      hasReferralRewards: false,
      expiryMs: null,
      proLike: false,
      plan: null,
      tier: null,
      subscriptionStatus: null,
    };
  }

  const plan = normalizePlan(data.plan);
  const tier = normalizePlan(data.tier);
  const subscriptionTier = normalizePlan(data.subscriptionTier);
  const subscriptionStatus = normalizePlan(data.subscriptionStatus);
  const subscriptionObject = isObject(data.subscription);
  const subscriptionIdPresent = subscriptionObject
    && typeof data.subscription.id === "string"
    && data.subscription.id.trim().length > 0;
  const activeStatus = subscriptionStatus === "active"
    || subscriptionStatus === "pro"
    || (!subscriptionStatus && subscriptionObject && normalizePlan(data.subscription.status) === "active");
  const flagPro = data.isPro === true || data.pro === true || data.isPremium === true;
  const planPro = plan === "pro";
  const tierPro = tier === "pro" || subscriptionTier === "pro";
  const expiryMs = expiryFromData(data);
  const referralProDays = Number(data.referralRewards?.proDays) || 0;
  const referralBonusChats = Number(data.referralRewards?.bonusChats) || 0;
  const legacyAdminFields = data.isAdmin === true
    || data.admin === true
    || normalizePlan(data.role) === "admin";
  const hasReferralRewards = isObject(data.referralRewards);

  return {
    exists: true,
    planPro,
    tierPro,
    flagPro,
    activeStatus,
    subscriptionObject,
    subscriptionIdPresent,
    referralProDays,
    referralBonusChats,
    legacyAdminFields,
    hasReferralRewards,
    expiryMs,
    proLike: planPro || tierPro || flagPro || activeStatus || subscriptionObject || referralProDays > 0,
    plan: plan || null,
    tier: tier || null,
    subscriptionStatus: subscriptionStatus || null,
  };
}

function adminSources(claims) {
  if (!isObject(claims)) return [];
  const sources = [];
  if (claims.admin === true) sources.push("claims-admin");
  if (normalizePlan(claims.role) === "admin") sources.push("claims-role");
  if (claims.email_verified === true && isAdminEmail(claims.email)) sources.push("allowlisted-verified-email");
  else if (claims.email && isAdminEmail(claims.email)) sources.push("allowlisted-email-unverified-ignored");
  return sources;
}

function collectExpiries({ claims, entitlementData, userData }) {
  const out = [];
  const push = (source, value) => {
    const ms = toMillis(value);
    if (ms != null) out.push({ source, ms });
  };

  if (isObject(claims)) {
    push("claims.proExpiresAt", claims.proExpiresAt);
    push("claims.proUntil", claims.proUntil);
    push("claims.subscriptionExpiresAt", claims.subscriptionExpiresAt);
  }
  if (isObject(entitlementData)) {
    for (const [field] of EXPIRY_SOURCES) push(`entitlement.${field}`, entitlementData[field]);
    push("entitlement.referralExpiresAt", entitlementData.referralRewards?.proExpiresAt);
  }
  if (isObject(userData)) {
    for (const [field, label] of EXPIRY_SOURCES) push(label, userData[field]);
    push("user-referral-expires-at", userData.referralRewards?.proExpiresAt);
  }
  return out;
}

function distinctDays(expiries) {
  return [...new Set(expiries.map((entry) => new Date(entry.ms).toISOString().slice(0, 10)))];
}

function aliasFor(uid, salt) {
  if (!salt) throw new Error("AUDIT_SALT is required to anonymize user ids.");
  return `u_${crypto.createHmac("sha256", String(salt)).update(String(uid)).digest("hex").slice(0, 10)}`;
}

/**
 * Pure classification. Inputs are raw documents (or null). Returns everything
 * the report needs; no email or name is ever retained.
 */
function classifyAccount({ uid, authUser, userData, entitlementData, entitlementExists, salt, now = Date.now(), authKnown = true }) {
  const claims = claimsFromAuthUser(authUser, uid);
  const signals = userDocSignals(userData);
  const entExists = Boolean(entitlementExists);
  const entData = entExists ? entitlementData || {} : null;

  const claimsPro = isProClaims(claims);
  const rawClaimsPro = isObject(claims) && claims.pro === true;
  const entPro = entExists ? entitlementDataIsPro(entData) : false;
  const userPro = entitlementDataIsPro(userData);
  const admins = adminSources(claims);
  const isAdmin = isAdminClaims(claims);

  const expiries = collectExpiries({ claims, entitlementData: entData, userData });
  const primaryExpiryMs = expiries.length ? Math.max(...expiries.map((entry) => entry.ms)) : null;
  const futureExpiry = primaryExpiryMs != null && primaryExpiryMs > now;
  const pastExpiry = primaryExpiryMs != null && primaryExpiryMs <= now;
  const hasSubscriptionEvidence = signals.subscriptionObject || signals.activeStatus;
  const claimsExpiryMs = expiryFromClaims(claims);
  const entExpiryMs = expiryFromData(entData);

  const conflicts = [];
  if (rawClaimsPro && !claimsPro) conflicts.push("claims-pro-expired");
  if (entExists && !entPro && (claimsPro || userPro || signals.proLike)) {
    conflicts.push("entitlement-inactive-but-other-source-pro");
  }
  if (signals.activeStatus && signals.expiryMs != null && signals.expiryMs <= now) {
    conflicts.push("active-status-but-expired");
  }
  if (signals.planPro && signals.tier && !signals.tierPro) {
    conflicts.push("plan-tier-mismatch");
  }
  if (distinctDays(expiries).length > 1) conflicts.push("multiple-expiry-values");
  if (claimsPro && entPro && claimsExpiryMs != null && entExpiryMs != null
      && new Date(claimsExpiryMs).toISOString().slice(0, 10) !== new Date(entExpiryMs).toISOString().slice(0, 10)) {
    conflicts.push("claims-entitlement-expiry-mismatch");
  }

  const suspicious = [];
  if (authKnown && !authUser) suspicious.push("no-auth-record");
  if (signals.legacyAdminFields) suspicious.push("user-doc-admin-fields");
  if (signals.hasReferralRewards) suspicious.push("user-doc-referral-rewards");
  if (signals.referralProDays > 0 && !futureExpiry) suspicious.push("referral-pro-days-without-future-expiry");
  if (signals.proLike && !futureExpiry && !hasSubscriptionEvidence) suspicious.push("pro-flag-without-future-expiry");

  let category;
  if (isAdmin) category = "admin";
  else if (claimsPro) category = "pro-claims";
  else if (entPro) category = "pro-entitlement";
  else if (userPro) {
    category = futureExpiry && hasSubscriptionEvidence ? "pro-userdoc-corroborated" : "pro-userdoc-unverified";
  } else if (signals.proLike) {
    category = pastExpiry ? "pro-expired" : "pro-userdoc-unverified";
  } else if (rawClaimsPro || (claims && claims.pro === true)) {
    category = "pro-expired";
  } else {
    category = "free";
  }
  if (category === "pro-expired" && !pastExpiry && !(rawClaimsPro && !claimsPro)) {
    // pro-like fields but no parsable expiry: not "expired", just unverified.
    category = "pro-userdoc-unverified";
  }

  const proLike = claimsPro || entPro || userPro || signals.proLike || rawClaimsPro;
  const migrationEligibleRaw = Boolean(
    !isAdmin
    && authUser
    && !entExists
    && futureExpiry
    && conflicts.length === 0
    && (claimsPro || category === "pro-userdoc-corroborated")
  );
  // Suspicious evidence (legacy admin fields, referral rewards, flag-only,
  // missing auth) never qualifies for automatic migration. An operator can
  // still review a single account explicitly with --allow-suspicious.
  const migrationBlockedBy = migrationEligibleRaw ? suspicious.slice() : [];
  const migrationEligible = migrationEligibleRaw && migrationBlockedBy.length === 0;

  let recommendedAction;
  if (isAdmin) recommendedAction = "keep-admin-claims";
  else if (category === "pro-entitlement") recommendedAction = "keep";
  else if (category === "pro-claims") {
    recommendedAction = migrationEligible
      ? "create-entitlement"
      : migrationEligibleRaw ? "review-suspicious" : "keep-claims";
  } else if (category === "pro-userdoc-corroborated") {
    recommendedAction = migrationEligible
      ? "create-entitlement"
      : migrationEligibleRaw ? "review-suspicious" : "review-conflict";
  } else if (category === "pro-userdoc-unverified") recommendedAction = "review";
  else if (category === "pro-expired") recommendedAction = "expire-or-extend";
  else if (conflicts.length) recommendedAction = "review-conflict";
  else recommendedAction = "none";

  return {
    uid,
    alias: aliasFor(uid, salt),
    authUser,
    category,
    recommendedAction,
    isAdmin,
    adminSources: admins,
    migrationEligible,
    migrationEligibleRaw,
    migrationBlockedBy,
    migrateExpiryMs: migrationEligible ? primaryExpiryMs : null,
    proLike,
    claimsPro,
    entitlementPro: entPro,
    userDocPro: userPro,
    entitlementExists: entExists,
    hasSubscriptionEvidence,
    hasLifetimeClaims: Boolean(claimsPro && claimsExpiryMs == null),
    primaryExpiryMs,
    futureExpiry,
    pastExpiry,
    conflicts,
    suspicious,
    expiries,
    signals,
  };
}

function expiryBucket(result, now = Date.now()) {
  if (result.hasLifetimeClaims) return "lifetime-claims";
  if (result.primaryExpiryMs == null) return "none";
  if (result.primaryExpiryMs <= now) return "expired";
  if (result.primaryExpiryMs <= now + 30 * DAY_MS) return "next-30-days";
  return "later";
}

function summarize(results, now = Date.now()) {
  const byCategory = {};
  const byAction = {};
  const conflicts = {};
  const suspicious = {};
  const expiry = { none: 0, expired: 0, "next-30-days": 0, later: 0, "lifetime-claims": 0 };
  let admins = 0;
  let expiredPro = 0;
  let migrationEligible = 0;
  let migrationBlockedSuspicious = 0;
  let corroboratedWithoutSubscriptionId = 0;

  for (const result of results) {
    byCategory[result.category] = (byCategory[result.category] || 0) + 1;
    byAction[result.recommendedAction] = (byAction[result.recommendedAction] || 0) + 1;
    for (const code of result.conflicts) conflicts[code] = (conflicts[code] || 0) + 1;
    for (const code of result.suspicious) suspicious[code] = (suspicious[code] || 0) + 1;
    if (result.isAdmin) admins++;
    if (result.category === "pro-expired") expiredPro++;
    if (result.migrationEligible) migrationEligible++;
    if (result.migrationEligibleRaw && !result.migrationEligible) migrationBlockedSuspicious++;
    if (result.category === "pro-userdoc-corroborated" && !result.signals.subscriptionIdPresent) {
      corroboratedWithoutSubscriptionId++;
    }
    if (result.proLike || result.isAdmin) expiry[expiryBucket(result, now)]++;
  }

  return {
    totalAccounts: results.length,
    admins,
    expiredPro,
    migrationEligible,
    migrationBlockedSuspicious,
    corroboratedWithoutSubscriptionId,
    byCategory,
    byAction,
    conflicts,
    suspicious,
    expiry,
  };
}

function dateOnly(ms) {
  if (ms == null) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Chooses migration candidates. Suspicious accounts are excluded unless the
 * operator opts in explicitly, which the CLI only permits together with an
 * alias allowlist.
 */
function selectMigrationCandidates(results, { allowSuspicious = false, onlyAliases = null } = {}) {
  return results.filter((result) => {
    const eligible = allowSuspicious ? result.migrationEligibleRaw : result.migrationEligible;
    if (!eligible) return false;
    if (onlyAliases && onlyAliases.size && !onlyAliases.has(result.alias)) return false;
    return true;
  });
}

function toReportRecord(result, { includeUids = false, now = Date.now() } = {}) {
  const { signals } = result;
  const record = {
    alias: result.alias,
    category: result.category,
    recommendedAction: result.recommendedAction,
    isAdmin: result.isAdmin,
    adminSources: result.adminSources,
    migrationEligible: result.migrationEligible,
    migrationEligibleRaw: result.migrationEligibleRaw,
    migrationBlockedBy: result.migrationBlockedBy,
    proLike: result.proLike,
    expiryBucket: expiryBucket(result, now),
    primaryExpiry: dateOnly(result.primaryExpiryMs),
    expiries: result.expiries.map((entry) => ({ source: entry.source, date: dateOnly(entry.ms) })),
    conflicts: result.conflicts,
    suspicious: result.suspicious,
    signals: {
      claimsPro: result.claimsPro,
      entitlement: result.entitlementExists ? (result.entitlementPro ? "pro" : "inactive") : "missing",
      userDocPro: result.userDocPro,
      plan: signals.plan,
      tier: signals.tier,
      subscriptionStatus: signals.subscriptionStatus,
      flagPro: signals.flagPro,
      subscriptionObject: signals.subscriptionObject,
      subscriptionIdPresent: signals.subscriptionIdPresent,
      referralProDays: signals.referralProDays,
      referralBonusChats: signals.referralBonusChats,
      hasAuthRecord: Boolean(result.authUser),
    },
  };
  if (includeUids) record.uid = result.uid;
  return record;
}

function renderMarkdown({ projectId, generatedAt, summary, records }) {
  const lines = [];
  lines.push(`# Entitlement audit — ${projectId}`);
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("Mode: READ-ONLY (no Firestore writes)");
  lines.push("");
  lines.push(`Accounts scanned: **${summary.totalAccounts}**`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | --- |");
  lines.push(`| Administrators | ${summary.admins} |`);
  lines.push(`| Expired Pro | ${summary.expiredPro} |`);
  lines.push(`| Migration-eligible (verified Pro) | ${summary.migrationEligible} |`);
  lines.push(`| Blocked by suspicious signals | ${summary.migrationBlockedSuspicious} |`);
  lines.push(`| Corroborated without subscription id | ${summary.corroboratedWithoutSubscriptionId} |`);
  lines.push("");
  lines.push("### Categories");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(summary.byCategory).sort()) lines.push(`| ${key} | ${value} |`);
  lines.push("");
  lines.push("### Expiry distribution");
  lines.push("");
  lines.push("| Bucket | Count |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(summary.expiry)) lines.push(`| ${key} | ${value} |`);
  lines.push("");
  if (Object.keys(summary.suspicious).length) {
    lines.push("### Suspicious signals");
    lines.push("");
    lines.push("| Signal | Count |");
    lines.push("| --- | --- |");
    for (const [key, value] of Object.entries(summary.suspicious).sort()) lines.push(`| ${key} | ${value} |`);
    lines.push("");
  }
  if (Object.keys(summary.conflicts).length) {
    lines.push("### Conflicts");
    lines.push("");
    lines.push("| Conflict | Count |");
    lines.push("| --- | --- |");
    for (const [key, value] of Object.entries(summary.conflicts).sort()) lines.push(`| ${key} | ${value} |`);
    lines.push("");
  }
  lines.push("## Accounts");
  lines.push("");
  lines.push("| Alias | Category | Action | Admin | Expiry | Conflicts | Suspicious |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const record of records) {
    lines.push(`| ${record.alias} | ${record.category} | ${record.recommendedAction} | ${record.isAdmin ? "yes" : ""} | ${record.primaryExpiry || "—"} | ${record.conflicts.join(", ") || "—"} | ${record.suspicious.join(", ") || "—"} |`);
  }
  lines.push("");
  lines.push("Aliases are `HMAC-SHA256(AUDIT_SALT, uid)` truncated to 10 hex chars. This report contains no emails, names or raw user ids.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

/* ─────────────────────────────────────────────────────────────
   Self-test: proves the classifier without any credentials.
   Run with: node scripts/audit-entitlements.js --self-test
   ───────────────────────────────────────────────────────────── */
function runSelfTest() {
  const assert = require("assert");
  const salt = "self-test-salt";
  const now = Date.parse("2026-10-31T00:00:00Z");
  const future = new Date(now + 30 * DAY_MS);
  const past = new Date(now - DAY_MS);

  const auth = (uid, customClaims = {}, options = {}) => ({
    uid,
    email: options.email || null,
    emailVerified: options.emailVerified !== false,
    customClaims,
  });

  const run = (input) => classifyAccount({ salt, now, ...input });
  const checks = [];

  const adminClaim = run({ uid: "a1", authUser: auth("a1", { admin: true }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([adminClaim.isAdmin === true, "admin custom claim is admin"]);
  checks.push([adminClaim.category === "admin", "admin category"]);

  const legacyAdmin = run({ uid: "a2", authUser: auth("a2"), userData: { role: "admin", isAdmin: true, plan: "pro" }, entitlementData: null, entitlementExists: false });
  checks.push([legacyAdmin.isAdmin === false, "user-doc role never grants admin"]);
  checks.push([legacyAdmin.category === "pro-userdoc-unverified", "legacy admin plan is unverified"]);
  checks.push([legacyAdmin.suspicious.includes("user-doc-admin-fields"), "legacy admin fields flagged"]);

  const unverifiedAllowlist = run({ uid: "a3", authUser: auth("a3", {}, { email: "premjains106@gmail.com", emailVerified: false }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([unverifiedAllowlist.isAdmin === false, "unverified allowlisted email is not admin"]);

  const verifiedAllowlist = run({ uid: "a4", authUser: auth("a4", {}, { email: "premjains106@gmail.com", emailVerified: true }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([verifiedAllowlist.isAdmin === true, "verified allowlisted email is admin"]);

  const claimsPro = run({ uid: "b1", authUser: auth("b1", { pro: true, proExpiresAt: future.toISOString() }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([claimsPro.category === "pro-claims", "valid pro claim classified"]);
  checks.push([claimsPro.migrationEligible === true, "valid pro claim with expiry is migratable"]);
  checks.push([claimsPro.recommendedAction === "create-entitlement", "pro claim action"]);

  const lifetimeClaims = run({ uid: "b2", authUser: auth("b2", { pro: true }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([lifetimeClaims.category === "pro-claims", "lifetime claim classified pro"]);
  checks.push([lifetimeClaims.migrationEligible === false, "lifetime claim is not auto-migrated"]);
  checks.push([lifetimeClaims.hasLifetimeClaims === true, "lifetime claim flagged"]);

  const expiredClaims = run({ uid: "b3", authUser: auth("b3", { pro: true, proExpiresAt: past.toISOString() }), userData: null, entitlementData: null, entitlementExists: false });
  checks.push([expiredClaims.category === "pro-expired", "expired claim classified expired"]);
  checks.push([expiredClaims.conflicts.includes("claims-pro-expired"), "expired claim flagged"]);

  const entitlementPro = run({ uid: "c1", authUser: auth("c1"), userData: { plan: "pro" }, entitlementData: { plan: "pro", proExpiresAt: future.toISOString() }, entitlementExists: true });
  checks.push([entitlementPro.category === "pro-entitlement", "entitlement wins"]);
  checks.push([entitlementPro.migrationEligible === false, "existing entitlement not re-migrated"]);

  const entitlementRevoked = run({ uid: "c2", authUser: auth("c2"), userData: { plan: "pro", subscriptionStatus: "active", subscriptionExpiresAt: future.toISOString(), subscription: { status: "active" } }, entitlementData: { plan: "free" }, entitlementExists: true });
  checks.push([entitlementRevoked.category === "pro-userdoc-corroborated", "user doc pro detected"]);
  checks.push([entitlementRevoked.migrationEligible === false, "revoked entitlement is never overwritten"]);
  checks.push([entitlementRevoked.conflicts.includes("entitlement-inactive-but-other-source-pro"), "revocation conflict flagged"]);

  const corroborated = run({ uid: "d1", authUser: auth("d1"), userData: { plan: "pro", subscriptionStatus: "active", subscriptionExpiresAt: future.toISOString(), subscription: { status: "active", plan: "pro", id: "sub_test_123" } }, entitlementData: null, entitlementExists: false });
  checks.push([corroborated.category === "pro-userdoc-corroborated", "corroborated user doc"]);
  checks.push([corroborated.migrationEligible === true, "corroborated user doc is migratable"]);
  checks.push([corroborated.signals.subscriptionIdPresent === true, "subscription id detected"]);

  const flagOnly = run({ uid: "d2", authUser: auth("d2"), userData: { isPro: true }, entitlementData: null, entitlementExists: false });
  checks.push([flagOnly.category === "pro-userdoc-unverified", "flag-only is unverified"]);
  checks.push([flagOnly.migrationEligible === false, "flag-only is not migrated"]);
  checks.push([flagOnly.suspicious.includes("pro-flag-without-future-expiry"), "flag-only flagged"]);

  const referralNoExpiry = run({ uid: "d3", authUser: auth("d3"), userData: { referralRewards: { proDays: 30, bonusChats: 999999 } }, entitlementData: null, entitlementExists: false });
  checks.push([referralNoExpiry.userDocPro === false, "referral days without expiry do not grant Pro"]);
  checks.push([referralNoExpiry.suspicious.includes("referral-pro-days-without-future-expiry"), "referral without expiry flagged"]);

  const expiredUser = run({ uid: "d4", authUser: auth("d4"), userData: { plan: "pro", subscriptionStatus: "active", subscriptionExpiresAt: past.toISOString() }, entitlementData: null, entitlementExists: false });
  checks.push([expiredUser.category === "pro-expired", "expired user doc"]);
  checks.push([expiredUser.conflicts.includes("active-status-but-expired"), "stale active status flagged"]);

  const noAuth = run({ uid: "d5", authUser: null, userData: { plan: "pro", subscriptionStatus: "active", subscriptionExpiresAt: future.toISOString(), subscription: { status: "active" } }, entitlementData: null, entitlementExists: false });
  checks.push([noAuth.migrationEligible === false, "deleted auth user is never migrated"]);
  checks.push([noAuth.suspicious.includes("no-auth-record"), "missing auth record flagged"]);

  const mismatch = run({ uid: "d6", authUser: auth("d6", { pro: true, proExpiresAt: future.toISOString() }), userData: { plan: "pro", subscriptionExpiresAt: new Date(now + 60 * DAY_MS).toISOString(), subscription: { status: "active" } }, entitlementData: null, entitlementExists: false });
  checks.push([mismatch.conflicts.includes("multiple-expiry-values"), "conflicting expiry dates flagged"]);
  checks.push([mismatch.migrationEligible === false, "conflicting expiry blocks migration"]);

  const referralRewardsPro = run({ uid: "e1", authUser: auth("e1"), userData: { plan: "pro", subscriptionStatus: "active", subscriptionExpiresAt: future.toISOString(), subscription: { status: "active", id: "sub_test_456" }, referralRewards: { bonusChats: 100 } }, entitlementData: null, entitlementExists: false });
  checks.push([referralRewardsPro.migrationEligibleRaw === true, "corroborated referral account is otherwise migratable"]);
  checks.push([referralRewardsPro.migrationEligible === false, "referral rewards block automatic migration"]);
  checks.push([referralRewardsPro.migrationBlockedBy.includes("user-doc-referral-rewards"), "suspicious reason recorded"]);
  checks.push([referralRewardsPro.recommendedAction === "review-suspicious", "suspicious corroborated account is flagged for review"]);

  const adminFieldsPro = run({ uid: "e2", authUser: auth("e2", { pro: true, proExpiresAt: future.toISOString() }), userData: { role: "admin" }, entitlementData: null, entitlementExists: false });
  checks.push([adminFieldsPro.isAdmin === false, "user-doc admin field does not grant admin"]);
  checks.push([adminFieldsPro.migrationEligibleRaw === true, "claims pro is otherwise migratable"]);
  checks.push([adminFieldsPro.migrationEligible === false, "legacy admin fields block automatic migration"]);
  checks.push([adminFieldsPro.recommendedAction === "review-suspicious", "suspicious claim account is flagged for review"]);

  const allCandidates = [corroborated, referralRewardsPro, adminFieldsPro, flagOnly];
  const defaultSelection = selectMigrationCandidates(allCandidates);
  checks.push([defaultSelection.length === 1 && defaultSelection[0].uid === "d1", "default selection excludes suspicious accounts"]);
  const permissiveSelection = selectMigrationCandidates(allCandidates, { allowSuspicious: true });
  checks.push([permissiveSelection.length === 3 && !permissiveSelection.some((r) => r.uid === "d2"), "allowSuspicious selects raw-eligible accounts only"]);
  const aliasOnlySelection = selectMigrationCandidates(allCandidates, { allowSuspicious: true, onlyAliases: new Set([referralRewardsPro.alias]) });
  checks.push([aliasOnlySelection.length === 1 && aliasOnlySelection[0].uid === "e1", "alias allowlist narrows selection"]);

  const aliasA = aliasFor("same-uid", salt);
  checks.push([aliasA === aliasFor("same-uid", salt), "alias is deterministic"]);
  checks.push([aliasA !== aliasFor("other-uid", salt), "alias differs per uid"]);
  const record = toReportRecord(corroborated, { includeUids: false });
  const serialized = JSON.stringify(record);
  checks.push([record.uid === undefined, "report record contains no raw uid"]);
  checks.push([!serialized.includes("@"), "report record contains no email"]);

  for (const [ok, label] of checks) {
    if (!ok) throw new Error(`Self-test failed: ${label}`);
  }
  return checks.length;
}

module.exports = {
  classifyAccount,
  userDocSignals,
  collectExpiries,
  aliasFor,
  summarize,
  selectMigrationCandidates,
  toReportRecord,
  renderMarkdown,
  runSelfTest,
  expiryBucket,
};
