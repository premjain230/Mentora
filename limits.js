// ── limits.js ──
// Drop this import into chat.js, analyze.js, planner.js.
// Call checkAndGate(uid, "chat"|"analysis"|"planner") before any AI action.
// If limit is reached, shows the upgrade modal and returns false.
// If allowed, increments usage and returns true.

import { checkLimitWithBonus, incrementUsage } from "./subscription.js";

// ─── Inject upgrade modal once ───────────────────────────────────────────────

function ensureModal() {
  if (document.getElementById("aquilaUpgradeModal")) return;

  const style = document.createElement("style");
  style.textContent = `
    #aquilaUpgradeModal {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(5, 6, 12, 0.82);
      backdrop-filter: blur(10px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s;
    }
    #aquilaUpgradeModal.open { opacity: 1; pointer-events: all; }
    .aum-card {
      background: #0f1117;
      border: 1px solid rgba(0,212,255,0.18);
      border-radius: 20px;
      padding: 36px 32px 32px;
      max-width: 440px; width: calc(100% - 32px);
      position: relative;
      box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,255,0.07);
      animation: aumSlide 0.3s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes aumSlide { from { transform: translateY(16px) scale(0.97); } to { transform: none; } }
    .aum-close {
      position: absolute; top: 16px; right: 16px;
      width: 30px; height: 30px; border-radius: 8px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: #8b8fa8; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .aum-close:hover { color: #f0f0f8; background: rgba(255,255,255,0.08); }
    .aum-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.28);
      color: #a78bfa; font-size: 11px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px; margin-bottom: 16px;
      font-family: 'Sora', sans-serif; letter-spacing: 0.3px;
    }
    .aum-title {
      font-size: 22px; font-weight: 800; letter-spacing: -0.4px;
      color: #f0f0f8; margin-bottom: 8px; font-family: 'Sora', sans-serif;
    }
    .aum-subtitle { font-size: 13.5px; color: #8b8fa8; line-height: 1.6; margin-bottom: 22px; font-family: 'Sora', sans-serif; }
    .aum-limit-bar {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;
    }
    .aum-limit-label { font-size: 12px; color: #8b8fa8; margin-bottom: 8px; font-family: 'Sora', sans-serif; }
    .aum-limit-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .aum-limit-name { font-size: 13px; color: #f0f0f8; font-weight: 500; font-family: 'Sora', sans-serif; }
    .aum-limit-num { font-size: 12px; color: #00d4ff; font-family: 'Space Mono', monospace; }
    .aum-progress { height: 5px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
    .aum-progress-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #00d4ff, #a78bfa); transition: width 0.4s; }
    .aum-perks { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 9px; }
    .aum-perk {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #c8cce0; font-family: 'Sora', sans-serif;
    }
    .aum-perk-icon {
      width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
      background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .aum-perk-icon svg { width: 11px; height: 11px; color: #00d4ff; }
    .aum-cta {
      width: 100%; padding: 13px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(167,139,250,0.15));
      border: 1px solid rgba(0,212,255,0.35);
      color: #00d4ff; font-size: 14px; font-weight: 600;
      font-family: 'Sora', sans-serif; cursor: pointer;
      transition: all 0.2s; text-align: center; display: block;
      text-decoration: none;
    }
    .aum-cta:hover { background: linear-gradient(135deg, rgba(0,212,255,0.22), rgba(167,139,250,0.22)); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,212,255,0.18); }
    .aum-secondary { margin-top: 10px; text-align: center; font-size: 12px; color: #4a4d62; font-family: 'Sora', sans-serif; }
    .aum-secondary a { color: #8b8fa8; text-decoration: none; }
    .aum-secondary a:hover { color: #00d4ff; }
  `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.id = "aquilaUpgradeModal";
  modal.innerHTML = `
    <div class="aum-card">
      <button class="aum-close" onclick="document.getElementById('aquilaUpgradeModal').classList.remove('open')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="aum-badge">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Limit Reached
      </div>
      <div class="aum-title" id="aumTitle">You've hit your daily limit</div>
      <div class="aum-subtitle" id="aumSubtitle">Upgrade to Learning Allied Pro for unlimited access — no payment needed during Early Access.</div>
      <div class="aum-limit-bar" id="aumLimitBar"></div>
      <ul class="aum-perks">
        <li class="aum-perk"><span class="aum-perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Unlimited AI Chats</li>
        <li class="aum-perk"><span class="aum-perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Unlimited AI Analyses</li>
        <li class="aum-perk"><span class="aum-perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Unlimited Study Planner</li>
        <li class="aum-perk"><span class="aum-perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Priority AI responses</li>
      </ul>
      <a href="subscription.html" class="aum-cta">✨ Request Pro Access — Free</a>
      <div class="aum-secondary">Limits reset every 24 hours. <a href="subscription.html">View your usage →</a></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });
}

// ─── Persisted limit lock (survives new chat + reload until next day) — dual-key for migration ─────────
function limitLockKey(uid, type) { return `learning-allied-limit_${type}_${uid}_${new Date().toISOString().slice(0,10)}`; }
function legacyLimitLockKey(uid, type) { return `aquila_limit_${type}_${uid}_${new Date().toISOString().slice(0,10)}`; }
function setLimitLock(uid, type) { try { localStorage.setItem(limitLockKey(uid, type), "1"); localStorage.setItem(legacyLimitLockKey(uid, type), "1"); } catch {} }
function isLimitLocked(uid, type) { try { return localStorage.getItem(limitLockKey(uid, type)) === "1" || localStorage.getItem(legacyLimitLockKey(uid, type)) === "1"; } catch { return false; } }
function clearLimitLock(uid, type) { try { localStorage.removeItem(limitLockKey(uid, type)); localStorage.removeItem(legacyLimitLockKey(uid, type)); } catch {} }

function setChatDisabled(disabled, msg) {
  const input = document.getElementById("chatInput");
  const send = document.getElementById("sendBtn");
  if (input) {
    input.disabled = disabled;
    input.placeholder = disabled ? (msg || "Daily limit reached — upgrade to continue") : "Ask Learning Allied anything — verified with web search...";
    input.style.opacity = disabled ? "0.6" : "";
  }
  if (send) {
    send.disabled = disabled;
    send.style.opacity = disabled ? "0.45" : "";
    send.style.pointerEvents = disabled ? "none" : "";
  }
}

// ─── Show upgrade modal with context ─────────────────────────────────────────

function showUpgradeModal(limitResult) {
  // Pro should never see the limit modal — silent return (fixes pro false-positive)
  if (limitResult.plan === "pro" || limitResult.limit === Infinity) return;
  ensureModal();
  const modal = document.getElementById("aquilaUpgradeModal");

  const labels = {
    chat: { name: "AI Chats", title: "Daily chat limit reached", sub: "You've used all 20 free AI chats today. Upgrade to Learning Allied Pro for unlimited conversations." },
    analysis: { name: "AI Analyses", title: "Daily analysis limit reached", sub: "You've used all 20 free AI analyses today. Upgrade for unlimited quiz analysis." },
    planner: { name: "Planner Time", title: "Daily planner limit reached", sub: "You've used your 30 minutes of free Study Planner time today. Upgrade for unlimited planning." },
  };

  const info = labels[limitResult.type] || labels.chat;
  const pct = limitResult.limit === Infinity ? 100 : Math.min(100, Math.round((limitResult.used / limitResult.limit) * 100));
  const limitDisplay = limitResult.limit === Infinity ? "∞" : limitResult.limit;

  document.getElementById("aumTitle").textContent = info.title;
  document.getElementById("aumSubtitle").textContent = info.sub;
  document.getElementById("aumLimitBar").innerHTML = `
    <div class="aum-limit-label">Your usage today</div>
    <div class="aum-limit-row">
      <span class="aum-limit-name">${info.name}</span>
      <span class="aum-limit-num">${limitResult.used} / ${limitDisplay}</span>
    </div>
    <div class="aum-progress"><div class="aum-progress-fill" style="width:${pct}%"></div></div>
  `;

  modal.classList.add("open");
  // Hard-disable chat input so "new chat" or refresh cannot bypass (persists via localStorage)
  if (limitResult.type === "chat" && limitResult.used != null) {
    try {
      const uid = limitResult.uid || (window.__learningAlliedUid || window.__aquila_uid || "");
      if (uid) setLimitLock(uid, limitResult.type);
    } catch {}
    setChatDisabled(true);
  }
}

// ─── Main gate function ───────────────────────────────────────────────────────
// Usage: const ok = await checkAndGate(uid, "chat");
// Returns true if action is allowed (and increments counter).
// Returns false if limit reached (shows modal).

export async function checkAndGate(uid, type) {
  const result = await checkLimitWithBonus(uid, type);
  if (!result.allowed) {
    showUpgradeModal(result);
    return false;
  }
  await incrementUsage(uid, type);
  return true;
}

// ─── Non-incrementing pre-check ───────────────────────────────────────────────
// Shows the upgrade modal when the limit is already reached, WITHOUT writing to
// Firestore. Server-side /api/groq-proxy is the source of truth; this is only a
// friendly early gate so users don't burn a request.

export async function preCheckLimit(uid, type) {
  // If we previously locked this uid/type today, keep it locked until new day (prevents new-chat bypass)
  try { window.__aquila_uid = window.__learningAlliedUid = uid; } catch {}
  if (isLimitLocked(uid, type)) {
    const r = await checkLimitWithBonus(uid, type);
    // If server now says allowed (e.g. upgraded to pro or new day), clear the lock and allow
    if (r.allowed || r.plan === "pro" || r.limit === Infinity) {
      clearLimitLock(uid, type);
      setChatDisabled(false);
      return true;
    }
    showUpgradeModal({ ...r, uid });
    return false;
  }
  const result = await checkLimitWithBonus(uid, type);
  // Pro / unlimited never blocked (fixes pro false-positive due to stale counts)
  if (result.plan === "pro" || result.limit === Infinity) {
    clearLimitLock(uid, type);
    setChatDisabled(false);
    return true;
  }
  if (!result.allowed) {
    showUpgradeModal({ ...result, uid });
    return false;
  }
  // still allowed — ensure input is enabled (covers case where user upgraded between chats)
  setChatDisabled(false);
  return true;
}

// ─── Display modal from a server-side 429 (limit_reached) ────────────────────

export function showLimitModal(result = {}) {
  const res = {
    type: result.type || "chat",
    allowed: false,
    plan: result.plan || "free",
    used: Number(result.used) || 0,
    limit: result.limit == null ? 20 : Number(result.limit),
    uid: result.uid || window.__learningAlliedUid || window.__aquila_uid || "",
  };
  // persist the lock immediately — even if the client never called preCheckLimit, the server 429 is authoritative
  try { if (res.uid) setLimitLock(res.uid, res.type); } catch {}
  setChatDisabled(true);
  showUpgradeModal(res);
}

// Expose helpers for chat.js new-chat hardening
export function isLimitLockedExport(uid, type) { return isLimitLocked(uid, type); }
export function clearLimitLockExport(uid, type) { return clearLimitLock(uid, type); }
export function setChatDisabledExport(v, msg) { return setChatDisabled(v, msg); }

// ─── Planner gate (minutes-based) ────────────────────────────────────────────
// Call at start of planner session with planned duration.

export async function checkPlannerGate(uid, minutesRequested = 1) {
  const result = await checkLimit(uid, "planner");

  if (!result.allowed) {
    showUpgradeModal(result);
    return false;
  }

  const { plan, used, limit } = result;
  if (limit !== Infinity && used + minutesRequested > limit) {
    showUpgradeModal({ ...result, used: limit, type: "planner" });
    return false;
  }

  await incrementUsage(uid, "planner", minutesRequested);
  return true;
}
