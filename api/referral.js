const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const crypto = require("crypto");

let cachedToken = null;
let tokenExpiry = 0;

async function getBearerToken() {
  const staticToken = process.env.FIREBASE_SERVICE_TOKEN;
  if (staticToken) return staticToken;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return null;
  if (cachedToken && Date.now() < tokenExpiry - 120000) return cachedToken;
  try {
    const key = JSON.parse(sa);
    if (!key.client_email || !key.private_key) return null;
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const jwtPayload = Buffer.from(JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })).toString("base64url");
    const pem = key.private_key.includes("\\n") ? key.private_key.replace(/\\n/g, "\n") : key.private_key;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(`${jwtHeader}.${jwtPayload}`), pem);
    const assertion = `${jwtHeader}.${jwtPayload}.${signature.toString("base64url")}`;
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`Token exchange failed (${resp.status}): ${errText}`);
      return null;
    }
    const data = await resp.json();
    cachedToken = data.access_token || null;
    tokenExpiry = now * 1000 + (data.expires_in || 3600) * 1000;
    return cachedToken;
  } catch (err) {
    console.error("getBearerToken error:", err.message);
    return null;
  }
}

const CHAR_SET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const GEN_RETRIES = 5;
const VERIFY_HOURS = 72;
const MAX_REF_DAILY = 20;
const FRAUD_COOLDOWN_MIN = 60;

const REWARD_TIERS = [
  { level: 1, minRefs: 1, bonusChats: 7, proDays: 0, quizDays: 0, badge: null },
  { level: 2, minRefs: 3, bonusChats: 15, proDays: 0, quizDays: 7, badge: null },
  { level: 3, minRefs: 5, bonusChats: 0, proDays: 30, quizDays: 0, badge: null },
  { level: 4, minRefs: 10, bonusChats: 0, proDays: 0, quizDays: 0, badge: "founder" },
  { level: 5, minRefs: 25, bonusChats: 0, proDays: 0, quizDays: 0, badge: "lifetime" },
  { level: 6, minRefs: 50, bonusChats: 0, proDays: 365, quizDays: 0, badge: "legend" },
];

const BADGES = {
  founder: { id: "founder", name: "Founder", desc: "One of the first 10 referrals", icon: "👑" },
  lifetime: { id: "lifetime", name: "Lifetime Member", desc: "Referred 25+ students", icon: "💎" },
  legend: { id: "legend", name: "Legend", desc: "Referred 50+ students", icon: "🏆" },
};

function genCode() {
  let c = "";
  for (let i = 0; i < CODE_LENGTH; i++) c += CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
  return c;
}

