/**
 * Learning Allied Growth Agent — Admin dashboard client.
 *
 * Views (mirror the server API, see /api/admin and /api/admin/*):
 *   dashboard  → GET /api/admin?view=overview + view=acquisition
 *   acquisition→ GET /api/admin?view=acquisition
 *   funnel     → GET /api/admin?view=funnel
 *   retention  → GET /api/admin?view=retention
 *   users      → GET /api/admin?view=users
 *   content    → GET/POST /api/admin/content (+ /transition)
 *   compose    → POST /api/admin/content/generate + create
 *   publish    → transitions approve/schedule/publish
 *   settings   → GET/PUT /api/admin/settings
 *
 * Every request carries the Firebase ID token; the matching Vercel
 * Function enforces admin membership server-side (defense in depth).
 */

import { auth } from "../firebase-config.js";
import { apiUrl } from "../api-base.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmtNum = (n) =>
  n == null ? "–" : new Intl.NumberFormat("en-US", { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);

const pct = (n) => (n == null ? "–" : Number(n).toFixed(1) + "%");

const fmtDate = (v) => {
  if (!v) return "–";
  const d = v._seconds ? new Date(v._seconds * 1000) : new Date(v);
  return d.toISOString().slice(0, 10);
};

const DAY = 86400000;
function ago(days) { return new Date(Date.now() - days * DAY).toISOString().slice(0, 10); }

/* ---------- state ---------- */
let user = null;
let rangeDays = 30;
const route = () => location.hash.slice(1) || "dashboard";

/* ---------- api ---------- */
async function api(path, { method = "GET", body } = {}) {
  const token = user ? await user.getIdToken(true) : null;
  const resp = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const e = new Error(data.error || ("Request failed (" + resp.status + ")"));
    e.status = resp.status;
    throw e;
  }
  return data;
}

