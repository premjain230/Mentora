#!/usr/bin/env node
"use strict";

/**
 * Entitlement migration: copies verified legacy Pro access into the
 * server-owned entitlements/{uid} collection.
 *
 * Default is DRY-RUN. Nothing is written without --apply.
 *
 * Safety rules:
 *   - Only verified accounts are migrated: valid custom claim with a future
 *     expiry, or a user document with a future expiry AND subscription
 *     evidence.
 *   - Suspicious, conflicting, expired, admin, deleted-auth and unverified
 *     accounts are never written automatically. A suspicious account can only
 *     be migrated with an explicit --allow-suspicious --only-alias=<u_...>.
 *   - Uses create() (exists=false precondition), so reruns are idempotent and
 *     an existing server record is never overwritten.
 *   - Never touches users/*, Auth, or any other collection.
 *   - Writes a local audit report containing aliases only.
 *
 * Usage:
 *   AUDIT_SALT="..." node scripts/migrate-entitlements.js                  # dry run
 *   AUDIT_SALT="..." node scripts/migrate-entitlements.js --apply \
 *     --confirm-project=mentora-c6dca --max-writes=500
 */

const fs = require("fs");
const path = require("path");
const { initAdmin } = require("./lib/admin-script-init");
const { collectAccounts, buildResults } = require("./lib/collect-accounts");
const {
  summarize,
  selectMigrationCandidates,
  toReportRecord,
  runSelfTest,
  aliasFor,
} = require("./lib/entitlement-audit");
const { entitlementDataIsPro, referralBonusChats } = require("../server/_admin.js");

const DEFAULT_MAX_WRITES = 500;

