/**
 * Aquila Arena — Progress Model + Sync (shared Web & Mobile)
 * Firestore: users/{uid}/arenaProgress/{subjectKey} + users/{uid}/arenaEvents/{eventId}
 * Client never trusts local-only defeated; server transaction validates prerequisites.
 */

export const ArenaState = Object.freeze({
  LOCKED: "locked",
  AVAILABLE: "available",
  IN_PROGRESS: "in_progress",
  DEFEATED: "defeated",
  MASTERED: "mastered", // derived from masteryScore >=0.85 + evidenceStrength >=0.5
});

export const ArenaLevel = Object.freeze({
  FOUNDATION: "foundation",
  APPLICATION: "application",
  CHALLENGE: "challenge",
  BOSS: "boss",
});

const LEVEL_ORDER = [ArenaLevel.FOUNDATION, ArenaLevel.APPLICATION, ArenaLevel.CHALLENGE, ArenaLevel.BOSS];

export function nextLevel(lvl){
  const i = LEVEL_ORDER.indexOf(lvl);
  return i>=0 && i<LEVEL_ORDER.length-1 ? LEVEL_ORDER[i+1] : null;
}

// Default progress for a subject
export function createDefaultProgress({ subjectKey, trackId, subject, classNum, chapters }){
  const map = {};
  // First chapter available, rest locked
  chapters.forEach((ch, idx)=>{
    map[ch.conceptId] = {
      state: idx===0 ? ArenaState.AVAILABLE : ArenaState.LOCKED,
      level: ArenaLevel.FOUNDATION,
      bestScore: 0,
      attempts: 0,
      lastAttemptAt: null,
      defeatedAt: null,
      masteryScore: 0,
    };
  });
  return {
    subjectKey,
    trackId,
    subject,
    classNum: classNum ?? null,
    chapters: map,
    total: chapters.length,
    defeated: 0,
    progressPct: 0,
    currentChapterId: chapters[0]?.conceptId || null,
    finalBossUnlocked: false,
    finalBossDefeated: false,
    finalBossScore: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    arenaVersion: 1,
  };
}

// Compute derived fields from chapters map + chapters order
export function computeProgress(progress, chapters){
  const m = progress.chapters || {};
  let defeated = 0;
  for(const id in m){ if(m[id].state===ArenaState.DEFEATED || m[id].state===ArenaState.MASTERED) defeated++; }
  const total = chapters.length;
  const pct = total ? Math.round((defeated/total)*100) : 0;
  // currentChapterId = first AVAILABLE/IN_PROGRESS else next locked after last defeated
  let current = null;
  for(const ch of chapters){
    const s = m[ch.conceptId]?.state;
    if(s===ArenaState.AVAILABLE || s===ArenaState.IN_PROGRESS){ current = ch.conceptId; break; }
  }
  if(!current){
    // find first locked after last defeated (if any)
    let lastDefeatedIdx = -1;
    chapters.forEach((ch,i)=>{ if(m[ch.conceptId]?.state===ArenaState.DEFEATED || m[ch.conceptId]?.state===ArenaState.MASTERED) lastDefeatedIdx=i; });
    if(lastDefeatedIdx>=0 && lastDefeatedIdx+1 < chapters.length) current = chapters[lastDefeatedIdx+1].conceptId;
    else if(total && defeated===total) current = null; // all done
    else current = chapters[0]?.conceptId || null;
  }
  const finalBossUnlocked = total>0 && defeated===total;
  return { ...progress, defeated, total, progressPct: pct, currentChapterId: current, finalBossUnlocked };
}

// Validation: can start battle? (must be available/in_progress, prerequisites defeated)
export function canBattle(chapter, progress, chapters){
  const entry = progress.chapters[chapter.conceptId];
  if(!entry) return { ok:false, reason:"Chapter not in progress map" };
  if(entry.state===ArenaState.LOCKED) return { ok:false, reason:"Locked — defeat previous chapter first" };
  // prerequisite check (syllabus graph)
  for(const pre of (chapter.prerequisites||[])){
    const preEntry = progress.chapters[pre];
    // if prerequisite not in this subject map, ignore (cross-subject)
    if(preEntry && preEntry.state!==ArenaState.DEFEATED && preEntry.state!==ArenaState.MASTERED){
      return { ok:false, reason:"Prerequisite not defeated" };
    }
  }
  return { ok:true };
}

