/**
 * Recommendation Engine V1 — deterministic, evidence-aware, server-authoritative
 * Learner State -> Candidate Concepts -> Scoring -> Ranked Recommendations
 */
import { clamp01 } from "./schema.js";
import { getPrerequisiteRisks, getAdaptiveLearningPath } from "./curriculum-graph.js";

export const REASON_PRIORITY = ["overdue_review","due_review","misconception_risk","recent_mistakes","low_mastery","low_evidence","priority_goal","review_soon","stable_maintenance"];

const URGENCY_MAP = {
  overdue: 1.00,
  due: 0.85,
  practice: 0.65,
  review_soon: 0.45,
  not_ready: 0.25,
  stable: 0.05,
};

const REASON_EXPLANATIONS = {
  overdue_review: "This topic is overdue for review.",
  due_review: "This topic is due for review.",
  misconception_risk: "Review this concept — repeated errors suggest a misconception.",
  recent_mistakes: "Practice this concept because recent answers show difficulty.",
  low_mastery: "Practice this concept — mastery is still low despite sufficient evidence.",
  low_evidence: "Learn this concept because Learning Allied does not have enough evidence yet.",
  priority_goal: "Priority for your current goals.",
  review_soon: "Review soon to keep this fresh.",
  stable_maintenance: "Stable — no urgent action needed.",
  prerequisite_blocked: "Prerequisite concept needs attention first.",
};

function getUrgency(reviewState){
  return URGENCY_MAP[reviewState] ?? 0.25;
}
function getGoalRelevance(concept, profile){
  const subjects = (profile?.subjects||[]).map(s=>String(s).toLowerCase());
  const prioritySubject = profile?.prioritySubject ? String(profile.prioritySubject).toLowerCase() : (profile?.subjects?.[0] ? String(profile.subjects[0]).toLowerCase() : null);
  const subj = String(concept.subject||concept.subjectId||"").toLowerCase();
  const topic = String(concept.topic||"").toLowerCase();
  // priority subject
  if(prioritySubject && subj===prioritySubject) return 1.0;
  // goal-related: check goals array for subject/topic match
  const goals = profile?.goals || [];
  for(const g of goals){
    const gs = String(g.subject||g.title||"").toLowerCase();
    if(gs && (subj.includes(gs) || gs.includes(subj) || topic.includes(gs))) return 0.8;
  }
  if(subjects.includes(subj)) return 0.5;
  return 0.2;
}

function chooseAction({ masteryScore, evidenceStrength, reviewState, recentIncorrectCount, prerequisiteBlocked = false }){
  // Evidence-aware safety: low evidence + low mastery => needs evidence, not proven weak
  if(evidenceStrength < 0.10) return "diagnostic";
  if(evidenceStrength < 0.35) return "learn";
  if(reviewState==="overdue" || reviewState==="due") return "review";
  if(prerequisiteBlocked) return "learn"; // Blocked by prerequisites -> learn prerequisites first
  if(masteryScore < 0.45 || recentIncorrectCount >=2) return "practice";
  if(evidenceStrength < 0.35) return "learn";
  if(reviewState==="review_soon" || reviewState==="practice") return "practice";
  return "review";
}

function chooseReason({ masteryScore, evidenceStrength, reviewState, recentIncorrectCount, hasMisconception, goalRelevance, prerequisiteBlocked = false }){
  // priority order
  if(reviewState==="overdue") return "overdue_review";
  if(reviewState==="due") return "due_review";
  if(prerequisiteBlocked) return "prerequisite_blocked";
  if(hasMisconception) return "misconception_risk";
  if(recentIncorrectCount >=2) return "recent_mistakes";
  if(evidenceStrength >=0.35 && masteryScore <0.45) return "low_mastery";
  if(evidenceStrength <0.35) return evidenceStrength <0.10 ? "low_evidence" : "low_evidence";
  if(goalRelevance >=0.8) return "priority_goal";
  if(reviewState==="review_soon") return "review_soon";
  return "stable_maintenance";
}

/**
 * Generate ranked recommendations from learner state.
 * @param {Object} opts { masteryMap, reviewsMap, misconceptions, profile, limit }
 * @returns {Array} recommendations sorted, diversity capped 3 per subject
 */
