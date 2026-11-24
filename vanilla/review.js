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
    const display = renderList(elements.list, reviews, ctx);
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

function formatConceptTitle(cid) {
  if (!cid) return "Concept Recall";
  const s = String(cid);
  if (s.startsWith("pack.")) {
    return s.slice(5).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const parts = s.split(".");
  if (parts.length >= 4) {
    const topic = parts[parts.length - 1].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = parts[2].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const board = parts[0].toUpperCase();
    const grade = parts[1];
    return `${topic} (${board} Class ${grade} ${subject})`;
  }
  return s.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderList(container, reviews, ctx) {
  container.replaceChildren();
  const display = reviews
    .filter((review) => ["due", "overdue", "practice"].includes(review.reviewState))
    .slice(0, 10);

  if (!display.length) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "review-card ui-interactive-card";
    emptyCard.style.textAlign = "center";
    emptyCard.style.padding = "36px 20px";

    const title = document.createElement("h3");
    title.style.fontSize = "17px";
    title.style.color = "var(--text-primary)";
    title.style.margin = "0 0 8px";
    title.textContent = "🎉 Memory Queue Fully Consolidated!";

    const sub = document.createElement("p");
    sub.style.fontSize = "13px";
    sub.style.color = "var(--text-muted)";
    sub.style.maxWidth = "460px";
    sub.style.margin = "0 auto 20px";
    sub.textContent = "No topics are at risk of forgetting today. Build more retrieval strength by taking an adaptive quiz or exploring new chapters.";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "center";
    actions.style.gap = "10px";
    actions.style.flexWrap = "wrap";

    const quizLink = document.createElement("a");
    quizLink.href = "/quiz";
    quizLink.className = "btn btn-primary";
    quizLink.style.fontSize = "12.5px";
    quizLink.style.padding = "6px 14px";
    quizLink.textContent = "Take Adaptive Quiz →";

    const hubLink = document.createElement("a");
    hubLink.href = "/learning-hub";
    hubLink.className = "btn btn-secondary";
    hubLink.style.fontSize = "12.5px";
    hubLink.style.padding = "6px 14px";
    hubLink.textContent = "Explore Learning Hub →";

    actions.append(quizLink, hubLink);
    emptyCard.append(title, sub, actions);
    container.appendChild(emptyCard);
    return display;
  }

  for (const review of display) {
    const card = document.createElement("div");
    card.className = "review-card ui-interactive-card";

    // 1. Head
    const head = document.createElement("div");
    head.className = "review-card-head";

    const concept = document.createElement("span");
    concept.className = "review-concept";
    concept.textContent = formatConceptTitle(review.conceptId);

    const stateBadge = document.createElement("span");
    const st = review.reviewState || "due";
    stateBadge.className = `review-state-badge ${st}`;
    stateBadge.textContent = humanState(review);

    head.append(concept, stateBadge);

    // 2. Metrics & Retention Bar
    const metricsRow = document.createElement("div");
    metricsRow.className = "review-metrics-row";

    const masteryPct = percent(review.masteryScore || 0.6);
    const retentionPct = percent(review.retentionScore || 0.75);

    const retentionText = document.createElement("span");
    retentionText.textContent = `Memory Retention: ${retentionPct}%`;

    const barWrap = document.createElement("div");
    barWrap.className = "review-progress-bar-wrap";
    const barFill = document.createElement("div");
    barFill.className = "review-progress-bar-fill";
    barFill.style.width = `${retentionPct}%`;
    barFill.style.background = retentionPct < 60 ? "#ef4444" : retentionPct < 80 ? "#f59e0b" : "#10b981";
    barWrap.appendChild(barFill);

    const masteryText = document.createElement("span");
    masteryText.textContent = `Mastery: ${masteryPct}%`;

    metricsRow.append(retentionText, barWrap, masteryText);

    // 3. Interactive Active Recall Drawer
    const drawer = document.createElement("div");
    drawer.className = "review-interactive-drawer";

    const revealBtn = document.createElement("button");
    revealBtn.type = "button";
    revealBtn.className = "recall-btn";
    revealBtn.style.width = "100%";
    revealBtn.style.textAlign = "center";
    revealBtn.style.marginBottom = "8px";
    revealBtn.textContent = "🧠 Test Active Recall (Reveal Core Principles)";

    const revealBox = document.createElement("div");
    revealBox.className = "review-reveal-box";
    revealBox.hidden = true;
    revealBox.innerHTML = `
      <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Key Retrieval Focus:</div>
      <div>Recall the definition, first principles derivation, and typical exam pitfalls of <strong>${formatConceptTitle(review.conceptId)}</strong>.</div>
    `;

    // Self Assessment Rating Buttons
    const actionsRow = document.createElement("div");
    actionsRow.className = "review-actions-row";
    actionsRow.hidden = true;

    const rateLabel = document.createElement("span");
    rateLabel.style.fontSize = "12px";
    rateLabel.style.color = "var(--text-muted)";
    rateLabel.textContent = "Rate your recall:";

    const btnGroup = document.createElement("div");
    btnGroup.className = "recall-btn-group";

    const hardBtn = document.createElement("button");
    hardBtn.type = "button";
    hardBtn.className = "recall-btn hard";
    hardBtn.textContent = "🔴 Hard (1d)";

    const goodBtn = document.createElement("button");
    goodBtn.type = "button";
    goodBtn.className = "recall-btn good";
    goodBtn.textContent = "🟡 Good (3d)";

    const easyBtn = document.createElement("button");
    easyBtn.type = "button";
    easyBtn.className = "recall-btn easy";
    easyBtn.textContent = "🟢 Mastered (7d)";

    const tutorBtn = document.createElement("a");
    tutorBtn.href = `/chat?topic=${encodeURIComponent(formatConceptTitle(review.conceptId))}`;
    tutorBtn.className = "recall-btn";
    tutorBtn.style.color = "var(--accent, #3b82f6)";
    tutorBtn.textContent = "Ask Tutor →";

    const handleRating = async (ratingOutcome, btn) => {
      hardBtn.disabled = true;
      goodBtn.disabled = true;
      easyBtn.disabled = true;
      btn.textContent = "✓ Saved!";
      card.style.opacity = "0.75";
      card.style.borderColor = "#10b981";

      if (ctx?.authFetch) {
        try {
          await ctx.authFetch("/api/learning-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              type: "topic_reviewed",
              conceptId: review.conceptId,
              outcome: ratingOutcome,
              source: "spaced_review_card",
            }),
          });
        } catch (err) {
          console.warn("Could not record review rating:", err);
        }
      }
    };

    hardBtn.addEventListener("click", () => handleRating("hard", hardBtn));
    goodBtn.addEventListener("click", () => handleRating("good", goodBtn));
    easyBtn.addEventListener("click", () => handleRating("mastered", easyBtn));

    btnGroup.append(hardBtn, goodBtn, easyBtn, tutorBtn);
    actionsRow.append(rateLabel, btnGroup);

    revealBtn.addEventListener("click", () => {
      const isHidden = revealBox.hidden;
      revealBox.hidden = !isHidden;
      actionsRow.hidden = !isHidden;
      revealBtn.textContent = isHidden ? "▲ Hide Principles" : "🧠 Test Active Recall (Reveal Core Principles)";
    });

    drawer.append(revealBtn, revealBox, actionsRow);

    card.append(head, metricsRow, drawer);
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