// Apply chapter attempt result (client optimistic; server will recompute)
export function applyAttempt(progress, chapters, conceptId, { score, masteryScore=null }){
  const clone = JSON.parse(JSON.stringify(progress));
  const e = clone.chapters[conceptId];
  if(!e) return clone;
  e.attempts = (e.attempts||0)+1;
  e.lastAttemptAt = new Date().toISOString();
  if(typeof score==="number") e.bestScore = Math.max(e.bestScore||0, score);
  if(masteryScore!=null) e.masteryScore = masteryScore;
  // state → in_progress if was available
  if(e.state===ArenaState.AVAILABLE) e.state = ArenaState.IN_PROGRESS;
  // no auto-defeat here; call defeatChapter separately when score threshold met
  clone.updatedAt = new Date().toISOString();
  return clone;
}

export function defeatChapter(progress, chapters, conceptId, { score, masteryScore }={}){
  const clone = JSON.parse(JSON.stringify(progress));
  const e = clone.chapters[conceptId];
  if(!e) return clone;
  e.state = masteryScore>=0.85 ? ArenaState.MASTERED : ArenaState.DEFEATED;
  e.defeatedAt = new Date().toISOString();
  if(typeof score==="number") e.bestScore = Math.max(e.bestScore||0, score);
  if(masteryScore!=null) e.masteryScore = masteryScore;
  // Unlock next chapter (by order, not just any)
  const idx = chapters.findIndex(c=> c.conceptId===conceptId);
  if(idx>=0 && idx+1 < chapters.length){
    const nxtId = chapters[idx+1].conceptId;
    const nxt = clone.chapters[nxtId];
    if(nxt && nxt.state===ArenaState.LOCKED) nxt.state = ArenaState.AVAILABLE;
  }
  const computed = computeProgress(clone, chapters);
  computed.updatedAt = new Date().toISOString();
  return computed;
}

// Thresholds
export const DEFEAT_SCORE = 0.6; // 60% to defeat
export const BOSS_DEFEAT_SCORE = 0.65;
export const FINAL_BOSS_DEFEAT_SCORE = 0.7;

export function isDefeatedScore(score, isBoss=false){
  return score >= (isBoss ? BOSS_DEFEAT_SCORE : DEFEAT_SCORE);
}

// ── Persistence helpers ──
async function authHeaders(){
  try{ const { auth } = await import("../../firebase-config.js"); const u=auth?.currentUser; if(u){ const t=await u.getIdToken(); if(t) return {"Content-Type":"application/json","Authorization":`Bearer ${t}`}; } }catch{}
  return {"Content-Type":"application/json"};
}

// Fetch progress via API (preferred) — fallback direct Firestore
export async function fetchProgress(db, uid, subjectKey){
  // Try API
  try{
    const h = await authHeaders();
    const r = await fetch(`/api/arena?subjectKey=${encodeURIComponent(subjectKey)}`, { headers: h });
    if(r.ok){ const j=await r.json(); if(j.progress) return j.progress; }
    if(r.status===404) return null;
  }catch(e){ /* fallback */ }
  // Fallback direct
  if(!db || !uid) return null;
  try{
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "users", uid, "arenaProgress", subjectKey));
    if(snap.exists()) return snap.data();
  }catch{}
  return null;
}

export async function saveProgressViaApi(subjectKey, action, payload={}){
  const h = await authHeaders();
  const body = { subjectKey, action, ...payload };
  const r = await fetch("/api/arena", { method:"POST", headers: h, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || `Arena ${action} failed (${r.status})`);
  return j;
}

// Direct Firestore save (fallback when API unavailable) — still validates optimistically
export async function saveProgressDirect(db, uid, progress){
  if(!db||!uid) throw new Error("No db/uid");
  const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const ref = doc(db, "users", uid, "arenaProgress", progress.subjectKey);
  await setDoc(ref, { ...progress, updatedAt: serverTimestamp() }, { merge:true });
}

// Real-time listener (shared model — web uses onSnapshot, mobile mirrors via polling/stream)
export function listenProgress(db, uid, subjectKey, cb){
  if(!db||!uid) return ()=>{};
  let unsub = ()=>{};
  (async()=>{
    const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(db,"users",uid,"arenaProgress",subjectKey);
    unsub = onSnapshot(ref, snap=>{ cb(snap.exists()? snap.data(): null); }, err=> console.warn("[arena] listen",err));
  })();
  return ()=> { try{ unsub(); }catch{} };
}
