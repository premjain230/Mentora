/**
 * Learning Allied Learning — Adaptive Onboarding (Prompt 2)
 * Graph-driven interview: tiered, branchable, shared Web ↔ Android.
 * Every answer persists immediately (partial save) to users/{uid}/learning/profile.
 */

import { Board, Track, Priority } from "./schema.js";

/**
 * Tiered questions. Options are intentionally finite where possible;
 * free-form fields are capped and sanitized.
 */
export const ONBOARDING_QUESTIONS = [
  { id: "grade", tier: 0, field: "academic.grade", question: "Which class / grade are you in?", input: "single", options: ["6","7","8","9","10","11","12","UG1","UG2","UG3","Other"], required: true, next: () => "board" },
  { id: "board", tier: 0, field: "academic.board", question: "Which board / curriculum are you in?", input: "single", options: [...Object.values(Board), "State (specify)"], required: true, next: () => "academicYear" },
  { id: "academicYear", tier: 0, field: "academic.academicYear", question: "Academic year?", input: "single", options: ["2024-25","2025-26","2026-27"], required: false, next: () => "country" },
  { id: "country", tier: 0, field: "academic.country", question: "Country?", input: "single", options: ["IN","Other"], required: false, next: () => "track" },
  { id: "track", tier: 1, field: "academic.track", question: "What are you preparing for?", input: "single", options: [Track.SCHOOL, Track.COMPETITIVE, Track.BOTH], required: true, next: (a) => a === Track.COMPETITIVE ? "competitiveExam" : "subjects" },
  { id: "competitiveExam", tier: 1, field: "goals.competitiveExam", question: "Which competitive exam?", input: "single", options: ["JEE Main","JEE Advanced","NEET","UPSC","Olympiad","Other"], required: false, next: () => "subjects" },
  { id: "subjects", tier: 1, field: "subjects", question: "Which subjects are you studying? (pick all that apply)", input: "multi", options: ["Mathematics","Physics","Chemistry","Biology","History","Geography","English","Other"], required: true, next: () => "goals" },
  { id: "goals", tier: 1, field: "goals", question: "What are you trying to achieve?", input: "multi", options: ["Pass the year","Improve a subject","Score 90%+","Board exam","Competitive exam","Deep understanding","Finish syllabus","Consistency"], required: true, next: () => "prioritySubject" },
  { id: "prioritySubject", tier: 1, field: "prioritySubject", question: "Which subject should we prioritize first?", input: "single", optionsFrom: "subjects", required: true, next: () => "dailyHours" },
  { id: "dailyHours", tier: 1, field: "dailyHours", question: "How many hours can you study per day?", input: "range", min: 1, max: 18, required: true, next: () => "difficultSubjects" },
  { id: "difficultSubjects", tier: 2, field: "weakTopics", question: "Which subjects feel most difficult right now?", input: "multi", optionsFrom: "subjects", required: false, next: (a, all) => Array.isArray(a) && a.length > 1 ? "priorityDifficult" : "confidentTopics" },
  { id: "priorityDifficult", tier: 2, field: "weakTopics.priority", question: "Pick the one to tackle first.", input: "single", optionsFrom: "difficultSubjects", required: false, next: () => "confidentTopics" },
  { id: "confidentTopics", tier: 2, field: "confidentTopics", question: "Any topics you feel confident about? (optional)", input: "free", required: false, next: () => "examDate" },
  { id: "examDate", tier: 2, field: "examDate", question: "When is your next big exam? (optional)", input: "free", required: false, next: () => "learningStyle" },
  { id: "learningStyle", tier: 2, field: "preferences.preferredStyle", question: "How do you prefer to learn?", input: "single", options: ["visual","auditory","reading","practice","mixed"], required: false, next: () => "studyBehavior" },
  { id: "studyBehavior", tier: 3, field: "preferences.studyBehavior", question: "Where do you usually get stuck?", input: "multi", options: ["Understanding concepts","Remembering","Solving problems","Time management","Staying consistent"], required: false, next: () => null },
];

const BY_ID = Object.fromEntries(ONBOARDING_QUESTIONS.map(q => [q.id, q]));

/**
 * Return the next question node given current id + full answers map.
 * Pure — same logic on Android.
 */
export function getNextOnboardingQuestion(currentId, answers = {}) {
  const cur = BY_ID[currentId];
  if (!cur) {
    // start
    return BY_ID["grade"];
  }
  const ans = answers[cur.field] ?? answers[cur.id];
  const nextId = typeof cur.next === "function" ? cur.next(ans, answers) : cur.next;
  if (!nextId) return null;
  const nxt = BY_ID[nextId];
  if (!nxt) return null;
  // dynamic optionsFrom resolution is left to the UI; still return the node
  return nxt;
}

export function getQuestionById(id) { return BY_ID[id] || null; }

export function validateOnboardingAnswers(answers) {
  const errors = [];
  if (!answers || typeof answers !== "object") return ["answers must be an object"];
  // Tier 1 required gates
  if (!answers["academic.grade"] && !answers.grade) errors.push("grade required");
  if (!answers["academic.board"] && !answers.board) errors.push("board required");
  return errors;
}

/**
 * Map flat onboarding answers into the profile patch written to Firestore.
 * Keeps writes minimal and merge-friendly.
 */
export function answersToProfilePatch(answers = {}) {
  const academic = {};
  if (answers["academic.grade"] || answers.grade) academic.grade = answers["academic.grade"] ?? answers.grade;
  if (answers["academic.board"] || answers.board) academic.board = answers["academic.board"] ?? answers.board;
  if (answers["academic.academicYear"] || answers.academicYear) academic.academicYear = answers["academic.academicYear"] ?? answers.academicYear;
  if (answers["academic.country"] || answers.country) academic.country = answers["academic.country"] ?? answers.country;
  if (answers["academic.track"] || answers.track) academic.track = answers["academic.track"] ?? answers.track;
  return {
    academic,
    subjects: answers.subjects || answers["subjects"] || [],
    dailyHours: answers.dailyHours ?? answers["dailyHours"] ?? 4,
    weakTopics: answers.weakTopics || answers["weakTopics"] || [],
    examDate: answers.examDate || answers["examDate"] || null,
    prioritySubject: answers.prioritySubject || answers["prioritySubject"] || null,
    competitiveExam: answers["goals.competitiveExam"] || answers.competitiveExam || null,
    preferences: {
      preferredStyle: answers["preferences.preferredStyle"] || answers.learningStyle || null,
      studyBehaviorTags: answers["preferences.studyBehavior"] || answers.studyBehavior || answers["studyBehavior"] || [],
      weakTopicsPriority: answers["weakTopics.priority"] || null,
      confidentTopics: answers.confidentTopics || answers["confidentTopics"] || null,
    },
  };
}
