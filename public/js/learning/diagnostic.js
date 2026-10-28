/**
 * Diagnostic Engine — selection, session lifecycle, result summary.
 * No mastery calculation here; events go via /api/learning-event.
 */
import { createDiagnosticSession } from "./contracts.js";
import { DIAGNOSTIC_BANK } from "./diagnostic-bank.js";
import { emitLearningEvent } from "./evidence.js";
import { getAdaptiveLearningPath, getPrerequisiteRisks } from "./curriculum-graph.js";
import { resolveConceptId } from "./curriculum-data.js";

export const DIAGNOSTIC_CONFIG = Object.freeze({ minQuestions:8, maxQuestions:15, defaultTarget:12 });

export function toConceptId(subject, topic){
  const c = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,60);
  const a=c(subject), b=c(topic);
  return b? `${a}_${b}` : a || null;
}

/**
 * Prioritize concepts for initial diagnostic:
 * 0) no evidence, 1) low evidenceStrength, 2) weak mastery, 3) recent misconception, 4) normal coverage
 * Inputs: profile {subjects, weakTopics}, masteryMap {conceptId->mastery}, misconceptions []
 */
export function prioritizeConcepts({ profile, masteryMap, misconceptions, scope }) {
  const subjects = scope?.subject ? [scope.subject] : (profile?.subjects?.length ? profile.subjects : ["Mathematics","Physics"]);
  const weakSet = new Set((profile?.weakTopics||[]).map(s=>String(s).toLowerCase()));
  const miscConcepts = new Set((misconceptions||[]).filter(m=>!m.resolved).map(m=>String(m.conceptId).toLowerCase()));
  // Build candidate concepts from bank filtered by scope
  let candidates = DIAGNOSTIC_BANK.filter(q=>{
    if(scope?.topic && q.topic!==scope.topic) return false;
    if(scope?.subject && q.subject!==scope.subject) return false;
    if(!scope?.subject && !subjects.includes(q.subject)) return false;
    return q.conceptId;
  });
  // Unique conceptIds
  const uniq = [...new Set(candidates.map(c=>c.conceptId))];
  const scored = uniq.map(cid=>{
    const resolved = resolveConceptId(cid);
    const m = masteryMap?.[resolved] || masteryMap?.[cid] || masteryMap?.[String(cid).toLowerCase()];
    let priority = 4;
    if(!m || m.attempts==null || m.attempts===0) priority=0;
    else if((Number(m.evidenceStrength)||0) < 0.35) priority=1;
    else if(Number(m.masteryScore) < 0.45) priority=2;
    else if(miscConcepts.has(String(resolved).toLowerCase()) || miscConcepts.has(String(cid).toLowerCase())) priority=3;
    // boost if weakTopics matches (check both raw and resolved)
    const isWeak = weakSet.has(String(resolved).toLowerCase()) || weakSet.has(String(cid).toLowerCase()) || weakSet.has(String(m?.topic||"").toLowerCase());
    if(isWeak) priority = Math.max(0, priority-1);
    return { conceptId:resolved, priority, evidenceStrength: Number(m?.evidenceStrength)||0, masteryScore: Number(m?.masteryScore)||0.5 };
  });
  scored.sort((a,b)=> a.priority!==b.priority ? a.priority-b.priority : a.evidenceStrength-b.evidenceStrength);
  return scored.map(s=>s.conceptId);
}

export function pickQuestions({ conceptOrder, count }) {
  const byConcept = {};
  for(const q of DIAGNOSTIC_BANK){
    const rid = resolveConceptId(q.conceptId);
    (byConcept[rid]=byConcept[rid]||[]).push(q);
  }
  // Also keep legacy keys for fallback
  for(const q of DIAGNOSTIC_BANK){
    (byConcept[q.conceptId]=byConcept[q.conceptId]||[]).push(q);
  }
  const picked=[];
  // Round-robin across prioritized concepts, one Q per concept first, then second round if needed
  let round=0;
  while(picked.length < count){
    let added=false;
    for(const cid of conceptOrder){
      const rid = resolveConceptId(cid);
      const pool = byConcept[rid] || byConcept[cid] || [];
      const idx = round;
      if(pool[idx] && !picked.find(p=>p.questionId===pool[idx].questionId)){
        picked.push(pool[idx]);
        added=true;
        if(picked.length>=count) break;
      }
    }
    if(!added) break;
    round++;
    if(round>5) break;
  }
  // Fill remaining from any bank if still short
  if(picked.length < count){
    for(const q of DIAGNOSTIC_BANK){
      if(picked.length>=count) break;
      if(!picked.find(p=>p.questionId===q.questionId) && conceptOrder.includes(q.conceptId)) continue;
      // allow fill from other subjects if scope broader
      if(!picked.find(p=>p.questionId===q.questionId)) picked.push(q);
    }
  }
  return picked.slice(0,count);
}

