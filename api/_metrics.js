// ─────────────────────────────────────────────────────────────
// Aquila Growth Agent — metric computations (shared).
// All numbers derive from real Firestore reads via the Admin SDK.
// Below-minimum samples are flagged, never padded.
// ─────────────────────────────────────────────────────────────

const {
  eventRange,
  visitorsFrom,
  usersCreated,
  activeDays,
  activatedUids,
  MIN_SAMPLE,
} = require("./_growth");

const DAY_MS = 86400000;

function parseWindow(query) {
  const now = new Date();
  const toRaw = query.to || now.toISOString().slice(0, 10);
  const to = new Date(toRaw + "T23:59:59.999Z");
  const fromRaw = query.from;
  const from = fromRaw
    ? new Date(fromRaw + "T00:00:00.000Z")
    : new Date(to.getTime() - 29 * DAY_MS);
  return { from, to };
}

function dayStr(d) {
  return d.toISOString().slice(0, 10);
}

function pct(part, whole) {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function convertedUids(events) {
  const set = new Set();
  for (const e of events) {
    const d = e.data() || {};
    if (d.uid && d.ev === "subscription_started") set.add(d.uid);
  }
  return set;
}

async function overview(from, to) {
  const [users, events, visitors] = await Promise.all([
    usersCreated(from, to),
    eventRange(from, to),
    visitorsFrom(from, to),
  ]);
  const signups = users.size;
  const out = {
    range: { from: dayStr(from), to: dayStr(to) },
    sample: { visitors: visitors.length, signups, events: events.length },
    insufficient: [],
    metrics: null,
  };
  if (signups < MIN_SAMPLE || events.length < MIN_SAMPLE) {
    out.insufficient.push(
      "Not enough data yet — check back once a few more days of activity accumulate."
    );
    return out;
  }
  const act = activatedUids(events);
  const adays = activeDays(events);
  let activated = 0;
  let returning = 0;
  for (const uid of users.keys()) {
    if (act.has(uid)) activated++;
    const days = adays.get(uid);
    if (days && days.size >= 2) returning++;
  }
  const converted = convertedUids(events).size;
  out.metrics = {
    visitors: visitors.length,
    signups,
    activated,
    returning,
    converted,
    activationRate: pct(activated, signups),
    returningRate: pct(returning, signups),
    conversionRate: pct(converted, signups),
    signupRate: pct(signups, visitors.length),
  };
  return out;
}

async function acquisition(from, to) {
  const [users, events, visitorsDocs] = await Promise.all([
    usersCreated(from, to),
    eventRange(from, to),
    visitorsFrom(from, to),
  ]);
  const byChannel = new Map();
  const keyOf = (s, m, c) => `${s || "(none)"} / ${m || "(none)"}${c ? " / " + c : ""}`;

  for (const doc of visitorsDocs) {
    const v = doc.data() || {};
    const utm = v.utm || {};
    const k = keyOf(utm.source, utm.medium, utm.campaign);
    if (!byChannel.has(k)) {
      byChannel.set(k, {
        source: utm.source || "(none)",
        medium: utm.medium || "(none)",
        campaign: utm.campaign || "",
        visitors: 0,
        signups: 0,
        activated: 0,
        returning: 0,
        converted: 0,
        signupUids: new Set(),
      });
    }
    const row = byChannel.get(k);
    row.visitors++;
    const linkedUid = v.signupUid || v.uid;
    if (linkedUid && users.has(linkedUid)) {
      row.signups++;
      row.signupUids.add(linkedUid);
    }
  }

  const act = activatedUids(events);
  const adays = activeDays(events);
  const conv = convertedUids(events);
  for (const row of byChannel.values()) {
    for (const uid of row.signupUids) {
      if (act.has(uid)) row.activated++;
      const days = adays.get(uid);
      if (days && days.size >= 2) row.returning++;
      if (conv.has(uid)) row.converted++;
    }
    delete row.signupUids;
    row.signupRate = pct(row.signups, row.visitors);
  }

  const totalSignups = [...byChannel.values()].reduce((s, r) => s + r.signups, 0);
  return {
    range: { from: dayStr(from), to: dayStr(to) },
    insufficient: totalSignups < MIN_SAMPLE ? "Not enough data yet." : null,
    channels: [...byChannel.values()].sort(
      (a, b) => b.signups - a.signups || b.visitors - a.visitors
    ),
  };
}

async function funnel(from, to) {
  const ov = await overview(from, to);
  if (ov.insufficient && ov.insufficient.length) {
    return { range: ov.range, insufficient: ov.insufficient[0], stages: null };
  }
  const m = ov.metrics;
  return {
    range: ov.range,
    insufficient: null,
    stages: [
      { stage: "Visitors", count: m.visitors },
      { stage: "Signups", count: m.signups, fromPrev: pct(m.signups, m.visitors), label: "visitor → signup" },
      { stage: "Activated", count: m.activated, fromPrev: pct(m.activated, m.signups), label: "signup → activated" },
      { stage: "Returning (≥2 days)", count: m.returning, fromPrev: pct(m.returning, m.activated), label: "activated → returning" },
      { stage: "Converted", count: m.converted, fromPrev: pct(m.converted, m.returning), label: "returning → converted" },
    ],
  };
}

async function retention(from, to) {
  const obsFrom = new Date(from.getTime() - 60 * DAY_MS);
  const end = new Date(to.getTime() + DAY_MS);
  const [users, events] = await Promise.all([
    usersCreated(obsFrom, end),
    eventRange(obsFrom, end),
  ]);
  const adays = activeDays(events);

  const cohortByWeek = new Map();
  const weekKey = (d) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    return dayStr(dt);
  };

  for (const [uid, data] of users) {
    const created = data.createdAt;
    const cd = created && (created.toDate ? created.toDate() : new Date(created));
    if (!cd || isNaN(cd.getTime())) continue;
    const wk = weekKey(cd);
    if (!cohortByWeek.has(wk)) cohortByWeek.set(wk, { cohort: wk, uids: new Set() });
    cohortByWeek.get(wk).uids.add(uid);
  }

  const rows = [];
  for (const [wk, c] of cohortByWeek) {
    const n = c.uids.size;
    if (n < MIN_SAMPLE) continue;
    const row = { cohort: wk, signups: n };
    for (const offset of [0, 1, 7, 30]) {
      const matured = new Date(wk + "T00:00:00.000Z").getTime() + offset * DAY_MS;
      if (isNaN(matured) || matured > to.getTime()) {
        row["d" + offset] = null;
        continue;
      }
      let active = 0;
      for (const uid of c.uids) {
        const days = adays.get(uid);
        if (!days) continue;
        for (let k = 0; k < offset + 1; k += 1) {
          const target = new Date(matured - (offset - k) * DAY_MS);
          if (days.has(dayStr(target))) {
            active++;
            break;
          }
        }
      }
      row["d" + offset] = { pct: pct(active, n), n: active };
    }
    rows.push(row);
  }

  return {
    range: { from: dayStr(from), to: dayStr(to) },
    insufficient:
      rows.length === 0
        ? "Not enough data yet — no signup cohorts of ≥" + MIN_SAMPLE + " users."
        : null,
    cohorts: rows.sort((a, b) => (a.cohort < b.cohort ? -1 : 1)),
  };
}

