// api/learning-event.js
// Server-authoritative learning event pipeline.
// Client -> event (question_answered etc) -> server validates -> stores -> aggregates to mastery.
// Rejects forged mastery, enforces owner, idempotency via eventId.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken, firestore } = require("./_admin");

const ALLOWED_TYPES = new Set([
  "lesson_started","lesson_completed","question_answered","question_correct","question_incorrect",
  "quiz_started","quiz_completed","assessment_completed","hint_requested","explanation_requested",
  "mistake_detected","misconception_detected","topic_reviewed","study_session_started","study_session_completed",
  "goal_created","goal_completed","onboarding_started","onboarding_question_answered","onboarding_answered","onboarding_completed","diagnostic_started","diagnostic_answered","diagnostic_completed",
  "review_started","review_completed","recommendation_clicked","syllabus_uploaded"
]);
const ALLOWED_SOURCES = new Set(["quiz","study_session","diagnostic","chat","onboarding","self_report","syllabus", null, undefined]);

function clamp01(n){ const v=Number(n); if(isNaN(v)) return 0; return Math.max(0,Math.min(1,v)); }
const EVIDENCE_SOURCE_WEIGHTS = { diagnostic:1.0, quiz:0.90, study_session:0.65, chat:0.50, self_report:0.20, onboarding:0.20 };
function getSourceWeight(s){ const v=EVIDENCE_SOURCE_WEIGHTS[s]; return typeof v==="number"?v:0; }
function getHintFactor(h){ const n=Math.max(0,Math.min(20,Number(h)||0)); if(n===0) return 1.0; if(n===1) return 0.85; if(n===2) return 0.70; if(n===3) return 0.55; return 0.40; }
function getRecencyFactor(createdAt){
  try{
    let t; if(createdAt instanceof Date) t=createdAt; else if(createdAt && typeof createdAt.toDate==="function") t=createdAt.toDate(); else t=new Date(createdAt);
    if(isNaN(t.getTime())) return 1.0;
    const ageDays=(Date.now()-t.getTime())/(1000*60*60*24);
    if(ageDays<=7) return 1.0;
    if(ageDays<=30) return 0.90;
    if(ageDays<=90) return 0.75;
    if(ageDays<=180) return 0.60;
    return 0.45;
  }catch{ return 1.0; }
}
function normalizeConfidence(c){ if(c==null) return null; const n=Math.max(1,Math.min(5,Number(c))); return (n-1)/4; }
function masteryStateV2(score, evidenceStrength){
  const s=clamp01(score), e=clamp01(evidenceStrength);
  if(e<0.10) return "unknown";
  if(e<0.35){ if(s<0.30) return "emerging"; return "developing"; }
  if(s<0.30) return "emerging";
  if(s<0.50) return "developing";
  if(s<0.70) return "proficient";
  return "strong";
}

function validate(body){
  const errors=[];
  if(!body || typeof body!=="object") return ["body must be object"];
  if(typeof body.type!=="string" || !ALLOWED_TYPES.has(body.type)) errors.push("invalid type");
  if(body.conceptId!=null && (typeof body.conceptId!=="string" || body.conceptId.length>120)) errors.push("conceptId 120");
  if(body.subject!=null && (typeof body.subject!=="string" || body.subject.length>100)) errors.push("subject 100");
  if(body.topic!=null && (typeof body.topic!=="string" || body.topic.length>200)) errors.push("topic 200");
  if(body.source!=null && !ALLOWED_SOURCES.has(body.source)) errors.push("invalid source");
  if(body.sessionId!=null && (typeof body.sessionId!=="string" || body.sessionId.length>120)) errors.push("sessionId 120");
  if(body.questionId!=null && (typeof body.questionId!=="string" || body.questionId.length>120)) errors.push("questionId 120");
  if(body.eventId!=null && (typeof body.eventId!=="string" || body.eventId.length<3 || body.eventId.length>120)) errors.push("eventId 3..120");
  if(body.confidence!=null && (typeof body.confidence!=="number" || body.confidence<1 || body.confidence>5)) errors.push("confidence 1..5");
  if(body.payload!=null && typeof body.payload!=="object") errors.push("payload object");
  try{ if(body.payload && JSON.stringify(body.payload).length>4000) errors.push("payload too large"); }catch{}
  if(body.payload && body.payload.hintCount!=null && (typeof body.payload.hintCount!=="number" || body.payload.hintCount<0 || body.payload.hintCount>20)) errors.push("hintCount 0..20");
  if(body.masteryScore!=null || body.mastery!=null) errors.push("masteryScore not allowed");
  if(body.uid!=null) errors.push("uid not allowed (server derived)");
  return errors;
}

/* ── Arena — consolidated to stay within Vercel Hobby 12-function limit ──
   /api/arena is rewritten to /api/learning-event?route=arena (vercel.json) so this
   single function serves both learning events and arena. Keeps deployment on Hobby. */