export async function createDiagnostic({ db, uid, subject, scope, masteryMap, profile, misconceptions }) {
  const conceptOrder = prioritizeConcepts({ profile, masteryMap, misconceptions, scope:{subject, topic: scope?.topic} });
  const target = Math.min(DIAGNOSTIC_CONFIG.maxQuestions, Math.max(DIAGNOSTIC_CONFIG.minQuestions, scope?.targetCount || DIAGNOSTIC_CONFIG.defaultTarget));
  const questions = pickQuestions({ conceptOrder, count: target });
  const diagnosticId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const session = createDiagnosticSession(uid, { sessionId: diagnosticId, subject: subject||scope?.subject||"", conceptIds: [...new Set(questions.map(q=>q.conceptId))], items: questions, status:"active" });
  // Persist to Firestore
  const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const ref = doc(db, "users", uid, "diagnostics", diagnosticId);
  await setDoc(ref, { diagnosticId, uid, subject: session.subject, scope: scope||null, status:"active", questionCount: questions.length, answeredCount:0, correct:0, incorrect:0, coverage: session.conceptIds, questionIds: questions.map(q=>q.questionId), startedAt: serverTimestamp(), learningSchemaVersion:1 });
  // Emit diagnostic_started
  try { await emitLearningEvent(db, uid, "diagnostic_started", { subject: session.subject, topic: scope?.topic||null, source:"diagnostic", sessionId: diagnosticId, payload:{ scope, targetQuestionCount: questions.length } }); } catch {}
  return { diagnosticId, questions, session };
}

export async function answerDiagnostic({ db, uid, diagnosticId, question, selectedAnswer, confidence }) {
  const isCorrect = String(selectedAnswer).trim().toUpperCase() === String(question.answer).trim().toUpperCase();
  const type = isCorrect ? "question_correct" : "question_incorrect";
  const resolvedCid = resolveConceptId(question.conceptId);
  // Primary events: question_correct/incorrect + question_answered — use resolved dot-notation ID to avoid duplicate mastery docs (P2-14)
  await emitLearningEvent(db, uid, type, { conceptId: resolvedCid, subject: question.subject, topic: question.topic, source:"diagnostic", sessionId: diagnosticId, questionId: question.questionId, payload:{ correct:isCorrect, hintCount:0, mode:"diagnostic", difficulty: question.difficulty }, confidence: confidence ?? null });
  await emitLearningEvent(db, uid, "question_answered", { conceptId: resolvedCid, subject: question.subject, topic: question.topic, source:"diagnostic", sessionId: diagnosticId, questionId: question.questionId, payload:{ correct:isCorrect, hintCount:0, mode:"diagnostic" }, confidence: confidence ?? null });
  await emitLearningEvent(db, uid, "diagnostic_answered", { conceptId: resolvedCid, subject: question.subject, topic: question.topic, source:"diagnostic", sessionId: diagnosticId, questionId: question.questionId, payload:{ correct:isCorrect, hintCount:0, difficulty: question.difficulty }, confidence: confidence ?? null });
  // Update diagnostics doc counters
  try {
    const { doc, updateDoc, increment, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(db, "users", uid, "diagnostics", diagnosticId);
    await updateDoc(ref, { answeredCount: increment(1), [isCorrect?"correct":"incorrect"]: increment(1), updatedAt: serverTimestamp() });
  } catch {}
  return isCorrect;
}

export async function completeDiagnostic({ db, uid, diagnosticId, correct, totalQ }) {
  const accuracy = totalQ? correct/totalQ : 0;
  try {
    const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await updateDoc(doc(db, "users", uid, "diagnostics", diagnosticId), { status:"completed", correct, totalQ, accuracy, completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch {}
  await emitLearningEvent(db, uid, "diagnostic_completed", { source:"diagnostic", sessionId: diagnosticId, payload:{ correct, totalQ, accuracy, scope:"diagnostic" } });
  
  // After diagnostic, get adaptive learning path for next steps
  try {
    const { doc: docFn, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const masterySnap = await getDoc(doc(db, "users", uid, "mastery"));
    const masteryMap = {};
    // We'd ideally load full masteryMap here, but for now just emit completion
  } catch {}
}

export async function abandonDiagnostic({ db, uid, diagnosticId }) {
  try {
    const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await updateDoc(doc(db, "users", uid, "diagnostics", diagnosticId), { status:"abandoned", updatedAt: serverTimestamp() });
  } catch {}
}

export function diagnosticResultSummary({ questions, answers }) {
  // answers: [{question, isCorrect}]
  const byConcept = {};
  for(const a of answers){
    const cid = a.question.conceptId;
    (byConcept[cid]=byConcept[cid]||{correct:0,total:0, topic:a.question.topic, subject:a.question.subject}).total++;
    if(a.isCorrect) byConcept[cid].correct++;
  }
  const strong=[], weak=[], needs=[];
  for(const [cid, s] of Object.entries(byConcept)){
    const acc = s.total? s.correct/s.total : 0;
    // evidenceStrength for single diagnostic is low (1/5=0.18 per our mastery engine) → will be developing cap; result uses accuracy bands with evidenceStrength caveat
    if(s.total>=2 && acc>=0.75) strong.push({conceptId:cid, ...s, acc});
    else if(s.total>=1 && acc<0.5) weak.push({conceptId:cid, ...s, acc});
    else needs.push({conceptId:cid, ...s, acc});
  }
  const totalCorrect = answers.filter(a=>a.isCorrect).length;
  return { total: answers.length, correct: totalCorrect, accuracy: answers.length? totalCorrect/answers.length:0, strong, weak, needs };
}