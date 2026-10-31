import { collection, getDocs } from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { toDate, formatDate } from "./shared/format.js";
import { renderRetentionTimeline } from "../js/learning/graphs.js";

const STATES = ["due", "overdue", "practice", "review_soon", "stable", "not_ready"];

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const stats = root.querySelector("#reviewStats");
  const list = root.querySelector("#reviewList");
  const graph = root.querySelector("#reviewGraph");
  const start = root.querySelector("#reviewStart");
  if (!stats || !list || !graph) return () => lifecycle.dispose();

  loadReviews({ stats, list, graph, start }, ctx, lifecycle);

  return () => lifecycle.dispose();
}

async function loadReviews(elements, ctx, lifecycle) {
  try {
    const snap = await getDocs(
      collection(ctx.db, "users", ctx.user.uid, "reviews")
    );
    if (lifecycle.disposed) return;

    const reviews = snap.docs.map((reviewDoc) => reviewDoc.data());
    renderStats(elements.stats, reviews);
    const display = renderList(elements.list, reviews);
    if (elements.start) elements.start.hidden = display.length === 0;

    try {
      renderRetentionTimeline(elements.graph, reviews);
    } catch (err) {
      console.warn("Could not render retention timeline:", err);
      elements.graph.replaceChildren();
    }
  } catch (err) {
    if (lifecycle.disposed) return;
    console.warn("Could not load review queue:", err);
    elements.stats.replaceChildren();
    elements.list.replaceChildren();
    const error = document.createElement("div");
    error.className = "dash-error";
    error.textContent =
      "Your review queue could not be loaded right now. Check your connection and refresh.";
    elements.list.appendChild(error);
    elements.graph.replaceChildren();
    if (elements.start) elements.start.hidden = true;
  }
}

function renderStats(container, reviews) {
  container.replaceChildren();
  for (const state of STATES) {
    const count = reviews.filter((review) => review.reviewState === state).length;
    const chip = document.createElement("span");
    chip.className = `review-stat is-${state.replace(/_/g, "-")}`;
    chip.textContent = `${state.replace(/_/g, " ")}: ${count}`;
    container.appendChild(chip);
  }
}

function renderList(container, reviews) {
  container.replaceChildren();
  const display = reviews
    .filter((review) => ["due", "overdue", "practice"].includes(review.reviewState))
    .slice(0, 10);

  if (!display.length) {
    const empty = document.createElement("div");
    empty.className = "review-empty";
    empty.textContent =
      "No concepts due right now. Keep learning — Learning Allied will schedule reviews as you practice.";
    container.appendChild(empty);
    return display;
  }

  for (const review of display) {
    const card = document.createElement("div");
    card.className = "review-card";

    const head = document.createElement("div");
    head.className = "review-card-head";

    const concept = document.createElement("span");
    concept.className = "review-concept";
    concept.textContent = String(review.conceptId || "Concept");

    const state = document.createElement("span");
    state.className = "review-state";
    state.textContent = humanState(review);

    head.append(concept, state);

    const context = document.createElement("div");
    context.className = "review-context";
    const contextParts = [];
    if (review.subject) contextParts.push(String(review.subject));
    if (review.topic) contextParts.push(String(review.topic));
    if (Number.isFinite(Number(review.intervalDays))) {
      contextParts.push(`interval ${Number(review.intervalDays)}d`);
    }
    contextParts.push(`mastery ${percent(review.masteryScore)}%`);
    contextParts.push(`strength ${percent(review.evidenceStrength)}%`);
    contextParts.push(`retention ${percent(review.retentionScore)}%`);
    context.textContent = contextParts.join(" • ");

    const next = document.createElement("div");
    next.className = "review-next";
    const nextDate = nextReviewDate(review);
    if (nextDate) next.textContent = `Next: ${nextDate}`;

    card.append(head, context);
    if (nextDate) card.appendChild(next);
    container.appendChild(card);
  }

  return display;
}

function humanState(review) {
  if (review.reviewState === "due") return "Due today";
  if (review.reviewState === "overdue") {
    const nextIso = review.nextReviewAtIso;
    const days = nextIso
      ? Math.floor((Date.now() - new Date(nextIso).getTime()) / 86400000)
      : 0;
    if (days > 0) return `Overdue by ${days} day${days > 1 ? "s" : ""}`;
    return "Overdue";
  }
  if (review.reviewState === "practice") return "Practice recommended";
  if (review.reviewState === "review_soon") return "Review soon";
  return String(review.reviewState || "");
}

function percent(value) {
  return Math.round((Number(value) || 0) * 100);
}

function nextReviewDate(review) {
  if (typeof review.nextReviewAtIso === "string" && review.nextReviewAtIso) {
    return review.nextReviewAtIso.slice(0, 10);
  }
  const date = toDate(review.nextReviewAt);
  return date ? formatDate(date) : "";
}
