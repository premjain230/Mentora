"use strict";

const { classifyAccount } = require("./entitlement-audit");

const USER_FIELDS = [
  "plan",
  "tier",
  "subscriptionTier",
  "isPro",
  "pro",
  "isPremium",
  "role",
  "isAdmin",
  "admin",
  "subscriptionStatus",
  "subscription",
  "subscriptionExpiresAt",
  "proExpiresAt",
  "proUntil",
  "referralRewards",
  "createdAt",
];

async function listAllAuthUsers(admin, { maxAuthUsers = 200000 } = {}) {
  const users = new Map();
  let pageToken;
  let scanned = 0;
  while (scanned < maxAuthUsers) {
    const page = await admin.auth().listUsers(Math.min(1000, maxAuthUsers - scanned), pageToken);
    for (const user of page.users) {
      users.set(user.uid, user);
      scanned++;
    }
    pageToken = page.pageToken;
    if (!pageToken) return { users, complete: true };
  }
  return { users, complete: false };
}

/**
 * Read-only snapshot of the entitlement-relevant data. Never writes.
 */
async function collectAccounts(admin, { skipAuth = false, maxAuthUsers = 200000 } = {}) {
  const db = admin.firestore();
  const warnings = [];
  let authUsers = new Map();
  let authScanComplete = !skipAuth;

  if (skipAuth) {
    warnings.push("Auth scan skipped (--skip-auth): admin claims and missing-auth detection are unavailable.");
  } else {
    try {
      const result = await listAllAuthUsers(admin, { maxAuthUsers });
      authUsers = result.users;
      authScanComplete = result.complete;
      if (!result.complete) warnings.push(`Auth scan stopped at ${maxAuthUsers} users; admin detection is partial.`);
    } catch (err) {
      throw new Error(
        `Firebase Auth scan failed (${err.message}). Re-run with --skip-auth only if you accept `
        + "that admin/claims classification will be unknown."
      );
    }
  }

  const [userSnap, entitlementSnap] = await Promise.all([
    db.collection("users").select(...USER_FIELDS).get(),
    db.collection("entitlements").get(),
  ]);

  const userDocs = new Map();
  userSnap.forEach((doc) => userDocs.set(doc.id, doc.data() || {}));

  const entitlements = new Map();
  entitlementSnap.forEach((doc) => entitlements.set(doc.id, doc.data() || {}));

  const uids = new Set([...userDocs.keys(), ...entitlements.keys(), ...authUsers.keys()]);

  return {
    uids,
    authUsers,
    userDocs,
    entitlements,
    authKnown: !skipAuth,
    authScanComplete,
    warnings,
  };
}

function buildResults(snapshot, { salt, now = Date.now() } = {}) {
  const results = [];
  for (const uid of snapshot.uids) {
    results.push(classifyAccount({
      uid,
      authUser: snapshot.authUsers.get(uid) || null,
      userData: snapshot.userDocs.get(uid) || null,
      entitlementData: snapshot.entitlements.get(uid) || null,
      entitlementExists: snapshot.entitlements.has(uid),
      salt,
      now,
      authKnown: snapshot.authKnown,
    }));
  }
  results.sort((a, b) => a.alias.localeCompare(b.alias));
  return results;
}

module.exports = { collectAccounts, buildResults, listAllAuthUsers };