async function usersView(from, to) {
  const [users, events] = await Promise.all([
    usersCreated(from, to),
    eventRange(from, to),
  ]);
  const act = activatedUids(events);
  const adays = activeDays(events);
  const conv = convertedUids(events);

  const evCount = new Map();
  const lastSeen = new Map();
  for (const e of events) {
    const d = e.data() || {};
    if (!d.uid) continue;
    evCount.set(d.uid, (evCount.get(d.uid) || 0) + 1);
    if (!lastSeen.has(d.uid) || d.day > lastSeen.get(d.uid)) {
      lastSeen.set(d.uid, d.day);
    }
  }

  const list = [...users.entries()]
    .map(([uid, data]) => {
      const days = adays.get(uid);
      const cd = data.createdAt;
      const createdDate = cd && (cd.toDate ? cd.toDate() : new Date(cd));
      return {
        uid,
        email: data.email || "",
        name: data.displayName || data.name || "",
        exam: data.exam || "",
        plan: data.plan || "free",
        createdAt:
          createdDate && !isNaN(createdDate.getTime()) ? dayStr(createdDate) : "",
        lastSeen: lastSeen.get(uid) || null,
        events: evCount.get(uid) || 0,
        activated: act.has(uid),
        returning: (days && days.size) ? days.size >= 2 : false,
        converted: conv.has(uid),
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 300);

  return {
    range: { from: dayStr(from), to: dayStr(to) },
    insufficient: list.length < MIN_SAMPLE ? "Not enough data yet." : null,
    users: list,
  };
}

module.exports = {
  parseWindow,
  overview,
  acquisition,
  funnel,
  retention,
  usersView,
  pct,
  dayStr,
  MIN_SAMPLE,
};