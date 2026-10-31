/**
 * Learning Allied — Full Regression & Verification Test Suite
 * Tests:
 *  1. Sidebar consistency across all pages
 *  2. Plan entitlement & Pro detection logic (client + server)
 *  3. Subscription expiration behavior
 *  4. Usage limits enforcement & modal gating (Free vs Pro)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname);

/** Loads a small dependency-free TypeScript module with the installed tsc. */
function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("exports", "module", "require", output)(mod.exports, mod, require);
  return mod.exports;
}
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("=" .repeat(60));
console.log("Learning Allied — Verification Test Suite");
console.log("=" .repeat(60));

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: SIDEBAR CONSISTENCY ACROSS ALL PAGES
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 1] Sidebar Consistency & Design System");

const APP_PAGES = [
  "home.html",
  "chat.html",
  "arena.html",
  "planner.html",
  "learning-hub.html",
  "profile.html",
  "study-session.html",
  "subscription.html",
  "settings.html",
];

APP_PAGES.forEach((page) => {
  const filePath = path.join(ROOT, page);
  const content = fs.readFileSync(filePath, "utf8");

  test(`${page}: contains #sidebarMount (shared dynamic sidebar)`, () => {
    assert(
      content.includes('id="sidebarMount"'),
      `Missing id="sidebarMount" in ${page}`
    );
  });

  test(`${page}: imports mountSidebar from /js/components/sidebar.js`, () => {
    assert(
      content.includes("mountSidebar"),
      `Missing mountSidebar import/call in ${page}`
    );
  });

  test(`${page}: links to /css/sidebar.css`, () => {
    assert(
      content.includes("/css/sidebar.css"),
      `Missing /css/sidebar.css link in ${page}`
    );
  });

  test(`${page}: links to /css/shell.css`, () => {
    assert(
      content.includes("/css/shell.css"),
      `Missing /css/shell.css link in ${page}`
    );
  });

  test(`${page}: does not have hardcoded inline <aside class="sidebar">`, () => {
    const inlineAside = content.includes('<aside class="sidebar"') || content.includes("<aside class='sidebar'");
    assert(
      !inlineAside,
      `Found legacy inline sidebar markup in ${page} — should use sidebarMount`
    );
  });

  test(`${page}: does not contain broken signOutBtnSidebar reference`, () => {
    assert(
      !content.includes("signOutBtnSidebar") || content.includes("|| document.getElementById('signOutBtnSidebar')"),
      `Found unfixed signOutBtnSidebar in ${page}`
    );
  });
});

test("sidebar.html: uses clean clean URLs (no .html suffixes on nav items)", () => {
  const sidebarHtml = fs.readFileSync(path.join(ROOT, "sidebar.html"), "utf8");
  assert(sidebarHtml.includes('href="/home"'), 'Missing href="/home"');
  assert(sidebarHtml.includes('href="/chat"'), 'Missing href="/chat"');
  assert(sidebarHtml.includes('href="/settings"'), 'Missing href="/settings"');
  assert(sidebarHtml.includes('href="/subscription"'), 'Missing href="/subscription"');
  assert(!sidebarHtml.includes('href="/referral"'), 'Refer & Earn should not be in sidebar');
  assert(!sidebarHtml.includes('href="home.html"'), 'Found legacy home.html href');
  assert(!sidebarHtml.includes('href="chat.html"'), 'Found legacy chat.html href');
});