export function getRecommendations({ masteryMap={}, reviewsMap={}, misconceptions=[], profile={}, limit=5 } = {}){
  limit = Math.max(1, Math.min(10, Number(limit)||5));
  const candidates = [];
  const misconceptionSet = new Set((misconceptions||[]).filter(m=>!m.resolved).map(m=>String(m.conceptId)));

  // Build candidate concepts: all mastery keys + review keys + misconception concepts + profile subjects (for new learner)
  const conceptIds = new Set([...Object.keys(masteryMap), ...Object.keys(reviewsMap), ...misconceptionSet]);
  // For new learner empty, add profile subjects as diagnostic candidates
  if(conceptIds.size===0 && profile?.subjects?.length){
    for(const subj of profile.subjects){
      const cid = String(subj).toLowerCase().replace(/[^a-z0-9]+/g,"_");
      conceptIds.add(cid);
    }
  }
  // Also add weakTopics as candidates
  for(const wt of (profile?.weakTopics||[])){
    const cid = String(wt).toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,60);
    if(cid) conceptIds.add(cid);
  }

  for(const conceptId of conceptIds){
    const mastery = masteryMap[conceptId] || { conceptId, subject: conceptId.split("_")[0], topic: conceptId, masteryScore: 0.5, evidenceStrength: 0, recentIncorrectCount:0 };
    const review = reviewsMap[conceptId] || { reviewState: "not_ready", priority:0, intervalDays:0 };
    const subject = mastery.subject || review.subject || conceptId.split("_")[0];
    const topic = mastery.topic || review.topic || conceptId;

    const masteryScore = clamp01(mastery.masteryScore ?? 0.5);
    const evidenceStrength = clamp01(mastery.evidenceStrength ?? review.evidenceStrength ?? 0);
    const recentIncorrectCount = Number(mastery.recentIncorrectCount ?? review.recentIncorrectCount ?? 0);
    const reviewState = review.reviewState || "not_ready";
    const reviewPriority = clamp01(review.priority ?? 0);
    const hasMisconception = misconceptionSet.has(conceptId);
    const goalRelevance = getGoalRelevance({subject, topic, conceptId}, profile);
    
    // Check prerequisite risks
    const prerequisiteRisks = getPrerequisiteRisks(conceptId, masteryMap);
    const blockedByPrereqs = prerequisiteRisks.filter(r => !r.ready).length > 0;
    const prerequisiteBlocked = blockedByPrereqs;
    const prerequisiteRisk = prerequisiteRisks.length > 0 ? 
      prerequisiteRisks.filter(r => !r.ready).reduce((sum, r) => sum + (r.reason === "low_mastery" ? 0.2 : 0.1), 0) : 0;

    // Evidence-aware safety: if low evidence, don't treat low mastery as proven weak for reason
    const urgency = getUrgency(reviewState);
    const weakness = 1 - masteryScore;
    const evidenceGap = 1 - evidenceStrength;
    let misconceptionRisk = clamp01(recentIncorrectCount/5);
    if(hasMisconception) misconceptionRisk = clamp01(misconceptionRisk + 0.3);

    const score = clamp01(
      urgency*0.25 +
      weakness*0.25 +
      evidenceGap*0.15 +
      misconceptionRisk*0.15 +
      goalRelevance*0.10 +
      reviewPriority*0.10 +
      prerequisiteRisk*0.10
    );

    const action = chooseAction({masteryScore, evidenceStrength, reviewState, recentIncorrectCount, prerequisiteBlocked});
    // Don't recommend diagnostic repeatedly when sufficient evidence
    if(action==="diagnostic" && evidenceStrength >=0.10) {
      // if already has some evidence, downgrade to learn
      // keep diagnostic only for very low evidence
    }
    const reason = chooseReason({masteryScore, evidenceStrength, reviewState, recentIncorrectCount, hasMisconception, goalRelevance, prerequisiteBlocked});
    const explanation = REASON_EXPLANATIONS[reason] || REASON_EXPLANATIONS.low_evidence;

candidates.push({
      conceptId, subject, topic,
      action, score, reason, explanation,
      masteryScore, evidenceStrength,
      reviewState, reviewPriority,
      recentIncorrectCount, misconceptionRisk, goalRelevance,
      prerequisiteBlocked, prerequisiteRisks,
      urgency,
      generatedAt: new Date().toISOString(),
    });
  }

  // Ranking: score desc, then tie-breakers
  candidates.sort((a,b)=>{
    if(b.score!==a.score) return b.score-a.score;
    if(b.urgency!==a.urgency) return b.urgency-a.urgency;
    if(a.masteryScore!==b.masteryScore) return a.masteryScore-b.masteryScore;
    if(a.evidenceStrength!==b.evidenceStrength) return a.evidenceStrength-b.evidenceStrength;
    if(b.recentIncorrectCount!==a.recentIncorrectCount) return b.recentIncorrectCount-a.recentIncorrectCount;
    return String(a.conceptId).localeCompare(String(b.conceptId));
  });

  // Diversity: max 3 per subject (strict)
  const perSubject = {};
  const diversified=[];
  for(const c of candidates){
    const subj = String(c.subject||"").toLowerCase();
    perSubject[subj]=(perSubject[subj]||0);
    if(perSubject[subj] < 3){
      diversified.push(c);
      perSubject[subj]++;
    }
    if(diversified.length>=limit) break;
  }
  return diversified.slice(0,limit);
}

export function getNextBestAction(opts){
  const recs = getRecommendations({...opts, limit:1});
  return recs.length ? recs[0] : null;
}

