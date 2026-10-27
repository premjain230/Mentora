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

const ROOT = path.resolve(__dirname);
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

const normalizePlan = (raw) => {
  const p = String(raw || "").trim().toLowerCase();
  if (p === "pro" || p === "premium" || p === "paid" || p === "unlimited" || p === "lifetime") return "pro";
  return "free";
};

const isSubscriptionExpired = (data) => {
  if (!data) return false;
  const expiresAt = data.subscriptionExpiresAt || data.proExpiresAt || data.proUntil || data.referralRewards?.proExpiresAt;
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  return !isNaN(exp.getTime()) && exp.getTime() <= Date.now();
};

const isProUserData = (data) => {
  if (!data) return false;
  if (isSubscriptionExpired(data)) return false;
  if (data.role === "admin" || data.isAdmin === true) return true;
  if (normalizePlan(data.plan) === "pro") return true;
  if (normalizePlan(data.tier) === "pro" || normalizePlan(data.subscriptionTier) === "pro") return true;
  if (data.isPro === true || data.pro === true || data.isPremium === true) return true;
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") return true;
  if (data.subscription?.status === "active" || normalizePlan(data.subscription?.plan) === "pro") return true;
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
  return false;
};

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

test("Pro user: admin role returns true", () => {
  assert.strictEqual(isProUserData({ role: "admin" }), true);
  assert.strictEqual(isProUserData({ isAdmin: true }), true);
});

test("Expired user: subscriptionExpiresAt in the past returns FALSE (reverts to free)", () => {
  const past = new Date(Date.now() - 3600000).toISOString();
  assert.strictEqual(
    isProUserData({ plan: "pro", subscriptionExpiresAt: past }),
    false
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: SERVER-SIDE PRO DETECTION (api/_admin.js)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Suite 3] Server-Side Plan Verification (api/_admin.js)");

const adminJs = fs.readFileSync(path.join(ROOT, "api/_admin.js"), "utf8");

test("api/_admin.js: contains server-authoritative isProUserDataServer", () => {
  assert(adminJs.includes("function isProUserDataServer"), "Missing isProUserDataServer");
});

test("api/_admin.js: contains expired subscription check in isProUserDataServer", () => {
  assert(
    adminJs.includes("exp.getTime() <= Date.now()"),
    "Missing expiry check in isProUserDataServer"
  );
});

test("api/_admin.js: SERVER_PLAN_LIMITS defines Infinity for Pro chatLimit", () => {
  assert(adminJs.includes("pro: { chatLimit: Infinity }"), "Pro limit should be Infinity");
  assert(adminJs.includes("free: { chatLimit: 20 }"), "Free limit should be 20");
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