test("sidebar.html: logo height is styled cleanly in sidebar.css (34px)", () => {
  const sidebarCss = fs.readFileSync(path.join(ROOT, "css/sidebar.css"), "utf8");
  assert(sidebarCss.includes(".logo-img { height: 34px;"), "Logo img height not 34px in sidebar.css");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: PLAN DETECTION & PRO ENTITLEMENTS (CLIENT-SIDE)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 2] Pro Plan Entitlements & Detection (Client)");

const {
  resolveIsPro,
  resolveEntitlement,
  entitlementDataIsPro: isProUserData,
  MAX_REFERRAL_BONUS_CHATS,
} = loadTsModule("lib/entitlement.ts");

test("Free user: plan: 'free' returns false (not Pro)", () => {
  assert.strictEqual(isProUserData({ plan: "free" }), false);
});

test("Free user: empty object returns false", () => {
  assert.strictEqual(isProUserData({}), false);
});

test("Free user: null / undefined returns false", () => {
  assert.strictEqual(isProUserData(null), false);
  assert.strictEqual(isProUserData(undefined), false);
});

test("Pro user: plan: 'pro' (lowercase) returns true", () => {
  assert.strictEqual(isProUserData({ plan: "pro" }), true);
});

test("Pro user: plan: 'Pro' (capitalized) returns true", () => {
  assert.strictEqual(isProUserData({ plan: "Pro" }), true);
});

test("Pro user: plan: 'PREMIUM' returns true", () => {
  assert.strictEqual(isProUserData({ plan: "PREMIUM" }), true);
});

test("Pro user: isPro: true flag returns true", () => {
  assert.strictEqual(isProUserData({ isPro: true }), true);
});

test("Pro user: subscriptionStatus: 'active' returns true", () => {
  assert.strictEqual(isProUserData({ subscriptionStatus: "active" }), true);
});

test("Pro user: nested subscription.status: 'active' returns true", () => {
  assert.strictEqual(isProUserData({ subscription: { status: "active" } }), true);
});

test("SECURITY: user-doc role/isAdmin never grants Pro (claims only)", () => {
  assert.strictEqual(isProUserData({ role: "admin" }), false);
  assert.strictEqual(isProUserData({ isAdmin: true }), false);
  assert.strictEqual(resolveIsPro({ userData: { role: "admin", isAdmin: true } }), false);
});

test("Verified admin custom claim grants Pro", () => {
  assert.strictEqual(resolveIsPro({ claims: { admin: true } }), true);
  assert.strictEqual(resolveIsPro({ claims: { role: "admin" } }), true);
  assert.strictEqual(resolveEntitlement({ claims: { admin: true } }).plan, "pro");
});

test("Verified Pro claim is validated against its expiry", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.strictEqual(resolveIsPro({ claims: { pro: true } }), true);
  assert.strictEqual(resolveIsPro({ claims: { pro: true, proExpiresAt: future } }), true);
  assert.strictEqual(resolveIsPro({ claims: { pro: true, proExpiresAt: past } }), false);
});

test("legacy subscription.js validates Pro claim expiry in getUserPlan", () => {
  const legacy = fs.readFileSync(path.join(ROOT, "subscription.js"), "utf8");
  assert(legacy.includes("function claimsGrantPro(claims)"), "claimsGrantPro helper missing");
  assert(!legacy.includes("tokenResult?.claims?.pro === true ||"), "raw unvalidated Pro claim check still present");
  assert(legacy.includes("exp.getTime() > Date.now()"), "claim expiry check missing");
});

test("Expired user: subscriptionExpiresAt in the past returns FALSE (reverts to free)", () => {
  const past = new Date(Date.now() - 3600000).toISOString();
  assert.strictEqual(
    isProUserData({ plan: "pro", subscriptionExpiresAt: past }),
    false
  );
});

test("SECURITY: entitlement record is authoritative over legacy user doc", () => {
  const past = new Date(Date.now() - 3600000).toISOString();
  assert.strictEqual(
    resolveIsPro({
      entitlement: { plan: "free" },
      userData: { plan: "pro" },
    }),
    false
  );
  assert.strictEqual(
    resolveIsPro({
      entitlement: { plan: "pro", subscriptionExpiresAt: past },
      userData: { plan: "pro" },
    }),
    false
  );
  assert.strictEqual(
    resolveIsPro({ entitlement: { plan: "pro" }, userData: { plan: "free" } }),
    true
  );
});

test("SECURITY: referral Pro days require an explicit, valid expiry", () => {
  assert.strictEqual(isProUserData({ referralRewards: { proDays: 30 } }), false);
  assert.strictEqual(
    isProUserData({
      referralRewards: { proDays: 30, proExpiresAt: new Date(Date.now() + 86400000).toISOString() },
    }),
    true
  );
});