const ARENA_VALID_ACTIONS = new Set(["init","get","heartbeat","level_complete","defeat_chapter","final_boss_attempt"]);
function isArenaSubjectKey(s){ return typeof s==="string" && s.length>=3 && s.length<=80 && /^[a-z0-9_]+$/.test(s); }
async function handleArena(req, res){
  // GET ?route=arena&subjectKey=xxx  -> fetch progress
  if(req.method==="GET"){
    if(!applyCors(req,res,["GET","OPTIONS"])) return;
    if(!rateLimit(req,res,{name:"arena-get", limit:60})) return;
    const url = (()=>{ try{ return new URL(req.url, `https://${req.headers.host||'localhost'}`); }catch{ return {searchParams:{get:()=>null}}; }})();
    const subjectKey = url.searchParams.get("subjectKey") || req.query?.subjectKey;
    if(!subjectKey || !isArenaSubjectKey(subjectKey)) return res.status(400).json({error:"subjectKey invalid 3..80 [a-z0-9_]"});
    const tok = (req.headers.authorization||"").startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : "";
    const dec = await verifyIdToken(tok);
    if(!dec||!dec.uid) return res.status(401).json({error:"Not authenticated"});
    try{
      const db=firestore();
      const snap=await db.doc(`users/${dec.uid}/arenaProgress/${subjectKey}`).get();
      if(!snap.exists) return res.status(404).json({error:"No progress yet"});
      return res.status(200).json({ progress: snap.data() });
    }catch(e){ return sendError(req,res,e,"Could not fetch arena progress"); }
  }
  if(!applyCors(req,res,["POST","OPTIONS"])) return;
  if(req.method!=="POST"){ res.setHeader("Allow","POST, GET"); return res.status(405).json({error:"Method not allowed"}); }
  if(!rateLimit(req,res,{name:"arena-post", limit:90})) return;
  const tok=(req.headers.authorization||"").startsWith("Bearer ") ? req.headers.authorization.slice(7).trim() : "";
  const dec=await verifyIdToken(tok);
  if(!dec||!dec.uid) return res.status(401).json({error:"Not authenticated"});
  let body; try{ body=await readJsonBody(req);}catch(e){ return sendError(req,res,e,"Invalid JSON");}
  const subjectKey = body.subjectKey ? String(body.subjectKey).trim() : null;
  const action = body.action ? String(body.action).trim() : null;
  if(!subjectKey || !isArenaSubjectKey(subjectKey)) return res.status(400).json({error:"subjectKey invalid"});
  if(!action || !ARENA_VALID_ACTIONS.has(action)) return res.status(400).json({error:"invalid action (init,get,level_complete,defeat_chapter,final_boss_attempt)"});
  const uid=dec.uid;
  const db=firestore();
  try{
    const progressRef = db.doc(`users/${uid}/arenaProgress/${subjectKey}`);
    if(action==="init" || action==="get"){
      const chapters = Array.isArray(body.chapters) ? body.chapters.slice(0,120) : [];
      const trackId = body.trackId ? String(body.trackId).slice(0,40) : null;
      const subject = body.subject ? String(body.subject).slice(0,60) : null;
      const classNum = body.classNum!=null ? Number(body.classNum) : null;
      const chapterIds = [];
      const prereqMap = {};
      for(const ch of chapters){
        const cid = ch && typeof ch.conceptId==="string" ? ch.conceptId.trim().slice(0,80) : null;
        if(!cid || !/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/.test(cid)) continue;
        const prereqs = Array.isArray(ch.prerequisites) ? ch.prerequisites.filter(p=> typeof p==="string" && p.length<=80).slice(0,10) : [];
        if(!chapterIds.includes(cid)){ chapterIds.push(cid); prereqMap[cid]=prereqs; }
      }
      const snap = await progressRef.get();
      if(snap.exists){
        if(chapterIds.length){
          const data = snap.data();
          const existingIds = new Set(data.chapterOrder || Object.keys(data.chapters||{}));
          const missing = chapterIds.filter(id=> !existingIds.has(id));
          if(missing.length && action==="init"){
            await db.runTransaction(async tx=>{
              const s = await tx.get(progressRef);
              if(!s.exists) return;
              const d=s.data();
              const chaptersMap = {...(d.chapters||{})};
              const order=[...(d.chapterOrder||[])];
              for(const mid of missing){
                const allDefeated = order.every(oid=> {
                  const e=chaptersMap[oid]; return e && (e.state==="defeated"||e.state==="mastered");
                });
                chaptersMap[mid] = { state: allDefeated? "available":"locked", level:"foundation", bestScore:0, attempts:0, lastAttemptAt:null, defeatedAt:null, masteryScore:0 };
                order.push(mid);
              }
              tx.update(progressRef, { chapters: chaptersMap, chapterOrder: order, total: order.length, updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp() });
            });
            const fresh = await progressRef.get();
            return res.status(200).json({ progress: fresh.data(), created:false });
          }
        }
        return res.status(200).json({ progress: snap.data(), created:false });
      }
      if(!chapterIds.length) return res.status(400).json({error:"chapters required for init (array of {conceptId, prerequisites})"});
      const chaptersMap = {};
      chapterIds.forEach((cid, idx)=>{
        chaptersMap[cid] = {
          state: idx===0 ? "available":"locked",
          level: "foundation",
          bestScore:0, attempts:0, lastAttemptAt:null, defeatedAt:null, masteryScore:0,
        };
      });
      const docData={
        subjectKey, trackId: trackId||null, subject: subject||null, classNum: isNaN(classNum)? null: classNum,
        chapters: chaptersMap,
        chapterOrder: chapterIds,
        prerequisites: prereqMap,
        total: chapterIds.length,
        defeated: 0,
        progressPct: 0,
        currentChapterId: chapterIds[0]||null,
        finalBossUnlocked: false,
        finalBossDefeated: false,
        finalBossScore: 0,
        createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
        updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
        arenaVersion: 1,
        uid,
      };
      await progressRef.set(docData);
      const fresh = await progressRef.get();
      return res.status(201).json({ progress: fresh.data(), created:true });
    }
    if(action==="level_complete" || action==="heartbeat"){
      const conceptId = body.conceptId ? String(body.conceptId).trim().slice(0,80) : null;
      const level = body.level ? String(body.level).trim().slice(0,20) : null;
      const score = body.score!=null ? clamp01(body.score) : null;
      const masteryScore = body.masteryScore!=null ? clamp01(body.masteryScore) : null;
      if(!conceptId) return res.status(400).json({error:"conceptId required"});
      if(score!=null && (score<0||score>1)) return res.status(400).json({error:"score 0..1"});
      await db.runTransaction(async tx=>{
        const snap = await tx.get(progressRef);
        if(!snap.exists) throw Object.assign(new Error("No progress yet — call init first"),{statusCode:404});
        const data=snap.data();
        const chapters=data.chapters||{};
        const entry=chapters[conceptId];
        if(!entry) throw Object.assign(new Error("conceptId not in this subject"),{statusCode:400});
        if(entry.state==="locked") throw Object.assign(new Error("Chapter locked — defeat prerequisites first"),{statusCode:403});
        const prereqs = (data.prerequisites && data.prerequisites[conceptId]) || [];
        for(const pre of prereqs){
          const pe=chapters[pre];
          if(pe && pe.state!=="defeated" && pe.state!=="mastered"){
            throw Object.assign(new Error("Prerequisite not defeated: "+pre),{statusCode:403});
          }
        }
        const updated = { ...entry };
        updated.attempts = (Number(entry.attempts)||0)+1;
        updated.lastAttemptAt = new Date().toISOString();
        if(score!=null) updated.bestScore = Math.max(Number(entry.bestScore)||0, score);
        if(masteryScore!=null) updated.masteryScore = masteryScore;
        if(entry.state==="available") updated.state="in_progress";
        if(level && ["foundation","application","challenge","boss"].includes(level)) updated.level=level;
        chapters[conceptId]=updated;
        let defeated=0; for(const id in chapters){ if(chapters[id].state==="defeated"||chapters[id].state==="mastered") defeated++; }
        const total = (data.chapterOrder||Object.keys(chapters)).length;
        const progressPct = total? Math.round(defeated/total*100):0;
        const order=data.chapterOrder||Object.keys(chapters);
        let current=null;
        for(const cid of order){ const s=chapters[cid].state; if(s==="available"||s==="in_progress"){ current=cid; break; } }
        if(!current && defeated===total) current=null;
        else if(!current && order.length){ let lastIdx=-1; order.forEach((cid,i)=>{ if(chapters[cid].state==="defeated"||chapters[cid].state==="mastered") lastIdx=i; }); if(lastIdx>=0 && lastIdx+1<order.length) current=order[lastIdx+1]; else current=order[0]||null; }
        tx.update(progressRef, { chapters, defeated, progressPct, currentChapterId: current, finalBossUnlocked: defeated===total && total>0, updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp() });
      });
      const fresh=await progressRef.get();
      return res.status(200).json({ progress: fresh.data() });
    }
    if(action==="defeat_chapter"){
      const conceptId = body.conceptId ? String(body.conceptId).trim().slice(0,80) : null;
      const score = body.score!=null ? clamp01(body.score) : 0;
      const masteryScore = body.masteryScore!=null ? clamp01(body.masteryScore) : null;
      if(!conceptId) return res.status(400).json({error:"conceptId required"});
      const MIN_DEFEAT = 0.60;
      if(score < MIN_DEFEAT && (masteryScore==null || masteryScore < 0.60)){
        return res.status(400).json({error:`Score too low to defeat (need >= ${MIN_DEFEAT})`});
      }
      await db.runTransaction(async tx=>{
        const snap=await tx.get(progressRef);
        if(!snap.exists) throw Object.assign(new Error("No progress yet — call init first"),{statusCode:404});
        const data=snap.data();
        const chapters=data.chapters||{};
        const entry=chapters[conceptId];
        if(!entry) throw Object.assign(new Error("conceptId not in this subject"),{statusCode:400});
        if(entry.state==="locked") throw Object.assign(new Error("Chapter locked"),{statusCode:403});
        if(entry.state==="defeated"||entry.state==="mastered"){
          return;
        }
        const prereqs = (data.prerequisites && data.prerequisites[conceptId]) || [];
        for(const pre of prereqs){
          const pe=chapters[pre]; if(pe && pe.state!=="defeated" && pe.state!=="mastered") throw Object.assign(new Error("Prerequisite not defeated: "+pre),{statusCode:403});
        }
        const order=data.chapterOrder||Object.keys(chapters);
        const idx=order.indexOf(conceptId);
        if(idx>0){
          let earliestAvailable = null;
          for(const cid of order){ const s=chapters[cid].state; if(s==="available"||s==="in_progress"){ earliestAvailable=cid; break; } }
          if(earliestAvailable && earliestAvailable!==conceptId){
            const earliestIdx=order.indexOf(earliestAvailable);
            if(idx > earliestIdx){
              throw Object.assign(new Error("Defeat chapters in order — current is "+earliestAvailable),{statusCode:403});
            }
          }
        }
        const updated={...entry, state: (masteryScore!=null && masteryScore>=0.85)? "mastered":"defeated", defeatedAt: new Date().toISOString(), bestScore: Math.max(Number(entry.bestScore)||0, score), attempts: (Number(entry.attempts)||0)+1, lastAttemptAt: new Date().toISOString() };
        if(masteryScore!=null) updated.masteryScore=masteryScore;
        chapters[conceptId]=updated;
        if(idx>=0 && idx+1<order.length){
          const nxtId=order[idx+1]; const nxt=chapters[nxtId];
          if(nxt && nxt.state==="locked") nxt.state="available";
        }
        let defeated=0; for(const id in chapters){ if(chapters[id].state==="defeated"||chapters[id].state==="mastered") defeated++; }
        const total=order.length; const progressPct=total?Math.round(defeated/total*100):0;
        let current=null;
        for(const cid of order){ const s=chapters[cid].state; if(s==="available"||s==="in_progress"){ current=cid; break; } }
        if(!current && defeated===total) current=null;
        const finalBossUnlocked = defeated===total && total>0;
        tx.update(progressRef, { chapters, defeated, progressPct, currentChapterId: current, finalBossUnlocked, updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp() });
        const eventId = `${Date.now()}_${conceptId}`.slice(0,120);
        const evRef = db.doc(`users/${uid}/arenaEvents/${eventId}`);
        tx.set(evRef, { eventId, uid, subjectKey, conceptId, type:"chapter_defeated", score, masteryScore: masteryScore??null, createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(), arenaVersion:1 });
      });
      const fresh=await progressRef.get();
      return res.status(200).json({ progress: fresh.data() });
    }
    if(action==="final_boss_attempt"){
      const score = body.score!=null ? clamp01(body.score) : 0;
      if(score < 0.7) return res.status(400).json({error:"Final boss requires >= 0.70"});
      await db.runTransaction(async tx=>{
        const snap=await tx.get(progressRef);
        if(!snap.exists) throw Object.assign(new Error("No progress yet"),{statusCode:404});
        const data=snap.data();
        if(!data.finalBossUnlocked) throw Object.assign(new Error("Final boss locked — defeat all chapters first"),{statusCode:403});
        if(data.finalBossDefeated) return;
        tx.update(progressRef, { finalBossDefeated: true, finalBossScore: score, updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp() });
        const eventId = `${Date.now()}_final_boss`.slice(0,120);
        tx.set(db.doc(`users/${uid}/arenaEvents/${eventId}`), { eventId, uid, subjectKey, type:"final_boss_defeated", score, createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(), arenaVersion:1 });
      });
      const fresh=await progressRef.get();
      return res.status(200).json({ progress: fresh.data() });
    }
    return res.status(400).json({error:"Unknown action"});
  }catch(e){
    const code = e.statusCode||500;
    if(code>=500) console.error("[arena] failed",e);
    return res.status(code).json({error: e.message||"Arena error"});
  }
}

