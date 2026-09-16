/**
 * Learning Loop V1 — StuckDetector (derived) + LoopStateMachine (bounded, never traps)
 * Deterministic, no persistence of stuckScore unless needed (Decision 5).
 */
import { getPrerequisiteRisks } from "./curriculum-graph.js";

export const LOOP_STATE = Object.freeze({
  IDLE: "idle",
  DIAGNOSE: "diagnose",
  SIMPLIFY: "simplify",
  ANALOGY: "analogy",
  EXAMPLE: "example",
  MICRO_PRACTICE: "micro_practice",
  EVALUATE: "evaluate",
  REINFORCE: "reinforce",
});

export const MAX_LOOP_DEPTH = 3;

export function calculateStuckScore({ recentEvents = [], recentIncorrectCount = 0, misconceptions = [], explicitStruggle = 0, hintCount = 0 }) {
  // recentEvents: last 10 events with type, payload
  const repeatedIncorrect = Math.min(1, recentIncorrectCount / 3) * 0.3;
  const repeatedExplain = Math.min(1, recentEvents.filter(e=> e.type==="explanation_requested").length / 3) * 0.2;
  const sameMisconception = misconceptions.filter(m=>!m.resolved).length > 0 ? 0.2 : 0;
  const explicit = Math.min(1, explicitStruggle) * 0.2;
  const prerequisiteFailure = 0; // computed via graph where needed
  const hints = Math.min(1, hintCount / 5) * 0.1;
  const raw = repeatedIncorrect + repeatedExplain + sameMisconception + explicit + hints + prerequisiteFailure;
  // decay not persisted in V1 — caller can apply time decay if needed
  return Math.max(0, Math.min(1, raw));
}

export function shouldOfferLoop(stuckScore, loopDepth) {
  return stuckScore >= 0.6 && loopDepth < MAX_LOOP_DEPTH;
}

export class LoopStateMachine {
  constructor(maxDepth = MAX_LOOP_DEPTH) {
    this.depth = 0;
    this.maxDepth = maxDepth;
    this.state = LOOP_STATE.IDLE;
    this.history = [];
  }
  start(conceptId) {
    if (this.depth >= this.maxDepth) return { state: "blocked", reason: "max_depth" };
    this.depth += 1;
    this.state = LOOP_STATE.DIAGNOSE;
    this.history.push({ state: this.state, conceptId, at: new Date().toISOString() });
    return { state: this.state, canExit: true };
  }
  next({ success, hasPrerequisiteRisk, misconceptionDetected }) {
    if (success) {
      this.state = LOOP_STATE.REINFORCE;
      this.history.push({ state: this.state });
      return { state: this.state, next: "return", canExit: true };
    }
    if (hasPrerequisiteRisk) {
      this.state = LOOP_STATE.DIAGNOSE;
      return { state: this.state, next: "prerequisite_repair", canExit: true };
    }
    if (misconceptionDetected) {
      this.state = LOOP_STATE.ANALOGY;
      return { state: this.state, canExit: true };
    }
    // rotate strategies
    const order = [LOOP_STATE.SIMPLIFY, LOOP_STATE.ANALOGY, LOOP_STATE.EXAMPLE, LOOP_STATE.MICRO_PRACTICE];
    const idx = order.indexOf(this.state);
    this.state = order[(idx + 1) % order.length] || LOOP_STATE.MICRO_PRACTICE;
    this.history.push({ state: this.state });
    if (this.depth >= this.maxDepth) return { state: this.state, canExit: true, warn: "We're going in circles. Let's try a different approach." };
    return { state: this.state, canExit: true };
  }
  exit() {
    this.state = LOOP_STATE.IDLE;
    return { state: this.state };
  }
  canExit() { return true; } // always
}