async function firestore(method, path, body) {
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!project) throw new Error("FIREBASE_PROJECT_ID not configured");
  const token = await getBearerToken();
  if (!token) throw new Error("Firebase auth failed. Check FIREBASE_SERVICE_ACCOUNT env var.");
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents${path}`;
  const resp = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    console.error(`Firestore ${method} ${path}: ${resp.status} ${errBody}`);
    throw new Error(`Firestore error ${resp.status}`);
  }
  return resp.json();
}

function docToObj(d) {
  if (!d?.fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(d.fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue) out[k] = v.timestampValue;
    else if (v.mapValue?.fields) out[k] = docToObj({ fields: v.mapValue.fields });
  }
  return out;
}

async function getUserDoc(uid) {
  try { return docToObj(await firestore("GET", `/${uid}`)); } catch { return null; }
}

async function getRefs() {
  try {
    const resp = await firestore("GET", "/referrals?pageSize=500");
    return (resp.documents || []).map(docToObj).filter(Boolean);
  } catch { return []; }
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["GET", "POST", "OPTIONS"])) return;
  if (!rateLimit(req, res, { name: "referral", limit: 30 })) return;
  const path = (req.query.path || "").toLowerCase();

  try {
    if (req.method === "GET" && path === "code") {
      const uid = req.query.uid;
      if (!uid) return res.status(400).json({ error: "uid required" });
      const user = await getUserDoc(`users/${uid}`);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.referralCode) {
        return res.json({ code: user.referralCode, link: `https://www.learningallied.world/signup?ref=${user.referralCode}` });
      }
      let code, existing;
      for (let i = 0; i < GEN_RETRIES; i++) {
        code = genCode();
        try { existing = await firestore("GET", `/referralCodes/${code}`); } catch { existing = null; }
        if (!existing) break;
        code = null;
      }
      if (!code) return res.status(500).json({ error: "Could not generate code" });
      const now = new Date().toISOString();
      await firestore("PATCH", `/referralCodes/${code}?updateMask.fieldPaths=uid&updateMask.fieldPaths=createdAt`, {
        fields: { uid: { stringValue: uid }, createdAt: { timestampValue: now } },
      });
      await firestore("PATCH", `/users/${uid}?updateMask.fieldPaths=referralCode`, {
        fields: { referralCode: { stringValue: code } },
      });
      return res.json({ code, link: `https://www.learningallied.world/signup?ref=${code}` });
    }

    if (req.method === "POST" && path === "claim") {
      const body = await readJsonBody(req);
      const { code, referredUid } = body;
      if (!code || !referredUid) return res.status(400).json({ error: "code and referredUid required" });
      const codeDoc = await getUserDoc(`referralCodes/${code.toUpperCase()}`);
      if (!codeDoc) return res.status(404).json({ error: "Invalid referral code" });
      const referrerId = codeDoc.uid;
      if (referrerId === referredUid) return res.status(403).json({ error: "Cannot refer yourself" });
      const referred = await getUserDoc(`users/${referredUid}`);
      if (!referred) return res.status(404).json({ error: "User not found" });
      const allRefs = await getRefs();
      if (allRefs.some(r => r.referredId === referredUid)) return res.status(400).json({ error: "Already referred" });
      const ref = { referrerId, referredId: referredUid, code: code.toUpperCase(), status: "pending", createdAt: new Date().toISOString() };
      const refResp = await firestore("POST", `/referrals`, { fields: Object.fromEntries(
        Object.entries(ref).map(([k, v]) => [k, typeof v === "number" ? { integerValue: v } : { stringValue: v }])
      ) });
      const refId = refResp.name?.split("/").pop();
      return res.json({ id: refId, status: "pending" });
    }

    if (req.method === "POST" && path === "verify") {
      const body = await readJsonBody(req);
      const { referralId } = body;
      if (!referralId) return res.status(400).json({ error: "referralId required" });
      const refData = await getUserDoc(`referrals/${referralId}`);
      if (!refData) return res.status(404).json({ error: "Referral not found" });
      if (refData.status !== "pending") return res.status(400).json({ error: `Already ${refData.status}` });
      const referred = await getUserDoc(`users/${refData.referredId}`);
      if (!referred) return res.status(404).json({ error: "Referred user not found" });
      if (!referred.emailVerified) return res.status(400).json({ error: "Email not verified" });
      const hoursSince = (Date.now() - new Date(referred.createdAt || Date.now()).getTime()) / 3600000;
      if (hoursSince > VERIFY_HOURS) return res.status(400).json({ error: "Verification window expired" });
      const allRefs2 = await getRefs();
      const totalRefs = allRefs2.filter(r => r.referrerId === refData.referrerId && (r.status === "verified" || r.status === "rewarded")).length + 1;
      const tier = REWARD_TIERS.filter(t => totalRefs >= t.minRefs).pop() || REWARD_TIERS[0];
      await firestore("PATCH", `/referrals/${referralId}?updateMask.fieldPaths=status&updateMask.fieldPaths=verifiedAt`, {
        fields: { status: { stringValue: "rewarded" }, verifiedAt: { timestampValue: new Date().toISOString() } },
      });
      await firestore("PATCH", `/users/${refData.referredId}?updateMask.fieldPaths=referralRewards.bonusChats`, {
        fields: { referralRewards: { mapValue: { fields: { bonusChats: { integerValue: 3 } } } } },
      });
      return res.json({ status: "rewarded", tier: tier.level, badge: tier.badge });
    }

    if (req.method === "GET" && path === "dashboard") {
      const uid = req.query.uid;
      if (!uid) return res.status(400).json({ error: "uid required" });
      const user = await getUserDoc(`users/${uid}`);
      if (!user) return res.status(404).json({ error: "User not found" });
      const refDocs = (await getRefs()).filter(r => r.referrerId === uid);
      const totalReferrals = refDocs.filter(r => r.status === "verified" || r.status === "rewarded").length;
      const pendingReferrals = refDocs.filter(r => r.status === "pending").length;
      const currentTier = REWARD_TIERS.filter(t => totalReferrals >= t.minRefs).pop() || null;
      const nextTier = REWARD_TIERS.filter(t => totalReferrals < t.minRefs)[0] || null;
      const earnedBadges = REWARD_TIERS.filter(t => t.badge && totalReferrals >= t.minRefs).map(t => BADGES[t.badge]).filter(Boolean);
      return res.json({
        referralCode: user.referralCode || null,
        totalReferrals,
        pendingReferrals,
        level: currentTier ? currentTier.level : 1,
        rewardTier: currentTier ? currentTier.level : 1,
        rewardTierName: currentTier && currentTier.badge ? BADGES[currentTier.badge]?.name : (currentTier ? `Level ${currentTier.level}` : "Level 1"),
        nextReward: nextTier,
        nextRewardAt: nextTier ? nextTier.minRefs - totalReferrals : null,
        badges: earnedBadges,
        referrals: refDocs.slice(0, 20).map(r => ({ id: r.referredId, status: r.status, createdAt: r.createdAt })),
      });
    }

    if (req.method === "GET" && path === "leaderboard") {
      const uid = req.query.uid;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const refs = await getRefs();
      const grouped = {};
      refs.forEach(r => {
        if (!r.referrerId || (r.status !== "verified" && r.status !== "rewarded")) return;
        grouped[r.referrerId] = (grouped[r.referrerId] || 0) + 1;
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, limit);
      let userRank = null;
      const userCount = grouped[uid] || 0;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i][0] === uid) { userRank = i + 1; break; }
      }
      return res.json({ leaderboard: sorted.map(([id, count]) => ({ uid: id, count })), userRank, userCount });
    }

    if (req.method === "GET" && path === "tiers") {
      return res.json({ tiers: REWARD_TIERS });
    }

    if (req.method === "GET" && path === "badges") {
      return res.json({ badges: Object.values(BADGES) });
    }

    return res.status(404).json({ error: "Unknown path" });
  } catch (err) {
    console.error(`Referral API error [${req.method} ${path}]:`, err.message);
    return sendError(req, res, err, err.message);
  }
};
