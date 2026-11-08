/**
 * Conversation view. Assistant turns are rendered as full-width editorial
 * columns (the shared teaching renderer owns the lesson content), user turns as
 * compact cards. New messages are appended; the whole transcript is only
 * re-rendered when a conversation is opened or replaced.
 */

import { el } from "../shared/dom.js";
import {
  LEVEL_LABEL,
  renderTeaching,
  renderRichContent,
  renderCitations,
} from "../shared/learning-blocks.js";
import { EMPTY_ACTIONS, replyToText } from "./messages.js";
import { iconMarkup } from "./icons.js";

export function createTranscript(app) {
  const { els, state, lifecycle } = app;
  let actionsBuilt = false;

  function renderAll({ scroll = true } = {}) {
    clearVisuals();
    els.messages.replaceChildren();
    for (const message of state.messages) {
      els.messages.appendChild(renderMessage(message));
    }
    syncEarlier();
    syncEmpty();
    updateQuickbar();
    if (els.latest) els.latest.hidden = true;
    if (scroll) scrollToEnd();
  }

  function appendMessage(message) {
    els.messages.appendChild(renderMessage(message));
    syncEarlier();
    syncEmpty();
    syncLatest();
  }

  /** Prepends older turns without rebuilding the rendered transcript. */
  function prependMessages(messages) {
    const fragment = document.createDocumentFragment();
    for (const message of messages) fragment.appendChild(renderMessage(message));
    els.messages.prepend(fragment);
    syncEarlier();
  }

  function syncEarlier() {
    if (!els.earlier) return;
    els.earlier.hidden = !(state.chatId && state.hasEarlier);
  }

  function renderMessage(message) {
    const isUser = message.role === "user";
    const row = el("div", `chat-row ${isUser ? "is-user" : "is-assistant"}`);
    if (message.id) row.dataset.messageId = String(message.id);

    if (isUser) {
      const bubble = el("div", "chat-bubble is-user");
      bubble.appendChild(el("p", "chat-user-text", message.content));
      row.appendChild(bubble);
      return row;
    }

    const bubble = el(
      "article",
      `chat-bubble is-assistant${message.error ? " is-error" : ""}`
    );
    bubble.appendChild(renderAssistantHead(message));

    if (message.reply) {
      renderAssistant(bubble, message);
    } else {
      const shortWrap = el("div", "chat-short-answer");
      renderRichContent(shortWrap, message.content);
      bubble.appendChild(shortWrap);
    }

    row.appendChild(bubble);
    return row;
  }

  function renderAssistantHead(message) {
    const head = el("div", "chat-bubble-head");
    head.appendChild(el("span", "chat-speaker", "Tutor"));

    const level = message.reply?.level;
    if (level && LEVEL_LABEL[level]) {
      head.appendChild(el("span", "chat-speaker-meta", LEVEL_LABEL[level]));
    }

    const copy = el("button", "chat-copy");
    copy.type = "button";
    copy.innerHTML = iconMarkup("copy", 15);
    copy.setAttribute("aria-label", "Copy this answer");
    copy.title = "Copy";
    lifecycle.on(copy, "click", () => copyAnswer(message, copy));
    head.appendChild(copy);

    return head;
  }

  function copyAnswer(message, button) {
    const text = replyToText(message);
    if (!text) return;

    if (!navigator.clipboard?.writeText) {
      app.notify("Copying is not available in this browser.", "error");
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => {
        button.innerHTML = iconMarkup("check", 15);
        button.setAttribute("aria-label", "Answer copied");
        button.title = "Copied";
        button.classList.add("is-copied");
        setTimeout(() => {
          button.innerHTML = iconMarkup("copy", 15);
          button.setAttribute("aria-label", "Copy this answer");
          button.title = "Copy";
          button.classList.remove("is-copied");
        }, 1600);
      },
      () => app.notify("This answer could not be copied.", "error")
    );
  }

  function renderAssistant(bubble, message) {
    const reply = message.reply;

    if (reply.kind === "short") {
      const shortWrap = el("div", "chat-short-answer");
      renderRichContent(shortWrap, message.content || reply.directAnswer);
      bubble.appendChild(shortWrap);
      if (reply.citations && reply.citations.length) {
        const citeBox = renderCitations(reply.citations);
        if (citeBox) bubble.appendChild(citeBox);
      }
    } else {
      bubble.appendChild(renderTeaching(reply));
    }

    if (reply.visual) renderVisual(bubble, reply.visual);

    if (reply.check) bubble.appendChild(app.check.renderCheckCard(reply.check, message));

    if (message.meta?.cached) {
      bubble.appendChild(
        el(
          "p",
          "chat-meta-note",
          "Reused a reviewed explanation for this exact topic — no new AI generation was needed."
        )
      );
    }
    if (message.meta?.source === "authored-fallback") {
      bubble.appendChild(
        el(
          "p",
          "chat-meta-note chat-meta-note--warn",
          "AI was unavailable, so reviewed lesson content was used."
        )
      );
    }

    if (reply.retry) {
      const retry = el("button", "chat-retry");
      retry.type = "button";
      retry.innerHTML = iconMarkup("refresh", 14);
      const label = el("span", "", "Retry");
      retry.appendChild(label);
      retry.disabled = state.sending;
      lifecycle.on(retry, "click", app.retryLast);
      bubble.appendChild(retry);
    }

    if (reply.kind !== "fallback") {
      const followups = el("div", "chat-followups");
      followups.append(
        chip("Worked example", () =>
          app.askFollowUp("Give me one worked example", message)
        ),
        chip("Simpler", () => app.askFollowUp("Explain it more simply", message)),
        chip("Quiz me", () =>
          app.askFollowUp("Ask me one practice question on this", message)
        )
      );
      bubble.appendChild(followups);
    }
  }

  function renderVisual(bubble, visual) {
    const slot = el("div", "chat-visual");
    bubble.appendChild(slot);
    import("../shared/visual-island.js")
      .then((mod) => {
        if (lifecycle.disposed || !slot.isConnected) return;
        const unmount = mod.mountVisual(slot, visual, { compact: true });
        if (typeof unmount === "function") state.visualUnmounts.push(unmount);
      })
      .catch((err) => console.warn("Could not render visual:", err));
  }

  function clearVisuals() {
    for (const unmount of state.visualUnmounts.splice(0)) {
      try {
        unmount();
      } catch (_) {
        /* the host may already be detached */
      }
    }
  }

  function syncEmpty() {
    if (!els.empty) return;
    const show = !state.loadingChat && !state.sending && !state.messages.length;
    els.empty.hidden = !show;
    if (show && !actionsBuilt) buildEmptyActions();
  }

  function buildEmptyActions() {
    if (!els.starters) return;
    actionsBuilt = true;
    EMPTY_ACTIONS.forEach((action) => {
      const button = el("button", "chat-starter");
      button.type = "button";
      button.title = action.hint;

      const icon = el("span", "chat-starter-icon");
      icon.innerHTML = iconMarkup(action.icon, 20);
      icon.setAttribute("aria-hidden", "true");

      const label = el("span", "chat-starter-label", action.label);

      button.append(icon, label);
      lifecycle.on(button, "click", () => app.beginDraft(action.prompt));
      els.starters.appendChild(button);
    });
  }

  function updateQuickbar() {
    if (!els.quickbar) return;
    const lastAssistant = [...state.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" && message.reply?.kind === "lesson"
      );

    if (!lastAssistant || state.sending || state.loadingChat) {
      els.quickbar.hidden = true;
      return;
    }

    els.quickbar.replaceChildren(
      chip("Quiz me", () =>
        app.askFollowUp("Quiz me on what we just covered", lastAssistant)
      ),
      chip("Real-world example", () =>
        app.askFollowUp("Connect this to a real-world example", lastAssistant)
      )
    );
    els.quickbar.hidden = false;
  }

  function chip(label, handler) {
    const button = el("button", "chat-chip", label);
    button.type = "button";
    lifecycle.on(button, "click", handler);
    return button;
  }

  function setSending(value) {
    if (els.thinking) els.thinking.hidden = !value;
    syncEmpty();
    for (const button of els.messages.querySelectorAll(".chat-retry")) {
      button.disabled = value;
    }
  }

  function syncLatest() {
    if (!els.latest || !els.log) return;
    const atBottom =
      els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 80;
    els.latest.hidden = atBottom;
  }

  function bindScroll() {
    lifecycle.on(
      els.log,
      "scroll",
      () => {
        syncLatest();
      },
      { passive: true }
    );

    lifecycle.on(els.latest, "click", () => scrollToEnd());
  }

  function scrollToEnd() {
    if (!els.log) return;
    els.log.scrollTo({ top: els.log.scrollHeight, behavior: "smooth" });
  }

  return {
    renderAll,
    appendMessage,
    prependMessages,
    renderMessage,
    clearVisuals,
    syncEmpty,
    updateQuickbar,
    chip,
    setSending,
    bindScroll,
    syncLatest,
    scrollToEnd,
    syncEarlier,
  };
}
