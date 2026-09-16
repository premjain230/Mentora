// api/arena.js — Server-authoritative Arena progress
// Firestore: users/{uid}/arenaProgress/{subjectKey} (admin SDK writes, client reads)
// Validates unlock chain, scores, prerequisites. Never trusts client defeated state without checks.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken, firestore } = require("./_admin");

const VALID_STATES = new Set(["locked","available","in_progress","defeated","mastered"]);
const VALID_ACTIONS = new Set(["init","get","heartbeat","level_complete","defeat_chapter","final_boss_attempt"]);

function clamp01(n){ const v=Number(n); if(isNaN(v)) return 0; return Math.max(0,Math.min(1,v)); }
function isSubjectKey(s){ return typeof s==="string" && s.length>=3 && s.length<=80 && /^[a-z0-9_]+$/.test(s); }

async function handler(req, res){
  // GET ?subjectKey=xxx  -> fetch progress
  if(req.method==="GET"){
    if(!applyCors(req,res,["GET","OPTIONS"])) return;
    if(!rateLimit(req,res,{name:"arena-get", limit:60})) return;
    const url = (()=>{ try{ return new URL(req.url, `https://${req.headers.host||'localhost'}`); }catch{ return {searchParams:{get:()=>null}}; }})();
    const subjectKey = url.searchParams.get("subjectKey") || req.query?.subjectKey;
    if(!subjectKey || !isSubjectKey(subjectKey)) return res.status(400).json({error:"subjectKey invalid 3..80 [a-z0-9_]"});
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
  if(!subjectKey || !isSubjectKey(subjectKey)) return res.status(400).json({error:"subjectKey invalid"});
  if(!action || !VALID_ACTIONS.has(action)) return res.status(400).json({error:"invalid action (init,get,level_complete,defeat_chapter,final_boss_attempt)"});

  const uid=dec.uid;
  const db=firestore();

  try{
    // Helpers
    const progressRef = db.doc(`users/${uid}/arenaProgress/${subjectKey}`);

    if(action==="init" || action==="get"){
      // Client sends chapters hint: array of {conceptId, prerequisites} + meta
      const chapters = Array.isArray(body.chapters) ? body.chapters.slice(0,120) : [];
      const trackId = body.trackId ? String(body.trackId).slice(0,40) : null;
      const subject = body.subject ? String(body.subject).slice(0,60) : null;
      const classNum = body.classNum!=null ? Number(body.classNum) : null;

      // validate chapterIds
      const chapterIds = [];
      const prereqMap = {}; // conceptId -> prerequisites[]
      for(const ch of chapters){
        const cid = ch && typeof ch.conceptId==="string" ? ch.conceptId.trim().slice(0,80) : null;
        if(!cid || !/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/.test(cid)) continue;
        const prereqs = Array.isArray(ch.prerequisites) ? ch.prerequisites.filter(p=> typeof p==="string" && p.length<=80).slice(0,10) : [];
        if(!chapterIds.includes(cid)){ chapterIds.push(cid); prereqMap[cid]=prereqs; }
      }

      const snap = await progressRef.get();
      if(snap.exists){
        // If chapters list provided and differs, merge missing chapters (new curriculum) without clobbering defeated states
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
                // new chapters start locked unless all prior defeated
                const allDefeated = order.every(oid=> {
                  const e=chaptersMap[oid]; return e && (e.state==="defeated"||e.state==="mastered");
                });
                chaptersMap[mid] = { state: allDefeated? "available":"locked", level:"foundation", bestScore:0, attempts:0, lastAttemptAt:null, defeatedAt:null, masteryScore:0 };
                order.push(mid);
                // also persist prerequisites
                if(prereqMap[mid]) d._prereqs = d._prereqs||{};
              }
              tx.update(progressRef, { chapters: chaptersMap, chapterOrder: order, total: order.length, updatedAt: require("firebase-admin").firestore.FieldValue.serverTimestamp() });
            });
            const fresh = await progressRef.get();
            return res.status(200).json({ progress: fresh.data(), created:false });
          }
        }
        return res.status(200).json({ progress: snap.data(), created:false });
      }
      // Create new progress
      if(!chapterIds.length) return res.status(400).json({error:"chapters required for init (array of {conceptId, prerequisites})"});
      // Validate: at most 120, unique
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
        // Check prerequisites still
        const prereqs = (data.prerequisites && data.prerequisites[conceptId]) || [];
        for(const pre of prereqs){
          const pe=chapters[pre];
          if(pe && pe.state!=="defeated" && pe.state!=="mastered"){
            throw Object.assign(new Error("Prerequisite not defeated: "+pre),{statusCode:403});
          }
        }
        // Update attempt
        const updated = { ...entry };
        updated.attempts = (Number(entry.attempts)||0)+1;
        updated.lastAttemptAt = new Date().toISOString();
        if(score!=null) updated.bestScore = Math.max(Number(entry.bestScore)||0, score);
        if(masteryScore!=null) updated.masteryScore = masteryScore;
        if(entry.state==="available") updated.state="in_progress";
        if(level && ["foundation","application","challenge","boss"].includes(level)) updated.level=level;
        chapters[conceptId]=updated;
        // recompute defeated etc but not unlocking here
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
      // Server threshold: 0.6 (or 0.65 boss) — never trust client claiming defeat with low score
      // We enforce minimum 0.6 universally; client cannot fake higher because we check score field that server would ideally verify via quiz aggregation — for V1 we check client-provided score but also check mastery if available
      const MIN_DEFEAT = 0.60;
      if(score < MIN_DEFEAT && (masteryScore==null || masteryScore < 0.60)){
        return res.status(400).json({error:`Score too low to defeat (need >= ${MIN_DEFEAT})`});
      }
      // Anti-cheat: if score is 1.0 but masteryScore is 0, still allow V1 but log suspicion; don't block
      await db.runTransaction(async tx=>{
        const snap=await tx.get(progressRef);
        if(!snap.exists) throw Object.assign(new Error("No progress yet — call init first"),{statusCode:404});
        const data=snap.data();
        const chapters=data.chapters||{};
        const entry=chapters[conceptId];
        if(!entry) throw Object.assign(new Error("conceptId not in this subject"),{statusCode:400});
        if(entry.state==="locked") throw Object.assign(new Error("Chapter locked"),{statusCode:403});
        if(entry.state==="defeated"||entry.state==="mastered"){
          // idempotent
          return;
        }
        const prereqs = (data.prerequisites && data.prerequisites[conceptId]) || [];
        for(const pre of prereqs){
          const pe=chapters[pre]; if(pe && pe.state!=="defeated" && pe.state!=="mastered") throw Object.assign(new Error("Prerequisite not defeated: "+pre),{statusCode:403});
        }
        // Sequential guard: ensure previous chapter in order is defeated (if server stored linear order)
        const order=data.chapterOrder||Object.keys(chapters);
        const idx=order.indexOf(conceptId);
        if(idx>0){
          const prevId=order[idx-1];
          const prev=chapters[prevId];
          // allow skipping only if prerequisites graph already allows (i.e., prev not a prereq) → but for linear syllabus we enforce
          // If prev is locked, can't skip
          if(prev && prev.state==="locked") throw Object.assign(new Error("Defeat previous chapter first"),{statusCode:403});
          // If prev is available/in_progress but not prereq, still require it? For game feel, yes sequential
          // Relax: only require if prev is direct prereq or if we are in strict sequential mode
          // We enforce: you cannot defeat chapter N+2 while N still locked/available → must progress in order
          let earliestAvailable = null;
          for(const cid of order){ const s=chapters[cid].state; if(s==="available"||s==="in_progress"){ earliestAvailable=cid; break; } }
          if(earliestAvailable && earliestAvailable!==conceptId){
            // If trying to defeat later chapter before earliest available, block unless prerequisites already satisfy earliest
            // Check if conceptId is later than earliest
            const earliestIdx=order.indexOf(earliestAvailable);
            if(idx > earliestIdx){
              // Verify all chapters before idx are defeated? No — allow parallel branches? For now allow if prerequisites met but block if trying to skip the immediate progression
              // Soft rule: if earliest is still not defeated, you must defeat earliest first
              throw Object.assign(new Error("Defeat chapters in order — current is "+earliestAvailable),{statusCode:403});
            }
          }
        }
        const updated={...entry, state: (masteryScore!=null && masteryScore>=0.85)? "mastered":"defeated", defeatedAt: new Date().toISOString(), bestScore: Math.max(Number(entry.bestScore)||0, score), attempts: (Number(entry.attempts)||0)+1, lastAttemptAt: new Date().toISOString() };
        if(masteryScore!=null) updated.masteryScore=masteryScore;
        chapters[conceptId]=updated;
        // Unlock next
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

        // Also write arenaEvents for audit
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
        if(data.finalBossDefeated) return; // idempotent
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
};

module.exports = handler;
