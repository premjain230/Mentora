/** Graph helpers — pure render, no mastery writes. Same exports/signatures as before; styling lives in graphs.css. */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, Number(n) || 0));
const css = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;
const empty = (h, a, b = "") => `<div class="aq-empty" style="min-height:${h}px">${a}${b ? `<small>${b}</small>` : ""}</div>`;

export function renderMasteryRadial(container, masteryScore, evidenceStrength) {
  if (!container) return;
  const pct = Math.round(clamp(masteryScore) * 100), evs = clamp(evidenceStrength);
  const ev = evs < 0.35 ? "Limited" : evs < 0.7 ? "Adequate" : "Strong";
  container.innerHTML = `<div class="aq-radial-wrap"><div class="aq-radial" style="--p:${pct};--c:${masteryScore >= 0.75 ? "var(--g-hi)" : "var(--accent)"}" role="img" aria-label="Mastery ${pct} percent"><span>${pct}%</span></div><div><div class="aq-stat-title">Mastery estimate</div><div class="aq-stat-sub">Evidence: ${ev} (${Math.round(evs * 100)}%)</div><div class="aq-bar-track"><div class="aq-bar-fill" style="width:${pct}%"></div></div></div></div>`;
}

export function renderRetentionTimeline(container, reviews) {
  if (!container) return;
  const rows = [...(reviews || [])].sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt)).slice(0, 5);
  if (!rows.length) return void (container.innerHTML = empty(72, "Nothing due for review"));
  container.innerHTML = `<div class="aq-timeline">${rows.map(r => `<div class="aq-tl-row"><span class="aq-dot"></span><strong>${esc(r.conceptId)}</strong> · ${esc(r.reviewState)}<small>${r.nextReviewAt ? new Date(r.nextReviewAt).toLocaleDateString() : ""}</small></div>`).join("")}</div>`;
}

export function renderProgressSparkline(container, points) {
  if (!container) return;
  const w = 300, h = 60;
  if (!points || points.length < 2) return void (container.innerHTML = empty(h, "Not enough data"));
  const y = p => h - 4 - clamp(p) * (h - 8), x = i => (i / (points.length - 1)) * w;
  const line = points.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p)}`).join(" ");
  const id = "g" + Math.random().toString(36).slice(2, 7), last = points.length - 1;
  container.innerHTML = `<svg class="aq-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Mastery trend"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><path d="${line} L ${w} ${h} L 0 ${h} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

export function renderSubjectBars(container, subjectStats) {
  if (!container) return;
  if (!subjectStats || !subjectStats.length) return void (container.innerHTML = empty(72, "No subject data yet", "Quiz in any subject to build this"));
  const col = p => (p >= 75 ? "var(--g-hi)" : p >= 50 ? "var(--g-mid)" : "var(--g-low)");
  container.innerHTML = subjectStats.slice(0, 6).map(s => { const p = Math.round(clamp(s.pct, 0, 100));
    return `<div class="aq-bar-row"><div class="aq-bar-meta"><span class="aq-bar-name">${esc(s.name)}</span><span class="aq-bar-pct">${p}%</span></div><div class="aq-bar-track"><div class="aq-bar-fill" style="width:${p}%;background:${col(p)}"></div></div></div>`; }).join("");
}

export function renderScoreTrend(canvas, values, opts = {}) {
  if (!canvas || !values || !values.length) {
    const wrap = canvas?.parentElement;
    if (wrap) wrap.innerHTML = empty(140, "No trend yet", "Take a quiz and your score line appears here") + `<div class="aq-empty" style="padding:0"><a href="quiz.html">Take a quiz →</a></div>`;
    return;
  }
  if (values.length === 1) values = [values[0], values[0]];
  const accent = css("--accent", "#4cb8ee"), muted = css("--text-muted", "#6f7480"), grid = css("--border", "#23262d"), card = css("--bg-card", "#0e1013");
  const dpr = window.devicePixelRatio || 1, W = Math.max(260, Math.round(canvas.getBoundingClientRect().width || 300)), H = 120;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const pad = { top: 10, right: 10, bottom: 18, left: 32 }, cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom, n = values.length;
  const lo = Math.max(0, Math.min(...values) - 8), hi = Math.min(100, Math.max(...values) + 8), span = hi - lo || 1;
  const X = i => pad.left + (i / (n - 1)) * cw, Y = v => pad.top + ch - ((v - lo) / span) * ch;
  ctx.lineWidth = 1; ctx.strokeStyle = grid;
  [0, 1, 2, 3].forEach(k => { const y = pad.top + (ch * k) / 3; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke(); });
  const g = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch); g.addColorStop(0, accent + "2e"); g.addColorStop(1, accent + "00");
  ctx.beginPath(); values.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.lineTo(X(n - 1), pad.top + ch); ctx.lineTo(X(0), pad.top + ch); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = ctx.lineCap = "round";
  values.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
  values.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), 3, 0, 6.283); ctx.fillStyle = accent; ctx.fill(); ctx.strokeStyle = card; ctx.lineWidth = 1.5; ctx.stroke(); });
  ctx.fillStyle = muted; ctx.font = "10px 'Space Mono',monospace"; ctx.textAlign = "center";
  const labels = opts.labels && opts.labels.length === n ? opts.labels : null;
  values.forEach((_, i) => ctx.fillText(labels ? String(labels[i]).slice(0, 6) : `#${i + 1}`, X(i), H - 3));
  ctx.textAlign = "right"; ctx.fillText(Math.round(hi) + "%", pad.left - 6, pad.top + 8); ctx.fillText(Math.round(lo) + "%", pad.left - 6, pad.top + ch);
}

export function renderVolumeBars(container, dailySeconds) {
  if (!container) return;
  if (!dailySeconds || dailySeconds.every(v => !v)) return void (container.innerHTML = empty(56, "No volume yet", "Study daily to build volume"));
  const max = Math.max(1, ...dailySeconds), days = ["M", "T", "W", "T", "F", "S", "S"];
  container.innerHTML = `<div class="aq-vol">${dailySeconds.map((s, i) => `<div class="aq-vol-col"><div class="aq-vol-bar${s ? "" : " z"}" style="height:${Math.max(4, Math.round((s / max) * 46))}px"></div><span>${days[i] || i + 1}</span></div>`).join("")}</div>`;
}

export function renderStockChart(canvas, values, opts = {}) { return renderScoreTrend(canvas, values, opts); }