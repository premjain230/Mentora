"use strict";

/**
 * Admin SDK bootstrap for operator scripts. Credential resolution is
 * read-only and explicit; nothing here writes to Firebase.
 *
 * Supported:
 *   FIREBASE_SERVICE_ACCOUNT (JSON)   — same variable the API server uses
 *   FIREBASE_SERVICE_ACCOUNT_KEY      — alias
 *   GOOGLE_ADMIN_SA                   — alias
 *   GOOGLE_APPLICATION_CREDENTIALS    — Application Default Credentials file
 */

function initAdmin() {
  const admin = require("firebase-admin");
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    || process.env.GOOGLE_ADMIN_SA;
  const envProjectId = process.env.FIREBASE_PROJECT_ID || null;

  if (raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
    }
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
      projectId: envProjectId || parsed.project_id || "mentora-c6dca",
    });
    return admin;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: envProjectId || "mentora-c6dca",
    });
    return admin;
  }

  throw new Error(
    "No admin credentials found. Set FIREBASE_SERVICE_ACCOUNT (service-account JSON) "
    + "or GOOGLE_APPLICATION_CREDENTIALS. Both paths are read-only for the audit script."
  );
}

function firestore(admin) {
  return admin.firestore();
}

module.exports = { initAdmin, firestore };
