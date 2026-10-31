#!/usr/bin/env node
"use strict";

/**
 * Read-only production entitlement audit.
 *
 *   AUDIT_SALT="<random secret>" node scripts/audit-entitlements.js
 *   node scripts/audit-entitlements.js --self-test
 *
 * This script performs NO Firestore writes. It reads:
 *   - Firebase Auth users (custom claims, verified email flag)
 *   - users/* (entitlement-related fields only)
 *   - entitlements/*
 *
 * Reports are written locally and contain aliases only (no emails/names/uids)
 * unless --with-uids is explicitly passed for local remediation.
 */

const fs = require("fs");
const path = require("path");
const { initAdmin } = require("./lib/admin-script-init");
const { collectAccounts, buildResults } = require("./lib/collect-accounts");
const {
  summarize,
  toReportRecord,
  renderMarkdown,
  runSelfTest,
  aliasFor,
} = require("./lib/entitlement-audit");

function parseArgs(argv) {
  const args = { maxAuthUsers: 200000 };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [key, inline] = raw.slice(2).split("=");
    const readValue = () => (inline !== undefined ? inline : argv[++i]);
    switch (key) {
      case "self-test":
        args.selfTest = true;
        break;
      case "skip-auth":
        args.skipAuth = true;
        break;
      case "with-uids":
        args.withUids = true;
        break;
      case "help":
        args.help = true;
        break;
      case "out":
        args.out = readValue();
        break;
      case "alias":
        args.alias = readValue();
        break;
      case "max-auth-users":
        args.maxAuthUsers = Number(readValue()) || 200000;
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  AUDIT_SALT="<random secret>" node scripts/audit-entitlements.js [options]

Read-only. Options:
  --out <dir>             Report directory (default: audit-reports)
  --with-uids             Include raw uids in the local report (default: off)
  --skip-auth             Audit documents only (loses admin/claims detection)
  --max-auth-users <n>    Cap Auth scan (default: 200000)
  --alias <uid>           Print the alias for a uid and exit
  --self-test             Run classifier fixtures without credentials
  --help                  Show this message

Generate a salt once per audit line:
  export AUDIT_SALT="$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
`);
}

function requireSalt() {
  const salt = process.env.AUDIT_SALT;
  if (!salt || salt.length < 8) {
    throw new Error(
      "AUDIT_SALT is required (>= 8 chars) so uids are anonymized. "
      + "Set it with: export AUDIT_SALT=\"$(node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\")\""
    );
  }
  return salt;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    usage();
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    usage();
    return;
  }

  if (args.selfTest) {
    const checks = runSelfTest();
    console.log(`[self-test] ${checks} classifier assertions passed (no credentials used, no data read).`);
    return;
  }

  const salt = requireSalt();

  if (args.alias) {
    console.log(aliasFor(args.alias, salt));
    return;
  }

  const admin = initAdmin();
  const projectId = admin.app().options.projectId;
  const snapshot = await collectAccounts(admin, {
    skipAuth: Boolean(args.skipAuth),
    maxAuthUsers: args.maxAuthUsers,
  });
  const now = Date.now();
  const results = buildResults(snapshot, { salt, now });
  const summary = summarize(results, now);
  const records = results.map((result) => toReportRecord(result, { includeUids: Boolean(args.withUids), now }));

  const generatedAt = new Date().toISOString();
  const outDir = path.resolve(args.out || "audit-reports");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `entitlement-audit-${stamp()}`);
  const payload = {
    generatedAt,
    projectId,
    mode: "read-only",
    warnings: snapshot.warnings,
    summary,
    accounts: records,
  };
  fs.writeFileSync(`${base}.json`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.writeFileSync(`${base}.md`, renderMarkdown({ projectId, generatedAt, summary, records }), "utf8");

  console.log("Entitlement audit (READ-ONLY — no writes performed)");
  console.log(`Project: ${projectId}`);
  console.log(`Accounts scanned: ${summary.totalAccounts}`);
  console.log(`Administrators: ${summary.admins}`);
  console.log(`Expired Pro: ${summary.expiredPro}`);
  console.log(`Migration-eligible: ${summary.migrationEligible}`);
  console.log(`Blocked by suspicious signals: ${summary.migrationBlockedSuspicious}`);
  console.log(`Corroborated without subscription id: ${summary.corroboratedWithoutSubscriptionId}`);
  console.log("Categories:", JSON.stringify(summary.byCategory));
  console.log("Actions:", JSON.stringify(summary.byAction));
  console.log("Expiry buckets:", JSON.stringify(summary.expiry));
  if (snapshot.warnings.length) console.log("Warnings:", snapshot.warnings.join(" | "));
  console.log(`Report: ${base}.json`);
  console.log(`Report: ${base}.md`);
}

main().catch((err) => {
  console.error(`Audit failed: ${err.message}`);
  process.exitCode = 1;
});