function parseArgs(argv) {
  const args = { onlyAliases: new Set(), maxWrites: DEFAULT_MAX_WRITES };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [key, inline] = raw.slice(2).split("=");
    const readValue = () => (inline !== undefined ? inline : argv[++i]);
    switch (key) {
      case "apply":
        args.apply = true;
        break;
      case "dry-run":
        args.apply = false;
        break;
      case "self-test":
        args.selfTest = true;
        break;
      case "skip-auth":
        args.skipAuth = true;
        break;
      case "require-subscription-id":
        args.requireSubscriptionId = true;
        break;
      case "allow-suspicious":
        args.allowSuspicious = true;
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
      case "confirm-project":
        args.confirmProject = readValue();
        break;
      case "max-writes":
        args.maxWrites = Number(readValue()) || DEFAULT_MAX_WRITES;
        break;
      case "max-auth-users":
        args.maxAuthUsers = Number(readValue()) || 200000;
        break;
      case "only-alias":
        args.onlyAliases.add(readValue());
        break;
      case "alias":
        args.alias = readValue();
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  AUDIT_SALT="<random secret>" node scripts/migrate-entitlements.js [options]

Default mode is a DRY RUN. No Firestore writes occur without --apply.

Options:
  --apply                     Perform writes (requires --confirm-project)
  --confirm-project <id>      Must equal the Admin SDK project id
  --max-writes <n>            Safety cap for a single run (default: ${DEFAULT_MAX_WRITES})
  --only-alias <u_xxx>        Limit to specific aliases (repeatable)
  --allow-suspicious          Permit suspicious accounts (requires --only-alias)
  --require-subscription-id   Only migrate user-doc evidence that carries a subscription id
  --out <dir>                 Report directory (default: audit-reports)
  --with-uids                 Include raw uids in the local report (default: off)
  --skip-auth                 Documents only (disables claims-based migration)
  --max-auth-users <n>        Cap Auth scan (default: 200000)
  --alias <uid>               Print the alias for a uid and exit
  --self-test                 Run classifier fixtures without credentials
  --help                      Show this message
`);
}

function requireSalt() {
  const salt = process.env.AUDIT_SALT;
  if (!salt || salt.length < 8) {
    throw new Error("AUDIT_SALT (>= 8 chars) is required so reports stay anonymized.");
  }
  return salt;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Error messages can contain document paths or uids; only keep a safe code. */
function safeErrorCode(err) {
  const raw = err && err.code;
  const value = typeof raw === "number" ? String(raw) : String(raw || "");
  return /^[a-z0-9-]{1,40}$/i.test(value) ? value.toLowerCase() : "unknown";
}

function buildPayload(admin, result) {
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(result.migrateExpiryMs));
  const expirySource = (result.expiries.find((entry) => entry.ms === result.primaryExpiryMs) || {}).source || "unknown";
  const bonusChats = referralBonusChats({
    referralRewards: { bonusChats: result.signals.referralBonusChats },
  });
  const payload = {
    plan: "pro",
    status: "active",
    proExpiresAt: expiresAt,
    source: "migration",
    version: 1,
    grantedBy: "migration:phaseA",
    grantedAt: admin.firestore.FieldValue.serverTimestamp(),
    reason: "Legacy Pro verified by read-only audit (Phase A)",
    legacySignals: {
      category: result.category,
      claimSource: result.claimsPro ? "custom-claim" : "user-document",
      plan: result.signals.plan,
      tier: result.signals.tier,
      subscriptionStatus: result.signals.subscriptionStatus,
      flagPro: result.signals.flagPro,
      subscriptionObject: result.signals.subscriptionObject,
      referralProDays: result.signals.referralProDays,
      expirySource,
    },
  };
  // Preserve capped referral bonus chats (never grants Pro on its own).
  if (bonusChats > 0) payload.referralRewards = { bonusChats };
  return payload;
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
    console.log(`[self-test] ${checks} classifier assertions passed (no credentials used).`);
    return;
  }

  const salt = requireSalt();

  if (args.allowSuspicious && args.onlyAliases.size === 0) {
    throw new Error("--allow-suspicious must be combined with at least one --only-alias=<u_...>.");
  }

  if (args.alias) {
    console.log(aliasFor(args.alias, salt));
    return;
  }

  const admin = initAdmin();
  const db = admin.firestore();
  const projectId = admin.app().options.projectId;

  if (args.apply) {
    if (!args.confirmProject) {
      throw new Error("--apply requires --confirm-project=<project id>.");
    }
    if (args.confirmProject !== projectId) {
      throw new Error(`--confirm-project=${args.confirmProject} does not match connected project ${projectId}.`);
    }
  }

  const snapshot = await collectAccounts(admin, {
    skipAuth: Boolean(args.skipAuth),
    maxAuthUsers: args.maxAuthUsers,
  });
  const now = Date.now();
  const results = buildResults(snapshot, { salt, now });
  const summary = summarize(results, now);

  const candidates = selectMigrationCandidates(results, {
    allowSuspicious: Boolean(args.allowSuspicious),
    onlyAliases: args.onlyAliases,
  }).filter((result) => {
    if (args.requireSubscriptionId
        && result.category === "pro-userdoc-corroborated"
        && !result.signals.subscriptionIdPresent) return false;
    return true;
  });

  if (args.apply && candidates.length > args.maxWrites) {
    throw new Error(
      `Refusing to write ${candidates.length} entitlements (max ${args.maxWrites}). `
      + "Inspect the dry-run report, then re-run with a higher --max-writes or --only-alias."
    );
  }

  const outcomes = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let verified = 0;

  for (const result of candidates) {
    const planned = toReportRecord(result, { includeUids: Boolean(args.withUids), now });
    if (!args.apply) {
      outcomes.push({ ...planned, outcome: "planned" });
      continue;
    }

    const ref = db.doc(`entitlements/${result.uid}`);
    try {
      await ref.create(buildPayload(admin, result));
      created++;
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : null;
      const expiryDay = data?.proExpiresAt?.toDate
        ? data.proExpiresAt.toDate().toISOString().slice(0, 10)
        : null;
      const ok = Boolean(data) && entitlementDataIsPro(data)
        && expiryDay === new Date(result.migrateExpiryMs).toISOString().slice(0, 10);
      if (ok) verified++;
      outcomes.push({ ...planned, outcome: ok ? "created-verified" : "created-unverified" });
    } catch (err) {
      const alreadyExists = err.code === 6 || err.code === "already-exists" || err.code === "ALREADY_EXISTS";
      if (alreadyExists) {
        skipped++;
        outcomes.push({ ...planned, outcome: "skipped-existing" });
      } else {
        failed++;
        const code = safeErrorCode(err);
        console.error(`[migrate] ${planned.alias} failed (${code})`);
        outcomes.push({ ...planned, outcome: `error:${code}` });
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    projectId,
    mode: args.apply ? "apply" : "dry-run",
    warnings: snapshot.warnings,
    summary,
    migration: {
      candidates: candidates.length,
      blockedSuspicious: summary.migrationBlockedSuspicious,
      allowSuspicious: Boolean(args.allowSuspicious),
      created,
      skippedExisting: skipped,
      failed,
      verified,
    },
    accounts: outcomes,
  };

  const outDir = path.resolve(args.out || "audit-reports");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `entitlement-migration-${stamp()}`);
  fs.writeFileSync(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const lines = [
    `# Entitlement migration — ${projectId}`,
    "",
    `Generated: ${generatedAt}`,
    `Mode: **${args.apply ? "APPLY" : "DRY RUN (no writes)"}**`,
    "",
    "| Metric | Count |",
    "| --- | --- |",
    `| Accounts scanned | ${summary.totalAccounts} |`,
    `| Candidates | ${candidates.length} |`,
    `| Blocked by suspicious signals | ${summary.migrationBlockedSuspicious} |`,
    `| Allow-suspicious override | ${args.allowSuspicious ? "enabled" : "disabled"} |`,
    `| Created | ${created} |`,
    `| Already existed (skipped) | ${skipped} |`,
    `| Failed | ${failed} |`,
    `| Verified after write | ${verified} |`,
    "",
    "| Alias | Category | Expiry | Outcome |",
    "| --- | --- | --- | --- |",
    ...outcomes.map((record) => `| ${record.alias} | ${record.category} | ${record.primaryExpiry || "—"} | ${record.outcome} |`),
    "",
    "No emails, names or raw user ids are included unless --with-uids was passed.",
    "",
  ];
  fs.writeFileSync(`${base}.md`, lines.join("\n"), "utf8");

  console.log(`Entitlement migration (${args.apply ? "APPLY" : "DRY RUN — no writes"})`);
  console.log(`Project: ${projectId}`);
  console.log(`Accounts scanned: ${summary.totalAccounts}`);
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Blocked by suspicious signals: ${summary.migrationBlockedSuspicious}`);
  if (args.allowSuspicious) console.log("Allow-suspicious override enabled for the aliases passed with --only-alias.");
  if (args.apply) {
    console.log(`Created: ${created}, skipped-existing: ${skipped}, failed: ${failed}, verified: ${verified}`);
  }
  if (snapshot.warnings.length) console.log("Warnings:", snapshot.warnings.join(" | "));
  console.log(`Report: ${base}.json`);
  console.log(`Report: ${base}.md`);

  if (!args.apply) console.log("Dry run only — re-run with --apply --confirm-project=<id> to write.");
  if (args.requireSubscriptionId) console.log("Strict mode: user-doc candidates without a subscription id were skipped.");
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
});