test("SECURITY: referral bonus chats are clamped", () => {
  assert.strictEqual(
    resolveEntitlement({ userData: { referralRewards: { bonusChats: 999999 } } }).bonusChats,
    MAX_REFERRAL_BONUS_CHATS
  );
  assert.strictEqual(
    resolveEntitlement({ userData: { referralRewards: { bonusChats: -5 } } }).bonusChats,
    0
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: SERVER-SIDE PRO DETECTION (server/_admin.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 3] Server-Side Plan Verification (server/_admin.js)");

const adminJs = fs.readFileSync(path.join(ROOT, "server/_admin.js"), "utf8");
const serverAdmin = require("./server/_admin");

test("server/_admin.js: SERVER_PLAN_LIMITS defines Infinity for Pro chatLimit", () => {
  assert(adminJs.includes("pro: { chatLimit: Infinity }"), "Pro limit should be Infinity");
  assert(adminJs.includes("free: { chatLimit: 20 }"), "Free limit should be 20");
});

test("server: user-doc email/role/isAdmin never grants Pro", () => {
  assert.strictEqual(
    serverAdmin.isProUserDataServer({ role: "admin", isAdmin: true, email: "premjains106@gmail.com" }),
    false
  );
});

test("SECURITY: admin email allowlist requires a verified email", () => {
  const adminEmail = "premjains106@gmail.com";
  assert.strictEqual(
    serverAdmin.isAdminClaims({ email: adminEmail, email_verified: false }),
    false
  );
  assert.strictEqual(
    serverAdmin.isAdminClaims({ email: adminEmail }),
    false
  );
  assert.strictEqual(
    serverAdmin.isAdminClaims({ email: adminEmail, email_verified: true }),
    true
  );
  assert.strictEqual(
    serverAdmin.resolveEntitlement({ claims: { email: adminEmail, email_verified: false } }).plan,
    "free"
  );
});

test("server: verified claims outrank server-owned and legacy sources", () => {
  const resolved = serverAdmin.resolveEntitlement({
    claims: { admin: true },
    entitlementData: { plan: "free" },
    entitlementExists: true,
    userData: { plan: "free" },
  });
  assert.strictEqual(resolved.plan, "pro");
  assert.strictEqual(resolved.source, "claims-admin");
});

test("server: entitlement record suppresses stale Pro user doc", () => {
  const resolved = serverAdmin.resolveEntitlement({
    claims: null,
    entitlementData: { plan: "free" },
    entitlementExists: true,
    userData: { plan: "pro" },
  });
  assert.strictEqual(resolved.plan, "free");
  assert.strictEqual(resolved.source, "entitlement");
});

test("server: expired subscription reverts to free (server-side validation)", () => {
  const past = new Date(Date.now() - 3600000).toISOString();
  const resolved = serverAdmin.resolveEntitlement({
    claims: null,
    entitlementData: { plan: "pro", subscriptionExpiresAt: past },
    entitlementExists: true,
    userData: null,
  });
  assert.strictEqual(resolved.plan, "free");
});

test("server: referral bonuses are clamped", () => {
  const resolved = serverAdmin.resolveEntitlement({
    userData: { referralRewards: { bonusChats: 999999 } },
  });
  assert.strictEqual(resolved.bonusChats, serverAdmin.MAX_REFERRAL_BONUS_CHATS);
});

test("server: chat quota increment is transactional", () => {
  assert(adminJs.includes("db.runTransaction"), "Usage increment must be atomic");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3B: ADMIN GRANT/REVOKE SAFETY (server/_entitlement-admin.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 3B] Admin Grant/Revoke Safety");

const entitlementAdmin = require("./server/_entitlement-admin");
const entitlementHandlerJs = fs.readFileSync(
  path.join(ROOT, "server/admin-entitlements.js"),
  "utf8"
);
const ADMIN_NOW = Date.parse("2026-10-31T00:00:00Z");
const GRANT_FUTURE = ADMIN_NOW + 30 * 86400000;

test("admin grant: target uid rejects empty and path separators", () => {
  assert.strictEqual(entitlementAdmin.validateTargetUid(" abc123 "), "abc123");
  assert.throws(() => entitlementAdmin.validateTargetUid(""), /uid is required/);
  assert.throws(() => entitlementAdmin.validateTargetUid("../users/x"), /invalid characters/);
});

test("admin grant: expiry must be future and within ten years", () => {
  assert.strictEqual(
    entitlementAdmin.validateGrantExpiry(new Date(GRANT_FUTURE).toISOString(), ADMIN_NOW),
    GRANT_FUTURE
  );
  assert.throws(() => entitlementAdmin.validateGrantExpiry(null, ADMIN_NOW), /expiresAt is required/);
  assert.throws(() => entitlementAdmin.validateGrantExpiry("not-a-date", ADMIN_NOW), /not a valid date/);
  assert.throws(
    () => entitlementAdmin.validateGrantExpiry(new Date(ADMIN_NOW - 1000).toISOString(), ADMIN_NOW),
    /must be in the future/
  );
  assert.throws(
    () => entitlementAdmin.validateGrantExpiry(ADMIN_NOW + 3651 * 86400000, ADMIN_NOW),
    /cannot be more than/
  );
});

test("admin grant: bonus chats are clamped and never silently dropped", () => {
  assert.strictEqual(entitlementAdmin.resolveBonusChats({ explicit: 999999 }), 500);
  assert.strictEqual(entitlementAdmin.resolveBonusChats({ explicit: -5 }), 0);
  assert.strictEqual(
    entitlementAdmin.resolveBonusChats({ entitlementData: { referralRewards: { bonusChats: 120 } } }),
    120
  );
  assert.strictEqual(
    entitlementAdmin.resolveBonusChats({ userData: { referralRewards: { bonusChats: 200 } } }),
    200
  );
  assert.strictEqual(
    entitlementAdmin.resolveBonusChats({
      explicit: 0,
      entitlementData: { referralRewards: { bonusChats: 120 } },
    }),
    0
  );
});

test("admin revoke: every Pro claim is stripped, admin claims preserved", () => {
  const stripped = entitlementAdmin.stripProClaims({
    admin: true,
    role: "admin",
    email: "admin@example.com",
    pro: true,
    proExpiresAt: "2027-01-01T00:00:00Z",
    proUntil: "2027-01-01T00:00:00Z",
    subscriptionExpiresAt: "2027-01-01T00:00:00Z",
  });
  assert.strictEqual(stripped.changed, true);
  assert.deepStrictEqual(stripped.removed.sort(), [
    "pro",
    "proExpiresAt",
    "proUntil",
    "subscriptionExpiresAt",
  ]);
  assert.strictEqual(stripped.claims.pro, undefined);
  assert.strictEqual(stripped.claims.proExpiresAt, undefined);
  assert.strictEqual(stripped.claims.admin, true);
  assert.strictEqual(stripped.claims.role, "admin");
  assert.strictEqual(stripped.claims.email, "admin@example.com");
  assert.strictEqual(entitlementAdmin.stripProClaims(null).changed, false);
});

test("admin revoke: reason is required and length-capped", () => {
  assert.throws(
    () => entitlementAdmin.validateReason("  ", { required: true }),
    /reason is required/
  );
  assert.throws(
    () => entitlementAdmin.validateReason("x".repeat(501)),
    /cannot exceed/
  );
  assert.strictEqual(entitlementAdmin.validateReason(" support request "), "support request");
});

test("admin endpoint is admin-gated, tombstones instead of deleting", () => {
  assert(entitlementHandlerJs.includes("await requireAdmin(req, res)"), "missing requireAdmin gate");
  assert(entitlementHandlerJs.includes('status: "revoked"'), "revocation must tombstone");
  assert(entitlementHandlerJs.includes("setCustomUserClaims"), "revocation must clear Pro claims");
  assert(entitlementHandlerJs.includes("entitlementAudit"), "missing audit log write");
  assert(!entitlementHandlerJs.includes(".delete()"), "entitlements must never be deleted");
});


// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: USAGE LIMITS & MODAL GATING
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 4] Usage Limits & Modal Gating (limits.js)");

const limitsJs = fs.readFileSync(path.join(ROOT, "limits.js"), "utf8");

test("limits.js: showUpgradeModal silently exits for Pro users (no modal for Pro)", () => {
  assert(
    limitsJs.includes('if (limitResult.plan === "pro" || limitResult.limit === Infinity) return;'),
    "showUpgradeModal missing Pro guard"
  );
});

test("limits.js: showLimitModal guards against showing modal for Pro users", () => {
  assert(
    limitsJs.includes('if (res.plan === "pro" || res.limit === Infinity)'),
    "showLimitModal missing Pro guard"
  );
});

test("limits.js: preCheckLimit clears limit lock and returns true for Pro users", () => {
  assert(
    limitsJs.includes('if (r.allowed || r.plan === "pro" || r.limit === Infinity)'),
    "preCheckLimit missing Pro unlock on lock check"
  );
  assert(
    limitsJs.includes('if (result.plan === "pro" || result.limit === Infinity)'),
    "preCheckLimit missing Pro unlock on result check"
  );
});

test("limits.js: upgrade modal CTA points to /subscription (clean URL, not .html)", () => {
  assert(limitsJs.includes('href="/subscription" class="aum-cta"'), "CTA link should be /subscription");
  assert(!limitsJs.includes('href="subscription.html"'), "Found legacy subscription.html link in limits.js");
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n" + "=" .repeat(60));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log("=" .repeat(60));

if (failed > 0) {
  process.exit(1);
}