module.exports = async function handler(req, res){
  // Support GET /api/learning-event?route=recommendations via rewrite /api/recommendations
  // and GET /api/learning-event?route=arena via rewrite /api/arena (Hobby 12-function consolidation)
  const url = (()=>{ try{ return new URL(req.url, `https://${req.headers.host||'localhost'}`); }catch{ return { searchParams:{ get:()=>null }}; }})();
  const route = url.searchParams.get("route") || req.query?.route;
  if(route==="arena") return handleArena(req,res);
  if(req.method==="GET" && route==="recommendations"){
    if(!applyCors(req, res, ["GET","OPTIONS"])) return;
    if(!rateLimit(req,res,{name:"recommendations", limit:30})) return;
    const authHeader2=req.headers.authorization||"";
    const token2=authHeader2.startsWith("Bearer ") ? authHeader2.slice(7).trim() : "";
    const decoded2=await verifyIdToken(token2);
    if(!decoded2||!decoded2.uid) return res.status(401).json({error:"Not authenticated"});
    const uid2=decoded2.uid;
    try{
      const db=firestore();
      const [profileSnap, masterySnap, reviewsSnap, misconSnap] = await Promise.all([
        db.doc(`users/${uid2}/learning/profile`).get(),
        db.collection(`users/${uid2}/mastery`).limit(50).get(),
        db.collection(`users/${uid2}/reviews`).limit(50).get(),
        db.collection(`users/${uid2}/misconceptions`).where('resolved','==',false).limit(20).get(),
      ]);
      const profile = profileSnap.exists ? profileSnap.data() : {};
      const masteryMap={}; masterySnap.forEach(d=> masteryMap[d.id]=d.data());
      const reviewsMap={}; reviewsSnap.forEach(d=> reviewsMap[d.id]=d.data());
      const misconceptions=[]; misconSnap.forEach(d=> misconceptions.push(d.data()));
      const conceptIds=new Set([...Object.keys(masteryMap), ...Object.keys(reviewsMap), ...misconceptions.map(m=>String(m.conceptId))]);
      if(conceptIds.size===0 && profile?.subjects?.length){
        for(const s of profile.subjects){ const cid=String(s).toLowerCase().replace(/[^a-z0-9]+/g,"_"); if(cid) conceptIds.add(cid); }
      }
      for(const wt of (profile?.weakTopics||[])){ const cid=String(wt).toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,60); if(cid) conceptIds.add(cid); }
      const URGENCY_MAP={overdue:1.00,due:0.85,practice:0.65,review_soon:0.45,not_ready:0.25,stable:0.05};
      const candidates=[];
      const misconceptionSet=new Set(misconceptions.map(m=>String(m.conceptId)));
      for(const cid of conceptIds){
        const mastery=masteryMap[cid]||{conceptId:cid, subject:cid.split("_")[0], topic:cid, masteryScore:0.5, evidenceStrength:0, recentIncorrectCount:0};
        const review=reviewsMap[cid]||{reviewState:"not_ready", priority:0};
        const subject=mastery.subject||review.subject||cid.split("_")[0];
        const topic=mastery.topic||review.topic||cid;
        const masteryScore=clamp01(mastery.masteryScore??0.5);
        const evidenceStrength=clamp01(mastery.evidenceStrength??review.evidenceStrength??0);
        const recentIncorrectCount=Number(mastery.recentIncorrectCount??review.recentIncorrectCount??0);
        const reviewState=review.reviewState||"not_ready";
        const reviewPriority=clamp01(review.priority??0);
        const hasMisconception=misconceptionSet.has(cid);
        let goalRelevance=0.2;
        const subjects=(profile?.subjects||[]).map(s=>String(s).toLowerCase());
        const prioritySubject=profile?.prioritySubject?String(profile.prioritySubject).toLowerCase(): (subjects[0]||null);
        if(prioritySubject && subject.toLowerCase()===prioritySubject) goalRelevance=1.0;
        else if(subjects.includes(subject.toLowerCase())) goalRelevance=0.5;
        const urgency=URGENCY_MAP[reviewState]??0.25;
        const weakness=1-masteryScore;
        const evidenceGap=1-evidenceStrength;
        let misconceptionRisk=clamp01(recentIncorrectCount/5);
        if(hasMisconception) misconceptionRisk=clamp01(misconceptionRisk+0.3);
        const score=clamp01(urgency*0.25 + weakness*0.25 + evidenceGap*0.15 + misconceptionRisk*0.15 + goalRelevance*0.10 + reviewPriority*0.10);
        let action="review";
        if(evidenceStrength<0.10) action="diagnostic";
        else if(evidenceStrength<0.35) action="learn";
        else if(reviewState==="overdue"||reviewState==="due") action="review";
        else if(masteryScore<0.45||recentIncorrectCount>=2) action="practice";
        else if(reviewState==="review_soon"||reviewState==="practice") action="practice";
        let reason="stable_maintenance";
        if(reviewState==="overdue") reason="overdue_review";
        else if(reviewState==="due") reason="due_review";
        else if(hasMisconception) reason="misconception_risk";
        else if(recentIncorrectCount>=2) reason="recent_mistakes";
        else if(evidenceStrength>=0.35 && masteryScore<0.45) reason="low_mastery";
        else if(evidenceStrength<0.35) reason="low_evidence";
        else if(goalRelevance>=0.8) reason="priority_goal";
        else if(reviewState==="review_soon") reason="review_soon";
        candidates.push({conceptId:cid, subject, topic, action, score, reason, masteryScore, evidenceStrength, reviewState, reviewPriority, recentIncorrectCount, misconceptionRisk, goalRelevance, urgency, generatedAt:new Date().toISOString()});
      }
      candidates.sort((a,b)=>{
        if(b.score!==a.score) return b.score-a.score;
        if(b.urgency!==a.urgency) return b.urgency-a.urgency;
        if(a.masteryScore!==b.masteryScore) return a.masteryScore-b.masteryScore;
        if(a.evidenceStrength!==b.evidenceStrength) return a.evidenceStrength-b.evidenceStrength;
        if(b.recentIncorrectCount!==a.recentIncorrectCount) return b.recentIncorrectCount-a.recentIncorrectCount;
        return String(a.conceptId).localeCompare(String(b.conceptId));
      });
      const perSubject={};
      const diversified=[];
      for(const c of candidates){
        const subj=String(c.subject||"").toLowerCase();
        perSubject[subj]=(perSubject[subj]||0);
        if(perSubject[subj] < 3){ diversified.push(c); perSubject[subj]++; }
        if(diversified.length>=5) break;
      }
      const recs=diversified.slice(0,5);
      return res.status(200).json({ recommendations: recs, nextBestAction: recs[0]||null });
    }catch(err){
      console.error("[recommendations] failed", err);
      return res.status(500).json({error:"Could not generate recommendations"});
    }
  }
  if(!applyCors(req, res, ["POST","OPTIONS"])) return;
  if(req.method!=="POST"){ res.setHeader("Allow","POST, GET"); return res.status(405).json({error:"Method not allowed"}); }
  if(!rateLimit(req,res,{name:"learning-event", limit:60})) return;

  const authHeader=req.headers.authorization||"";
  const token=authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded=await verifyIdToken(token);
  if(!decoded || !decoded.uid) return res.status(401).json({error:"Not authenticated"});

  let body;
  try{ body=await readJsonBody(req); } catch(err){ return sendError(req,res,err,"Invalid JSON body."); }

  const errors=validate(body);
  if(errors.length) return res.status(400).json({error: errors.join("; ")});

  const uid=decoded.uid;
  // sanitize conceptId — allow null, do not invent
  const conceptId = body.conceptId ? String(body.conceptId).trim().slice(0,120) : null;
  const subject = body.subject ? String(body.subject).trim().slice(0,100) : null;
  const topic = body.topic ? String(body.topic).trim().slice(0,200) : null;
  const source = body.source || null;
  const sessionId = body.sessionId || null;
  const questionId = body.questionId || null;
  const confidence = body.confidence!=null ? Math.min(5,Math.max(1,Number(body.confidence))) : null;
  const payload = body.payload && typeof body.payload==="object" ? body.payload : {};
  // payload hintCount preserved separately, do not treat as mastery
  const hintCount = payload.hintCount!=null ? Math.min(20,Math.max(0,Number(payload.hintCount))) : null;
  // eventId idempotency — if client supplies, use as doc id; else generate
  const eventId = body.eventId && typeof body.eventId==="string" && body.eventId.length>=3 ? body.eventId.trim().slice(0,120) : null;

  try{
    const db=firestore();
    const eventRef = eventId ? db.doc(`users/${uid}/learningEvents/${eventId}`) : db.collection(`users/${uid}/learningEvents`).doc();
    const id = eventRef.id;

    // idempotency — if doc exists, return existing without re-aggregating
    const existing = await eventRef.get();
    if(existing.exists){
      return res.status(200).json({ ok:true, eventId: id, deduped:true, mastery: null });
    }

    const eventDoc = {
      eventId: id,
      uid,
      type: body.type,
      conceptId,
      subject,
      topic,
      source,
      sessionId,
      questionId,
      payload: { ...payload, ...(hintCount!=null?{hintCount}:{}) },
      confidence,
      createdAt: db.constructor.FieldValue ? require("firebase-admin").firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
      learningSchemaVersion: 1,
    };

    // Use transaction to write event + aggregate mastery atomically (Prompt 5 weighted)
    await db.runTransaction(async (tx)=>{
      tx.set(eventRef, eventDoc);

      const isAnswered = ["question_answered","question_correct","question_incorrect","diagnostic_answered"].includes(body.type);
      // Normalize correctness from payload.correct (server truth) — not type alone
      let isCorrect = null;
      if(isAnswered){
        if(typeof payload.correct==="boolean") isCorrect = payload.correct;
        else if(body.type==="question_correct") isCorrect = true;
        else if(body.type==="question_incorrect") isCorrect = false;
      }
      const hasConcept = !!conceptId;

      if(isAnswered && hasConcept && isCorrect!==null){
        const masteryRef = db.doc(`users/${uid}/mastery/${conceptId}`);
        const masterySnap = await tx.get(masteryRef);
        const nowIso = new Date().toISOString();
        let mastery = masterySnap.exists ? masterySnap.data() : {
          uid,
          conceptId,
          subject: subject || "",
          topic: topic || "",
          masteryScore: 0.5,
          masteryState: "unknown",
          evidenceStrength: 0,
          attempts: 0,
          correct: 0,
          accuracy: 0,
          confidenceScore: 0,
          provisionalAccuracy: 0,
          recentIncorrectCount: 0,
          evidence: [],
          lastReviewed: null,
          nextReviewDue: null,
          updatedAt: nowIso,
          learningSchemaVersion: 1,
          masteryModelVersion: 2,
        };
        // Build new evidence item for weighted calc
        const newEvidenceItem = {
          eventId: id,
          type: body.type,
          source: source || "quiz",
          correct: isCorrect,
          hintCount: hintCount ?? 0,
          confidence: confidence,
          createdAt: new Date().toISOString(),
          at: new Date().toISOString(),
        };
        const existingEvidence = Array.isArray(mastery.evidence) ? mastery.evidence : [];
        // evidence window stores minimal needed for recalc
        const newEvidenceWindow = [newEvidenceItem, ...existingEvidence].slice(0,20);

        // Recalculate from window (bounded, deterministic)
        let sumW=0, sumWC=0;
        let confSum=0, confCount=0;
        for(const ev of newEvidenceWindow){
          const w = getSourceWeight(ev.source) * getHintFactor(ev.hintCount ?? 0) * getRecencyFactor(ev.createdAt || ev.at);
          if(w<=0) continue;
          const perf = ev.correct ? 1 : 0;
          sumW += w;
          sumWC += perf * w;
          if(ev.confidence!=null){ confSum += normalizeConfidence(ev.confidence) ?? 0.5; confCount++; }
        }
        let weightedCorrectness = sumW>0 ? sumWC / sumW : 0.5;
        let confidenceAdjustment = 0;
        if(confCount>0){ const avgConf = confSum / confCount; confidenceAdjustment = (avgConf - 0.5) * 0.10; }
        const rawMastery = clamp01(weightedCorrectness + confidenceAdjustment);
        const sampleFactor = Math.min(1, sumW / 3);
        const masteryScore = clamp01(0.5 * (1 - sampleFactor) + rawMastery * sampleFactor);
        const evidenceStrength = clamp01(sumW / 5);
        const masteryState = masteryStateV2(masteryScore, evidenceStrength);

        const attempts = (Number(mastery.attempts)||0)+1;
        const correct = (Number(mastery.correct)||0) + (isCorrect?1:0);
        const accuracy = attempts? correct/attempts : 0;
        let confidenceScore = mastery.confidenceScore;
        if(confidence!=null) confidenceScore = normalizeConfidence(confidence);

        // recentIncorrectCount: inspect latest 10 answered evidence (not quiz_started etc)
        const recentAnswered = newEvidenceWindow.filter(e=> ["question_answered","question_correct","question_incorrect","diagnostic_answered"].includes(e.type)).slice(0,10);
        const recentIncorrectCount = recentAnswered.filter(e=> e.correct===false).length;

        const updated = {
          uid,
          conceptId,
          subject: subject || mastery.subject || "",
          topic: topic || mastery.topic || "",
          masteryScore,
          masteryState,
          evidenceStrength,
          attempts,
          correct,
          accuracy,
          confidenceScore,
          provisionalAccuracy: accuracy,
          recentIncorrectCount,
          evidence: newEvidenceWindow,
          lastReviewed: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
          updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
          learningSchemaVersion: 1,
          masteryModelVersion: 2,
          weightedCorrectness,
          effectiveWeight: sumW,
          rawMastery,
        };
        tx.set(masteryRef, updated, { merge:true });

        // Misconception candidate: at least 3 recent incorrect AND at least 2 with meaningful weight >=0.5
        if(recentIncorrectCount>=3){
          let meaningful = 0;
          for(const ev of recentAnswered.slice(0,5)){
            if(ev.correct===false){
              const w = getSourceWeight(ev.source) * getHintFactor(ev.hintCount ?? 0) * getRecencyFactor(ev.createdAt || ev.at);
              if(w>=0.5) meaningful++;
            }
          }
          if(meaningful>=2){
            const miscId = conceptId + "_candidate";
            const miscRef = db.doc(`users/${uid}/misconceptions/${miscId}`);
            const miscSnap = await tx.get(miscRef);
            if(!miscSnap.exists){
              tx.set(miscRef, {
                misconceptionId: miscId,
                uid,
                conceptId,
                concept: topic || conceptId,
                misconception: `Repeated difficulty with ${topic||conceptId}`,
                correction: null,
                evidence: [{ eventId: id, at: new Date().toISOString() }],
                confidence: 0.5,
                recentIncorrectCount,
                evidenceEventIds: recentAnswered.filter(e=>e.correct===false).slice(0,3).map(e=>e.eventId),
                firstDetected: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
                lastDetected: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
                resolved: false,
                learningSchemaVersion: 1,
              });
            } else {
              tx.update(miscRef, {
                lastDetected: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
                confidence: Math.min(0.9, (miscSnap.data().confidence||0.5)+0.1),
                recentIncorrectCount,
                updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }

        // --- Retention / Review V1 ---
        if(hasConcept){
          const lastOutcome = isCorrect ? "correct" : "incorrect";
          const now = new Date();
          const reviewRef = db.doc(`users/${uid}/reviews/${conceptId}`);
          const reviewSnap = await tx.get(reviewRef);
          const existingReview = reviewSnap.exists ? reviewSnap.data() : null;
          const reviewCount = (Number(existingReview?.reviewCount)||0) + (isAnswered ? 1 : 0);
          // Reuse mastery values already computed (masteryScore, evidenceStrength, etc) else fallback
          const masteryScoreForReview = (typeof masteryScore !== 'undefined' ? masteryScore : (mastery?.masteryScore ?? 0.5));
          const evidenceStrengthForReview = (typeof evidenceStrength !== 'undefined' ? evidenceStrength : 0);
          // Actually use updated values from this transaction: masteryScore / evidenceStrength
          const intervalDays = calculateInterval({ masteryScore: masteryScoreForReview, evidenceStrength: evidenceStrengthForReview, recentIncorrectCount, lastOutcome, reviewCount });
          const lastReviewedIso = now.toISOString();
          const nextReviewAt = new Date(now.getTime() + intervalDays*24*60*60*1000).toISOString();
          const retentionScore = calculateRetentionScore({ masteryScore: masteryScoreForReview, evidenceStrength: evidenceStrengthForReview, attempts, recentIncorrectCount, lastReviewed: lastReviewedIso, now: now.toISOString() });
          const priority = calculatePriority({ masteryScore: masteryScoreForReview, evidenceStrength: evidenceStrengthForReview, recentIncorrectCount, nextReviewAt, now: now.toISOString() });
          const reviewState = deriveReviewState({ masteryScore: masteryScoreForReview, evidenceStrength: evidenceStrengthForReview, nextReviewAt, now: now.toISOString(), recentIncorrectCount, reviewCount });
          tx.set(reviewRef, {
            uid,
            conceptId,
            subject: subject || mastery?.subject || "",
            topic: topic || mastery?.topic || "",
            reviewState,
            priority,
            lastReviewed: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            nextReviewAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(), // will be overwritten with actual date via transaction? Use actual ISO for now, second field for determinism
            nextReviewAtIso: nextReviewAt,
            intervalDays,
            reviewCount,
            retentionScore,
            masteryScore: masteryScoreForReview,
            evidenceStrength: evidenceStrengthForReview,
            recentIncorrectCount,
            attempts,
            lastOutcome,
            lastSource: source,
            updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
            learningSchemaVersion: 1,
            reviewModelVersion: REVIEW_MODEL_VERSION,
          }, { merge: true });
        }
      }
    });

    return res.status(201).json({ ok:true, eventId: id, masteryUpdated: !!conceptId });
  }catch(err){
    console.error("[learning-event] failed", err);
    return sendError(req,res,err,"Could not record learning event.");
  }
};

function masteryStateFromScore(score){
  const n=Number(score)||0;
  if(n>=0.85) return "mastered";
  if(n>=0.70) return "proficient";
  if(n>=0.40) return "developing";
  if(n>0) return "learning";
  return "unseen";
}
// Retention V1 helpers (mirrors js/learning/retention-engine.js)
const REVIEW_MODEL_VERSION=1;
const RETENTION_CONFIG={ minIntervalDays:1, maxIntervalDays:30 };
function baseIntervalForMastery(s){
  const n=clamp01(s);
  if(n<=0.30) return 1;
  if(n<=0.45) return 2;
  if(n<=0.60) return 3;
  if(n<=0.75) return 7;
  if(n<=0.85) return 14;
  return 21;
}
function calculateInterval({masteryScore, evidenceStrength, recentIncorrectCount, lastOutcome, reviewCount}){
  let interval=baseIntervalForMastery(masteryScore);
  const es=clamp01(evidenceStrength);
  const factor=0.6+0.4*es;
  interval=Math.round(interval*factor);
  if(recentIncorrectCount>=3) interval=Math.min(interval,2);
  else if(recentIncorrectCount>=2) interval=Math.min(interval,3);
  if(lastOutcome==="correct") interval=Math.min(RETENTION_CONFIG.maxIntervalDays, Math.round(interval*1.6)+1);
  else if(lastOutcome==="incorrect") interval=Math.max(RETENTION_CONFIG.minIntervalDays, Math.round(interval*0.5));
  if(reviewCount>3 && lastOutcome==="correct") interval=Math.min(RETENTION_CONFIG.maxIntervalDays, interval+2);
  return Math.max(RETENTION_CONFIG.minIntervalDays, Math.min(RETENTION_CONFIG.maxIntervalDays, interval));
}
function calculateRetentionScore({masteryScore, evidenceStrength, attempts, recentIncorrectCount, lastReviewed, now}){
  const m=clamp01(masteryScore), e=clamp01(evidenceStrength);
  const base=m*(0.6+0.4*e);
  const bonus=attempts>=5?0.05:0;
  const penalty=Math.min(0.3, (recentIncorrectCount||0)*0.08);
  const recency=getRecencyFactor(lastReviewed||now);
  const raw=(base+bonus-penalty)*(0.7+0.3*recency);
  return clamp01(raw);
}
function calculatePriority({masteryScore, evidenceStrength, recentIncorrectCount, nextReviewAt, now}){
  const overdueDays=nextReviewAt? Math.max(0, (new Date(now)-new Date(nextReviewAt))/(1000*60*60*24)):0;
  const overdueFactor=clamp01(overdueDays/14);
  const weakness=clamp01(1-clamp01(masteryScore));
  const evidenceWeak=clamp01(1-clamp01(evidenceStrength));
  const recent=clamp01((recentIncorrectCount||0)/5);
  return clamp01(overdueFactor*0.30 + weakness*0.30 + evidenceWeak*0.15 + recent*0.20);
}
function deriveReviewState({masteryScore, evidenceStrength, nextReviewAt, now, recentIncorrectCount, reviewCount}){
  const es=clamp01(evidenceStrength);
  if(es<0.10) return "not_ready";
  if(clamp01(masteryScore)<0.45) return "practice";
  if(!nextReviewAt) return "review_soon";
  const nowMs=new Date(now).getTime(), nextMs=new Date(nextReviewAt).getTime();
  const diffDays=(nextMs-nowMs)/(1000*60*60*24);
  if(diffDays <= -3) return "overdue";
  if(diffDays <= 0) return "due";
  if(diffDays <= 2) return "review_soon";
  if(clamp01(masteryScore)>=0.75 && es>=0.70 && reviewCount>=2 && diffDays>7) return "stable";
  return "review_soon";
}
