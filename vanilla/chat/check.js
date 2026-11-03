/**
 * "Check your understanding" card and the evaluation feedback it renders.
 * Evaluation goes through the same /api/tutor `evaluate` action the Learning
 * Hub uses, so misconceptions and evidence come from one engine.
 */

import { el } from "../shared/dom.js";
import { emitLearningEvent } from "../../lib/learning/types";
import { VERDICT_META } from "./messages.js";

export function createCheck(app) {
  const { state, lifecycle } = app;

  function renderCheckCard(check, message) {
    const card = el("div", "learn-check");

    const head = el("div", "learn-check-head");
    head.appendChild(
      el("span", "learn-badge learn-badge--accent", "Check your understanding")
    );
    head.appendChild(
      el("span", "learn-check-difficulty", `Level ${check.difficulty}/3`)
    );
    card.appendChild(head);
    card.appendChild(el("p", "learn-check-prompt", check.prompt));

    const form = el("form");
    const inputId = `answer-${String(message.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const label = el("label", "learn-check-label", "Your reasoning");
    label.htmlFor = inputId;
    form.appendChild(label);

    const textarea = el("textarea", "learn-textarea");
    textarea.id = inputId;
    textarea.rows = 4;
    textarea.placeholder =
      "Write the answer and your reasoning in your own words…";
    form.appendChild(textarea);

    const actions = el("div", "learn-check-actions");
    const submit = el("button", "btn btn-primary", "Check my reasoning");
    submit.type = "submit";
    submit.disabled = true;
    actions.appendChild(submit);

    const hint = check.hint ? el("p", "learn-hint") : null;
    if (hint) {
      hint.textContent = check.hint;
      hint.hidden = true;
      const hintBtn = el("button", "btn btn-secondary", "Show hint");
      hintBtn.type = "button";
      hintBtn.setAttribute("aria-expanded", "false");
      lifecycle.on(hintBtn, "click", () => {
        hint.hidden = !hint.hidden;
        hintBtn.textContent = hint.hidden ? "Show hint" : "Hide hint";
        hintBtn.setAttribute("aria-expanded", String(!hint.hidden));
      });
      actions.appendChild(hintBtn);
    }
    form.appendChild(actions);
    if (hint) form.appendChild(hint);

    const error = el("p", "learn-error");
    error.setAttribute("role", "alert");
    error.hidden = true;
    form.appendChild(error);

    const evaluationHost = el("div", "chat-evaluation");
    card.appendChild(form);
    card.appendChild(evaluationHost);

    let submitting = false;
    const locked = () =>
      !!message.evaluation && message.evaluation.verdict === "correct";

    const sync = () => {
      const isLocked = locked();
      textarea.disabled = submitting || isLocked;
      submit.disabled = submitting || isLocked || !textarea.value.trim();
      if (!submitting) submit.textContent = "Check my reasoning";
    };

    lifecycle.on(textarea, "input", () => {
      if (error) error.hidden = true;
      sync();
    });

    lifecycle.on(form, "submit", async (event) => {
      event.preventDefault();
      const answer = textarea.value.trim();
      if (!answer || submitting || locked()) return;

      submitting = true;
      error.hidden = true;
      sync();
      submit.textContent = "Checking…";

      try {
        await evaluateCheck(message, answer);
        if (lifecycle.disposed) return;
        if (message.evaluation) {
          evaluationHost.replaceChildren(
            renderEvaluation(message.evaluation, message)
          );
        }
      } catch (err) {
        error.textContent =
          err?.message || "Your answer could not be checked. Please retry.";
        error.hidden = false;
      } finally {
        submitting = false;
        if (!lifecycle.disposed) sync();
      }
    });

    if (message.evaluation) {
      evaluationHost.appendChild(
        renderEvaluation(message.evaluation, message)
      );
    }

    return card;
  }

  function renderEvaluation(evaluation, message) {
    const meta = VERDICT_META[evaluation.verdict] || VERDICT_META.unknown;
    const wrap = el("div", `learn-feedback ${meta.className}`);
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");

    const head = el("div", "learn-feedback-head");
    head.appendChild(el("span", `learn-verdict ${meta.className}`, meta.label));
    if (evaluation.basis === "authored") {
      head.appendChild(
        el(
          "span",
          "learn-badge learn-badge--soft",
          "Checked against the lesson rubric"
        )
      );
    }
    wrap.appendChild(head);

    if (evaluation.feedback) {
      wrap.appendChild(el("p", "learn-feedback-text", evaluation.feedback));
    }

    wrap.appendChild(
      renderFeedbackGroup("What worked", evaluation.whatWorked || [])
    );
    if (evaluation.actualMistake) {
      const mb = el("div", "learn-feedback-group learn-mistake");
      mb.appendChild(el("span", "learn-feedback-label", "What needs correction"));
      mb.appendChild(el("p", null, evaluation.actualMistake));
      wrap.appendChild(mb);
    }
    wrap.appendChild(
      renderFeedbackGroup("What was missing", evaluation.missing || [])
    );
    if (evaluation.correctReasoning) {
      const cr = el("div", "learn-feedback-group learn-correct-reasoning");
      cr.appendChild(el("span", "learn-feedback-label", "Correct method"));
      cr.appendChild(el("p", null, evaluation.correctReasoning));
      wrap.appendChild(cr);
    }

    const misconception = evaluation.misconception;
    if (misconception) {
      const box = el("div", "learn-misconception");
      const label = el("div", "learn-misconception-label");
      const marker = el("span", null, "⚠ ");
      marker.setAttribute("aria-hidden", "true");
      label.appendChild(marker);
      label.appendChild(
        document.createTextNode(
          `${
            misconception.verified ? "Common misconception" : "Likely misconception"
          }: ${misconception.label}`
        )
      );
      box.appendChild(label);
      if (misconception.explanation) {
        box.appendChild(el("p", null, misconception.explanation));
      }
      if (misconception.remediation) {
        const remediation = el("p");
        remediation.appendChild(el("strong", null, "Try this:"));
        remediation.appendChild(
          document.createTextNode(` ${misconception.remediation}`)
        );
        box.appendChild(remediation);
      }
      wrap.appendChild(box);
    }

    if (
      evaluation.packExplanation &&
      !String(evaluation.feedback || "").includes(evaluation.packExplanation)
    ) {
      const details = el("details", "learn-advanced learn-advanced--tight");
      details.appendChild(el("summary", null, "Key idea"));
      details.appendChild(el("p", null, evaluation.packExplanation));
      wrap.appendChild(details);
    }

    if (evaluation.next?.message) {
      wrap.appendChild(el("p", "learn-next-hint", evaluation.next.message));
    }

    if (evaluation.verdict !== "correct") {
      const actions = el("div", "learn-feedback-actions");
      const explain = el(
        "button",
        "btn btn-secondary",
        "Explain it a different way"
      );
      explain.type = "button";
      lifecycle.on(explain, "click", () =>
        app.askFollowUp(
          "Explain this a different way, starting from a simpler example",
          message
        )
      );
      actions.appendChild(explain);
      wrap.appendChild(actions);
    }

    return wrap;
  }

  function renderFeedbackGroup(label, items) {
    const group = el("div", "learn-feedback-group");
    if (!items.length) {
      group.hidden = true;
      return group;
    }
    group.appendChild(el("span", "learn-feedback-label", label));
    const list = el("ul");
    for (const item of items) list.appendChild(el("li", null, item));
    group.appendChild(list);
    return group;
  }

  async function evaluateCheck(message, answer) {
    const check = message.reply?.check;
    if (!check || !app.user) return;
    app.setNotice(null);

    const data = await app.tutor("evaluate", {
      conceptId: message.meta?.conceptId || undefined,
      track: state.context.board || undefined,
      classNum: state.context.classNum || undefined,
      question: check.prompt,
      answer,
      level: message.reply.level,
      difficulty: check.difficulty || 2,
      questionId: check.questionId || `${message.id}-check`,
      surface: "chat",
      topic: message.reply.title || undefined,
    });

    message.evaluation = data.evaluation;

    if (data.learningEvent) {
      const saved = await emitLearningEvent(app.getToken, {
        ...data.learningEvent,
        eventId: `chat_${message.id}_${Date.now()}`,
        source: data.learningEvent.source || "chat",
      });
      if (!saved && !lifecycle.disposed) {
        app.setNotice(
          "Your feedback is shown, but this answer could not be saved to your progress. Retrying will not duplicate it."
        );
      }
    }
  }

  return { renderCheckCard, renderEvaluation, evaluateCheck };
}