/* ---------- ui helpers ---------- */
function toast(msg, kind = "ok") {
  const t = document.createElement("div");
  t.className = "toast " + kind;
  t.textContent = msg;
  $("#toastWrap").appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function loader() { return `<div class="empty">Loading…</div>`; }
function empty(msg) { return `<div class="empty">${esc(msg)}</div>`; }

function kpi(lbl, val, sub, color) {
  return `<div class="card kpi"><div class="lbl">${esc(lbl)}</div>
    <div class="val ${color}">${val == null ? "–" : esc(fmtNum(val))}</div>
    <div class="sub">${esc(sub)}</div></div>`;
}

function channelRows(channels) {
  if (!channels || !channels.length) return empty("No attributed visitors yet.");
  return channels.map((c) => `
    <tr>
      <td>${esc(c.source || "(none)")}</td>
      <td>${esc(c.medium || "(none)")}</td>
      <td style="font-family:var(--mono);font-size:11px">${esc(c.campaign || "–")}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtNum(c.visitors)}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtNum(c.signups)}</td>
      <td style="text-align:right;font-family:var(--mono);color:var(--spark)">${c.signupRate != null ? c.signupRate + "%" : "–"}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtNum(c.activated)}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtNum(c.converted)}</td>
    </tr>`).join("");
}

/* ---------- auth gate ---------- */
function showGate(msg, needsLogin) {
  const g = $("#gate");
  g.style.display = "flex";
  const bt = $("#gateBtn");
  bt.style.display = needsLogin ? "inline-flex" : "none";
  $("#gateMsg").textContent = msg;
}

function showApp() {
  $("#gate").style.display = "none";
  $("#app").classList.add("on");
}

/* ---------- nav ---------- */
const NAV = [
  ["dashboard", "Dashboard", "M12 3v2m4.95.05l-1.41 1.41M21 12h-2M4.05 6.05l1.41 1.41M3 12h2m4 0a5 5 0 010 0m7-3h3m-3 0l-3 6H9l3-6"],
  ["acquisition", "Acquisition", "M12 12m-3 0a3 3 0 110 6 3 3 0 010-6zm7 -3a8 8 0 00-14 8h14a8 8 0 00-1-5h1z"],
  ["funnel", "Funnel", "M3 17l5-5 4 4 7-8M17 8h4v4"],
  ["retention", "Retention", "M21 12a9 9 0 11-9-9m9 9a9 9 0 01-9 9M12 4v8l4 3"],
  ["users", "Users", "M18 8a4 4 0 11-8 0 4 4 0 018 0zM6 20c0-3 2.7-5 6-5s6 2 6 5"],
  ["content", "Content", "M4 6h16M4 12h10M4 18h16"],
  ["compose", "Compose", "M12 20h9m-9-4l-2-1v-3l2-1v3zm0-4l2-1v-3l-2 1m0 0l2-1v3l-2 1z"],
  ["publish", "Publish", "M3 12l18-9-9 18-2-8-7-1z"],
  ["settings", "Settings", "M12 15a3 3 0 100-6 3 3 0 000 6zm8-3a8 8 0 01-.2 1.8l2 1.6-2 3.4-2.4-1a8 8 0 01-3 1.8L14 22h-4l-.4-2.4a8 8 0 01-3-1.8l-2.4 1-2-3.4 2-1.6A8 8 0 014 12c0-.6.1-1.2.2-1.8l-2-1.6 2-3.4 2.4 1a8 8 0 013-1.8L10 2h4l.4 2.4a8 8 0 013 1.8l2.4-1 2 3.4-2 1.6c.1.6.2 1.2.2 1.8z"],
];

function renderNav() {
  $("#nav").innerHTML = NAV.map(([key, label, icon]) => `
    <button class="nav-item ${route() === key ? "active" : ""}" data-nav="${key}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>
      ${label}
    </button>`).join("");
  $$("#nav .nav-item").forEach((b) => b.addEventListener("click", () => {
    location.hash = b.dataset.nav;
  }));
}

const rangeSelect = `<select id="rangeSel">
  ${[14, 30, 60, 90].map((d) => `<option value="${d}" ${d === rangeDays ? "selected" : ""}>last ${d} days</option>`).join("")}
</select>`;

async function rangeAndView(view) {
  const from = ago(rangeDays);
  const to = todayUtc();
  return await api(`/api/admin?view=${view}&from=${from}&to=${to}`);
}
function todayUtc() { return new Date().toISOString().slice(0, 10); }

/* ---------- views ---------- */
const VIEWS = {
  dashboard: viewDashboard,
  acquisition: viewAcquisition,
  funnel: viewFunnel,
  retention: viewRetention,
  users: viewUsers,
  content: viewContent,
  compose: viewCompose,
  publish: viewPublish,
  settings: viewSettings,
};

async function run(fn) {
  const main = $("#main");
  main.innerHTML = loader();
  try {
    await fn(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = empty(
      e.status === 403 ? "You don't have admin access for this action. " : (e.message || "Something went wrong.")
    );
    if (e.status === 403) toast("Admin access required", "err");
  }
}

function bindRange(toastLabel) {
  const sel = $("#rangeSel");
  if (!sel) return;
  sel.addEventListener("change", () => {
    rangeDays = Number(sel.value);
    toast(toastLabel);
    location.hash = "dashboard";
  });
}

/* ---------- dashboard ---------- */
async function viewDashboard(main) {
  if (main.dataset.noReload !== "1") bindRange("Range updated");
  const [ov, acq] = await Promise.all([
    rangeAndView("overview"),
    rangeAndView("acquisition"),
  ]);
  const insuff = ov.insufficient && ov.insufficient.length ? ov.insufficient[0] : null;
  const m = ov.metrics;
  main.innerHTML = `
  <div class="topbar">
    <div><h1>Dashboard</h1><div class="sub">Learning Allied growth performance — ${esc(ov.range && ov.range.from)} → ${esc(ov.range && ov.range.to)}</div></div>
    <div class="range">${rangeSelect}</div>
  </div>
  ${insuff ? `<div class="card"><div class="note" style="margin-top:0">${esc(insuff)}</div></div>` : ""}
  <div class="grid cols-4">
    ${kpi("Unique visitors", m ? m.visitors : null, "first-seen visitors in range", "blue")}
    ${kpi("Sign-ups", m ? m.signups : null, "accounts created in range", "violet")}
    ${kpi("Activation rate", m ? m.activationRate + "%" : null, "of signups that activated", "spark")}
    ${kpi("Sign-up rate", m ? m.signupRate + "%" : null, "visitor → sign-up", "green")}
  </div>
  <div class="card" style="margin-top:14px">
    <h3>Acquisition channels <span class="tag">ATTRIBUTED VISITORS</span></h3>
    <div style="overflow:auto">
    <table>
      <thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th style="text-align:right">Visitors</th><th style="text-align:right">Signups</th><th style="text-align:right">Signup %</th><th style="text-align:right">Activated</th><th style="text-align:right">Conv.</th></tr></thead>
      <tbody>${channelRows(acq.channels)}</tbody>
    </table>
    </div>
    ${acq.insufficient ? `<div class="note">${esc(acq.insufficient)}</div>` : ""}
  </div>`;
}

/* ---------- acquisition ---------- */
async function viewAcquisition(main) {
  const acq = await rangeAndView("acquisition");
  main.innerHTML = `
  <div class="topbar"><div><h1>Acquisition</h1><div class="sub">Where visitors come from and how they convert</div></div>
    <div class="range">${rangeSelect}</div></div>
  <div class="card" style="padding:0">
    <div style="overflow:auto">
    <table><thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th style="text-align:right">Visitors</th><th style="text-align:right">Signups</th><th style="text-align:right">Signup %</th><th style="text-align:right">Activated</th><th style="text-align:right">Returning</th><th style="text-align:right">Conv.</th></tr></thead>
    <tbody>${channelRows(acq.channels)}</tbody></table>
    </div>
  </div>
  ${acq.insufficient ? `<div class="note">${esc(acq.insufficient)}</div>` : ""}`;
  bindRange("Range updated");
}

/* ---------- funnel ---------- */
async function viewFunnel(main) {
  const d = await rangeAndView("funnel");
  main.innerHTML = `
  <div class="topbar"><div><h1>Conversion funnel</h1><div class="sub">${esc(d.range ? d.range.from + " → " + d.range.to : "")}</div></div>
    <div class="range">${rangeSelect}</div></div>
  ${d.insufficient ? `<div class="card"><div class="note" style="margin-top:0">${esc(d.insufficient)}</div></div>` : ""}
  ${d.stages ? `
  <div class="card">
    <div style="display:flex;flex-direction:column;gap:12px">
      ${d.stages.map((s, i) => {
        const base = d.stages[i - 1] ? d.stages[i - 1].count : d.stages[0].count;
        const width = base ? Math.max(4, Math.min(100, (s.count / base) * 100)) : 4;
        return `<div class="funnel-row">
          <div class="stage">${esc(s.stage)}</div>
          <div class="bar-track"><div class="bar-fill ${i >= 1 ? "violet" : ""}" style="width:${i === 0 ? "100" : width}%"></div></div>
          <div class="num">${fmtNum(s.count)}<span class="pct"> ${s.fromPrev != null ? " " + pct(s.fromPrev) : ""}</span></div>
        </div>`;
      }).join("")}
    </div>
  </div>` : ""}`;
  bindRange("Range updated");
}

/* ---------- retention ---------- */
async function viewRetention(main) {
  const d = await rangeAndView("retention");
  main.innerHTML = `
  <div class="topbar"><div><h1>Retention</h1><div class="sub">Weekly signup cohorts &amp; % active again by day</div></div>
    <div class="range">${rangeSelect}</div></div>
  ${d.insufficient ? `<div class="card"><div class="note" style="margin-top:0">${esc(d.insufficient)}</div></div>` : ""}
  ${d.cohorts && d.cohorts.length ? `
  <div class="card" style="padding:0;overflow:auto"><table>
    <thead><tr><th>Cohort</th><th>Signups</th><th>D0</th><th>D1</th><th>D7</th><th>D30</th></tr></thead>
    <tbody>${d.cohorts.map((c) => `
      <tr>
        <td style="font-family:var(--mono)">${esc(c.cohort)}</td>
        <td style="text-align:right">${fmtNum(c.signups)}</td>
        ${[0, 1, 7, 30].map((k) => {
          const v = c["d" + k];
          return v == null
            ? `<td style="text-align:right;color:var(--muted2)">–</td>`
            : `<td style="text-align:right;color:${v.pct >= 40 ? "var(--green)" : v.pct >= 15 ? "var(--spark)" : "#f87171"}">${pct(v.pct)} <span style="color:var(--muted2);font-size:10px">(${fmtNum(v.n)})</span></td>`;
        }).join("")}
      </tr>`).join("")}</tbody></table>
  </div>`
  : ""}`;
  bindRange("Range updated");
}

/* ---------- users ---------- */
async function viewUsers(main) {
  const d = await rangeAndView("users");
  main.innerHTML = `
  <div class="topbar"><div><h1>Users</h1><div class="sub">Accounts created in range with activity signals</div></div>
    <div class="range">${rangeSelect}</div></div>
  ${d.insufficient ? `<div class="note">${esc(d.insufficient)}</div>` : ""}
  <div class="card" style="padding:0;overflow:auto"><table>
    <thead><tr><th>User</th><th>Exam</th><th>Plan</th><th>Created</th><th>Last activity</th><th>Events</th><th>Activated</th><th>Returning</th><th>Conv.</th></tr></thead>
    <tbody>${
      d.users && d.users.length
        ? d.users.map((u) => `
          <tr>
            <td><b style="font-size:12.5px">${esc(u.name || "—")}</b>${u.email ? `<div style="color:var(--muted);font-size:11px">${esc(u.email)}</div>` : ""}</td>
            <td>${esc(u.exam || "—")}</td>
            <td><span class="pill" style="color:var(--blue)">${esc(u.plan || "free")}</span></td>
            <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(u.createdAt)}</td>
            <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(u.lastSeen || "–")}</td>
            <td style="text-align:right">${fmtNum(u.events)}</td>
            <td style="color:${u.activated ? "var(--green)" : "var(--muted2)"}">${u.activated ? "✅" : "·"}</td>
            <td style="color:${u.returning ? "var(--green)" : "var(--muted2)"}">${u.returning ? "✅" : "·"}</td>
            <td style="color:${u.converted ? "var(--green)" : "var(--muted2)"}">${u.converted ? "✅" : "·"}</td>
          </tr>`).join("")
        : `<tr><td colspan="9" style="text-align:center;color:var(--muted)">No users yet.</td></tr>`
    }</tbody></table>
  </div>`;
  bindRange("Range updated");
}

/* ---------- content ---------- */
const TYPE_LABELS = {
  shorts_script: "Shorts script", social: "Social post", educational: "Educational",
  blog: "Blog", email: "Email", hook: "Hooks", cta: "CTA variations",
};

function contentCard(it) {
  return `
  <tr>
    <td style="max-width:260px">
      <b style="font-size:12.5px">${esc(it.title || "Untitled")}</b>
      <div style="color:var(--muted);font-size:11px">${esc((it.type ? (TYPE_LABELS[it.type] || it.type) + " · " : "") + (it.audience || ""))}</div>
      ${it.body ? `<div style="color:var(--muted);font-size:11px;margin-top:3px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.body)}</div>` : ""}
    </td>
    <td><span class="pill ${esc(it.status)}">${esc(it.status)}</span></td>
    ${it.status === "scheduled" ? `<td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(fmtDate(it.publishAt))}</td>` : `<td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(fmtDate(it.publishedAt)) || "–"}</td>`}
    <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(fmtDate(it.createdAt))}</td>
    <td><div style="display:flex;gap:6px;flex-wrap:wrap">
      ${it.status === "draft" ? `<button class="btn sm ghost act" data-act="review" data-id="${it.id}">to review</button>` : ""}
      ${it.status === "review" ? `<button class="btn sm ghost act" data-act="approve" data-id="${it.id}">approve</button>` : ""}
      ${["approved"].includes(it.status) ? `<button class="btn sm ghost act" data-act="schedule" data-id="${it.id}">schedule</button>` : ""}
      ${["approved", "scheduled"].includes(it.status) ? `<button class="btn sm green act" data-act="publish" data-id="${it.id}">publish</button>` : ""}
      ${it.status !== "published" && it.status !== "archived" ? `<button class="btn sm ghost act" data-act="archive" data-id="${it.id}">archive</button>` : ""}
    </div></td>
  </tr>`;
}

async function fetchContent(status) {
  const d = await api(status ? `/api/admin/content?status=${status}` : "/api/admin/content");
  return d.items || [];
}

async function viewContent(main) {
  const items = await fetchContent();
  main.innerHTML = `
  <div class="topbar"><div><h1>Content pipeline</h1><div class="sub">All pieces and their lifecycle status</div></div></div>
  ${items.length ? `<div class="card" style="padding:0;overflow:auto"><table>
    <thead><tr><th>Piece</th><th>Status</th><th>Published / scheduled</th><th>Created</th><th>Actions</th></tr></thead>
    <tbody>${items.map(contentCard).join("")}</tbody></table></div>`
    : empty("Nothing yet. Head to Compose to draft the first piece.")
  }`;
  bindActions();
}

function bindActions() {
  $$(".act").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.id;
    const action = b.dataset.act;
    try {
      if (action === "schedule") {
        const when = prompt("Schedule publish date (YYYY-MM-DD):", ago(2));
        if (!when) return;
        await api(`/api/admin/content/${id}/transition`, { method: "POST", body: { action, publishAt: when + "T00:00:00Z" } });
      } else {
        await api(`/api/admin/content/${id}/transition`, { method: "POST", body: { action } });
      }
      toast("Moved → " + action);
      viewContent($("#main"));
    } catch (e) { toast(e.message, "err"); }
  }));
}

/* ---------- compose ---------- */
async function viewCompose(main) {
  const items = await fetchContent("draft");
  main.innerHTML = `
  <div class="topbar"><div><h1>Compose</h1><div class="sub">Draft content with the AI content studio, keep it editable, then send to review</div></div></div>
  <div class="card">
    <h3>Generate a draft <span class="tag">AI-DRAFT, NEVER SAVED UNTIL YOU CREATE</span></h3>
    <div style="display:grid;grid-template-columns:1fr 180px;gap:10px">
      <input id="gtopic" placeholder="Topic, e.g. “How to revise for Boards in 30 days”"/>
      <select id="gtype">${Object.keys(TYPE_LABELS).map((t) => `<option value="${t}">${esc(TYPE_LABELS[t])}</option>`).join("")}</select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
      <input id="gaudience" placeholder="Audience (e.g. ISC students)"/>
      <input id="ginstructions" placeholder="Extra instructions (optional)"/>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
      <button class="btn" id="gen">Generate draft</button>
      <button class="btn violet" id="create" disabled>Create draft</button>
      <span class="statusbar" id="genStatus"></span>
    </div>
    <textarea id="gdraft" rows="9" placeholder="The AI draft will appear here and stay editable. You control what gets saved." style="margin-top:12px"></textarea>
    <div style="margin-top:8px;display:flex;gap:8px">
      <input id="gtitle" placeholder="Title (set this before creating)" style="flex:1"/>
    </div>
  </div>
  <div class="card" style="margin-top:14px">
    <h3>Drafts <span class="tag">EDITABLE, IN PROGRESS</span></h3>
    <div id="drafts">
      ${items.length ? items.map((it) => `
        <div style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px;margin-bottom:10px">
          <b style="font-size:12.5px">${esc(it.title || it.type)}</b>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn sm ghost act" data-act="review" data-id="${it.id}">send to review</button>
            <button class="btn sm danger act" data-act="archive" data-id="${it.id}">archive</button>
          </div>
        </div>`).join("") : empty("No drafts yet — generate one above.")}
    </div>
  </div>`;

  const $g = { topic: $("#gtopic"), type: $("#gtype"), audience: $("#gaudience"), inst: $("#ginstructions"), draft: $("#gdraft"), title: $("#gtitle"), status: $("#genStatus"), create: $("#create") };

  $("#gen").addEventListener("click", async () => {
    const topic = $g.topic.value.trim();
    if (!topic) return toast("Give it a topic first", "err");
    $("#gen").disabled = true;
    $g.status.textContent = "Generating… (can take a minute)";
    try {
      const r = await api("/api/admin/content/generate", {
        method: "POST",
        body: { type: $g.type.value, topic, audience: $g.audience.value, instructions: $g.inst.value },
      });
      $g.draft.value = r.result || "";
      $g.create.disabled = false;
      $g.status.textContent = "Draft ready — review, tweak, then Create.";
    } catch (e) { $g.status.textContent = ""; toast(e.message, "err"); }
    finally { $("#gen").disabled = false; }
  });

  $("#create").addEventListener("click", async () => {
    const title = $g.title.value.trim() || $g.topic.value.trim();
    const body = $g.draft.value.trim();
    if (!title || !body) return toast("Add a title and a generated draft first", "err");
    try {
      await api("/api/admin/content", {
        method: "POST",
        body: { type: $g.type.value, title, body, audience: $g.audience.value, status: "draft" },
      });
      toast("Draft created");
      viewCompose($("#main"));
    } catch (e) { toast(e.message, "err"); }
  });

  bindActions();
}

/* ---------- publish ---------- */
async function viewPublish(main) {
  const all = await fetchContent();
  const ready = all.filter((i) => ["approved", "scheduled"].includes(i.status));
  main.innerHTML = `
  <div class="topbar"><div><h1>Publishing</h1><div class="sub">Approve → schedule → published. The daily cron flips due, admin-scheduled items to published. Nothing auto-publishes without approval.</div></div></div>
  ${ready.length ? ready.map((it) => `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><b style="font-size:13px">${esc(it.title || "Untitled")}</b>
          <span class="pill ${esc(it.status)}" style="margin-left:6px">${esc(it.status)}</span>
          <span class="pill" style="margin-left:4px">${esc(TYPE_LABELS[it.type] || it.type)}</span>
        </div>
        ${it.status === "scheduled" ? `<span class="statusbar">scheduled for ${esc(fmtDate(it.publishAt))}</span>` : ""}
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${it.status === "approved" ? `<button class="btn sm ghost act" data-act="schedule" data-id="${it.id}">schedule</button>` : ""}
        <button class="btn sm green act" data-act="publish" data-id="${it.id}">publish now</button>
        <button class="btn sm ghost act" data-act="archive" data-id="${it.id}">archive</button>
      </div>
    </div>`).join("")
    : empty("Nothing approved/scheduled yet. Move a piece through review → approve to see it here.")}
  <div class="note">V1 safe-by-design: publishing is an explicit admin action. Content can be syndicated to the GitHub blog later via the PR pipeline.</div>`;
  bindActions();
}

/* ---------- settings ---------- */
async function viewSettings(main) {
  const d = await api("/api/admin/settings");
  const s = d.settings || {};
  const caps = d.capabilities || {};
  main.innerHTML = `
  <div class="topbar"><div><h1>Settings</h1><div class="sub">Growth agent preferences &amp; capabilities</div></div></div>
  <div class="grid cols-2">
    <div class="card">
      <h3>Capabilities</h3>
      ${[["Groq (LLM)", caps.groq], ["Search API", caps.search], ["Cron secret", caps.cronSecret]].map(([n, v]) => `
        <div class="funnel-row"><div class="stage">${esc(n)}</div>
        <div class="bar-track"><div class="bar-fill ${v ? "green" : "red"}" style="width:${v ? "100" : "30"}%"></div></div>
        <div class="num">${v ? "ready" : "off"}</div></div>`).join("")}
      <div class="statusbar">Admin emails: ${esc((d.adminEmails || []).join(", "))}</div>
    </div>
    <div class="card">
      <h3>Growth preferences</h3>
      <label style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
        <input type="checkbox" id="autoAnalystDaily" ${s.autoAnalystDaily ? "checked" : ""} style="width:auto">
        <span><b>Daily auto-analyst</b><div style="color:var(--muted);font-size:11.5px">Run trend-scan + insights every morning (requires cron + LLM).</div></span>
      </label>
      <label style="display:block;margin-bottom:14px">
        <b>Attribution window (days)</b>
        <input type="number" id="attrWindow" value="${esc(s.attributionWindowDays || 45)}" min="7" max="180" style="margin-top:6px">
      </label>
      <label style="display:block;margin-bottom:16px">
        <b>Admin note</b>
        <textarea id="notes" rows="3" placeholder="Internal notes…">${esc(s.notes || "")}</textarea>
      </label>
      <button class="btn" id="saveSettings">Save settings</button>
    </div>
  </div>`;

  $("#saveSettings").addEventListener("click", async () => {
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: {
          autoAnalystDaily: $("#autoAnalystDaily").checked,
          attributionWindowDays: Number($("#attrWindow").value),
          notes: $("#notes").value,
        },
      });
      toast("Settings saved");
    } catch (e) { toast(e.message, "err"); }
  });
}

/* ---------- boot ---------- */
async function boot() {
  await run(VIEWS[route()]);
}

window.addEventListener("hashchange", () => {
  renderNav();
  run(VIEWS[route()]);
});

function logout() {
  auth.signOut().then(() => { location.href = "/home.html"; });
}

auth.onAuthStateChanged(async (u) => {
  user = u;
  if (!u) { showGate("Sign in with your Learning Allied account to open the growth console.", true); return; }
  try {
    const r = await api("/api/admin");
    if (!r || !r.ok) throw new Error("not authorized");
  } catch (e) {
    console.error("admin gate", e);
    const errMsg = e.message || "";
    const msg =
      e.status === 403
        ? "This account isn't an administrator. Ask the project owner to add your email to ADMIN_EMAILS (Vercel env, currently premjains106@gmail.com)."
        : /service account/i.test(errMsg)
          ? "Server setup issue: FIREBASE_SERVICE_ACCOUNT is not configured in Vercel environment variables."
          : ["Fetch failed", "Failed to fetch", "not authorized"].includes(errMsg)
            ? "Access check failed. If it persists, confirm the Vercel deployment succeeded and ADMIN_EMAILS / FIREBASE_SERVICE_ACCOUNT are set."
            : errMsg || "Access check failed.";
    showGate(msg, false);
    return;
  }
  const who = $("#whoAmI");
  who.textContent = user.email || user.uid;
  renderNav();
  showApp();
  boot();
});

$("#logout").addEventListener("click", logout);
$("#gateBtn").addEventListener("click", () => {
  const next = encodeURIComponent(location.pathname);
  location.href = "/login.html?next=" + next;
});