/* Learning Allied — Pro ring on navbar avatar
   Shows gradient ring around #topbarAvatar when user is on Pro plan.
   Detects Pro status from #planBadge or #userPlan text in sidebar.
   Load once per page: <script type="module" src="/js/pro-ring.js"></script> */

const html = document.documentElement;
const KEY = "la-plan";

function readPlan() {
  const badge = document.getElementById("planBadge");
  const label = document.getElementById("userPlan");
  if (!badge && !label) return null;
  const badgeShown = badge && getComputedStyle(badge).display !== "none";
  const text = (label && label.textContent || "").toLowerCase();
  const labelPro = /\bpro\b/.test(text) && !/\bfree\b/.test(text);
  return badgeShown || labelPro ? "pro" : "free";
}

function sync() {
  const plan = readPlan();
  if (!plan) return;
  html.dataset.plan = plan;
  try { localStorage.setItem(KEY, plan); } catch {}
}

// Apply immediately from localStorage to avoid flash
try { html.dataset.plan = localStorage.getItem(KEY) === "pro" ? "pro" : "free"; }
catch { html.dataset.plan = "free"; }

// Re-scan periodically as sidebar mounts asynchronously
let timer;
function startWatcher() {
  clearInterval(timer);
  timer = setInterval(() => {
    const plan = readPlan();
    if (!plan) return;
    html.dataset.plan = plan;
    try { localStorage.setItem(KEY, plan); } catch {}
  }, 300);
}
startWatcher();
sync();

// Re-scan on DOM mutations
try {
  new MutationObserver(() => {
    clearInterval(timer);
    timer = setInterval(() => {
      const plan = readPlan();
      if (!plan) return;
      html.dataset.plan = plan;
      try { localStorage.setItem(KEY, plan); } catch {}
    }, 300);
    sync();
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
} catch {}