/**
 * Chat controller — vanilla port of the adaptive tutor chat. Teaching calls,
 * persistence and learning events use the same shared clients as before; only
 * the animated lesson visuals are mounted as an on-demand React island.
 */

import {
  createChatSession,
  loadChatSession,
  saveChatMessage,
} from "../lib/chat-store";
import {
  callTutor,
  emitLearningEvent,
  summarizeConversation,
  TutorError,
} from "../lib/learning/types";
import { createLifecycle } from "./shared/lifecycle.js";

const WELCOME_TEXT =
  "Hello! I am your Learning Allied tutor. Ask me to explain a concept, work through a problem, or check your reasoning. I will keep simple questions short and go deeper when a topic needs it.";

const STARTERS = [
  "Why is the current the same everywhere in a series circuit?",
  "Help me understand photosynthesis instead of memorising it.",
  "Give me a worked example of a quadratic with two real roots.",
];

const LEVEL_LABEL = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const VERDICT_META = {
  correct: { label: "Correct", className: "verdict-good" },
  partially_correct: { label: "Almost there", className: "verdict-partial" },
  incorrect: { label: "Not yet", className: "verdict-bad" },
  unknown: { label: "Not evaluated", className: "verdict-unknown" },
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function welcomeMessage() {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_TEXT,
    reply: {
      kind: "short",
      title: null,
      directAnswer: WELCOME_TEXT,
      sections: [],
      example: null,
      check: null,
      visual: null,
      personalization: null,
      advanced: null,
      level: "intermediate",
      source: "system",
    },
  };
}

function fallbackReply(text, source, retry = false) {
  return {
    kind: "fallback",
    title: null,
    directAnswer: text,
    sections: [],
    example: null,
    check: null,
    visual: null,
    personalization: null,
    advanced: null,
    level: "intermediate",
    source,
    ...(retry ? { retry: true } : {}),
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const els = {
    messages: root.querySelector("#chatMessages"),
    starters: root.querySelector("#chatStarters"),
    loading: root.querySelector("#chatLoading"),
    thinking: root.querySelector("#chatThinking"),
    log: root.querySelector("#chatLog"),
    latest: root.querySelector("#chatLatestBtn"),
    notice: root.querySelector("#chatProgressNotice"),
    quickbar: root.querySelector("#chatQuickbar"),
    form: root.querySelector("#chatForm"),
    input: root.querySelector("#chatInput"),
    send: root.querySelector("#chatSend"),
    charCount: root.querySelector("#chatCharCount"),
    board: root.querySelector("#chatBoard"),
    classSelect: root.querySelector("#chatClass"),
    subject: root.querySelector("#chatSubject"),
    language: root.querySelector("#chatLanguage"),
    model: root.querySelector("#chatModel"),
    web: root.querySelector("#chatWeb"),
  };

  if (!els.messages || !els.log || !els.form) {
    return () => lifecycle.dispose();
  }

  const state = {
    messages: [welcomeMessage()],
    tracks: [],
    subjects: [],
    profile: null,
    context: { board: "", classNum: null, subject: "", language: "en" },
    model: "fast",
    webSearch: false,
    sending: false,
    inFlight: false,
    loadingChat: false,
    lastAttempt: null,
    chatId: null,
    visualUnmounts: [],
  };

  let abortController = null;
  const user = ctx.user;
  const getToken = () => ctx.user.getIdToken();

  hydrateTopbar();
  readSavedContext();
  renderContext();
  renderAll({ scroll: false });

  bindComposer();
  bindContext();
  bindScroll();

  void loadCatalog();
  const resumeId = readResumeId();
  if (resumeId && user) void resumeSession(resumeId);

  lifecycle.add(() => {
    try {
      abortController?.abort();
    } catch {}
    clearVisuals();
  });

  return () => lifecycle.dispose();

  /* ── Topbar and context ─────────────────────────────────────────────── */

  function hydrateTopbar() {
    if (!user) return;
    const displayName =
      ctx.userData?.displayName ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "there");

    const nameEl = root.querySelector("#greetingName");
    if (nameEl) nameEl.textContent = displayName;

    const avatar = root.querySelector("#topbarAvatar");
    if (avatar && user.photoURL) {
      avatar.src = user.photoURL;
      avatar.alt = displayName;
    }

    const proTag = root.querySelector("#chatProTag");
    if (proTag) proTag.hidden = !ctx.isPro;
  }

  function readSavedContext() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("learning-allied-tutor-context") || "{}"
      );
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.board === "string") state.context.board = saved.board;
      if (Number.isFinite(Number(saved.classNum))) {
        state.context.classNum = Number(saved.classNum);
      }
      if (typeof saved.subject === "string") state.context.subject = saved.subject;
      if (typeof saved.language === "string") {
        state.context.language = saved.language;
      }
    } catch (_) {
      /* ignore malformed local settings */
    }
  }

  function persistContext() {
    try {
      localStorage.setItem(
        "learning-allied-tutor-context",
        JSON.stringify(state.context)
      );
    } catch (_) {
      /* storage may be unavailable */
    }
  }

  function selectedTrack() {
    return state.tracks.find((track) => track.id === state.context.board) || null;
  }

  function renderContext() {
    const track = selectedTrack();

    if (els.board) {
      els.board.replaceChildren(
        option("", "General"),
        ...state.tracks.map((item) => option(item.id, item.label))
      );
      els.board.value = state.context.board;
    }

    if (els.classSelect) {
      if (track && track.grades) {
        els.classSelect.replaceChildren(
          option("", "Class"),
          ...(track.classes || []).map((cls) =>
            option(String(cls), `Class ${cls}`)
          )
        );
        els.classSelect.value =
          state.context.classNum != null ? String(state.context.classNum) : "";
        els.classSelect.hidden = false;
      } else {
        els.classSelect.replaceChildren(option("", "Class"));
        els.classSelect.value = "";
        els.classSelect.hidden = true;
      }
    }

    renderSubjects();

    if (els.language) els.language.value = state.context.language;
    if (els.model) els.model.value = state.model;
  }

  function renderSubjects() {
    if (!els.subject) return;
    const track = selectedTrack();
    els.subject.replaceChildren(
      option("", "All subjects"),
      ...state.subjects.map((subject) => option(subject.name, subject.name))
    );
    els.subject.value = state.context.subject;
    els.subject.disabled =
      !state.context.board || (!!(track && track.grades) && !state.context.classNum);
  }

  async function loadCatalog() {
    if (!user) return;
    try {
      const res = await callTutor(getToken, "catalog", {});
      if (lifecycle.disposed) return;
      state.tracks = res.catalog?.tracks || [];
      state.profile = res.profile || null;
      if (state.profile) {
        state.context.board = state.context.board || state.profile.board || "";
        state.context.classNum =
          state.context.classNum ?? state.profile.classNum ?? null;
        state.context.subject = state.context.subject || "";
        state.context.language =
          state.context.language || state.profile.language || "en";
        persistContext();
      }
      renderContext();
      if (state.context.board) void loadSubjects();
    } catch (_) {
      /* The chat still works without the catalogue. */
    }
  }

  async function loadSubjects() {
    if (!user || !state.context.board) {
      state.subjects = [];
      renderSubjects();
      return;
    }
    const board = state.context.board;
    const classNum = state.context.classNum;
    try {
      const res = await callTutor(getToken, "catalog", {
        track: board,
        ...(classNum ? { classNum } : {}),
      });
      if (
        lifecycle.disposed ||
        board !== state.context.board ||
        classNum !== state.context.classNum
      ) {
        return;
      }
      state.subjects =
        res.catalog?.step === "subject" ? res.catalog.subjects || [] : [];
    } catch (_) {
      if (lifecycle.disposed) return;
      state.subjects = [];
    }
    renderSubjects();
  }

  function bindContext() {
    lifecycle.on(els.board, "change", () => {
      const board = els.board.value;
      const track = state.tracks.find((item) => item.id === board) || null;
      const previous = state.context;
      state.context = {
        ...previous,
        board,
        classNum:
          track && track.grades
            ? state.profile?.board === board
              ? state.profile?.classNum ?? previous.classNum
              : previous.classNum
            : null,
        subject: "",
      };
      persistContext();
      renderContext();
      void loadSubjects();
    });

    lifecycle.on(els.classSelect, "change", () => {
      state.context.classNum = Number(els.classSelect.value) || null;
      state.context.subject = "";
      persistContext();
      renderContext();
      void loadSubjects();
    });

    lifecycle.on(els.subject, "change", () => {
      state.context.subject = els.subject.value;
      persistContext();
    });

    lifecycle.on(els.language, "change", () => {
      state.context.language = els.language.value;
      persistContext();
    });

    lifecycle.on(els.model, "change", () => {
      state.model = els.model.value === "strong" ? "strong" : "fast";
    });

    lifecycle.on(els.web, "click", () => {
      state.webSearch = !state.webSearch;
      els.web.classList.toggle("is-active", state.webSearch);
      els.web.setAttribute("aria-pressed", String(state.webSearch));
      els.web.textContent = state.webSearch
        ? "Web search: on"
        : "Web search: off";
    });
  }

  /* ── Conversation rendering ─────────────────────────────────────────── */

  function renderAll({ scroll = true } = {}) {
    clearVisuals();
    els.messages.replaceChildren();
    for (const message of state.messages) {
      els.messages.appendChild(renderMessage(message));
    }
    showStarters(state.messages.length === 1 && !state.loadingChat);
    updateQuickbar();
    if (scroll) scrollToEnd();
  }

  function renderMessage(message) {
    const isUser = message.role === "user";
    const row = el("div", `chat-row ${isUser ? "is-user" : "is-assistant"}`);
    const bubble = el(
      "div",
      `chat-bubble ${isUser ? "is-user" : "is-assistant"}${
        message.error ? " is-error" : ""
      }`
    );

    if (isUser) {
      bubble.appendChild(el("p", "chat-user-text", message.content));
    } else if (message.reply) {
      renderAssistant(bubble, message);
    } else {
      bubble.appendChild(el("p", "chat-short-answer", message.content));
    }

    row.appendChild(bubble);
    return row;
  }

  function renderAssistant(bubble, message) {
    const reply = message.reply;

    if (reply.kind === "short") {
      bubble.appendChild(el("p", "chat-short-answer", message.content));
    } else {
      bubble.appendChild(renderTeaching(reply));
    }

    if (reply.visual) renderVisual(bubble, reply.visual);

    if (reply.check) {
      bubble.appendChild(renderCheckCard(reply.check, message));
    }

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
      const retry = el("button", "btn btn-primary chat-retry", "Retry");
      retry.type = "button";
      retry.disabled = state.sending;
      lifecycle.on(retry, "click", retryLast);
      bubble.appendChild(retry);
    }

    if (reply.kind !== "fallback") {
      const followups = el("div", "chat-followups");
      followups.append(
        chip("Worked example", () =>
          askFollowUp("Give me one worked example", message)
        ),
        chip("Simpler", () => askFollowUp("Explain it more simply", message)),
        chip("Quiz me", () =>
          askFollowUp("Ask me one practice question on this", message)
        )
      );
      bubble.appendChild(followups);
    }
  }

  function renderTeaching(reply) {
    const wrap = el("div", "learn-teaching");

    const head = el("div", "learn-teaching-head");
    if (reply.title) head.appendChild(el("h3", "learn-title", reply.title));
    const tags = el("div", "learn-teaching-tags");
    if (reply.level) {
      tags.appendChild(
        el(
          "span",
          "learn-badge learn-badge--soft",
          LEVEL_LABEL[reply.level] || reply.level
        )
      );
    }
    if (reply.source === "authored") {
      tags.appendChild(el("span", "learn-badge learn-badge--ok", "Reviewed lesson"));
    }
    head.appendChild(tags);
    wrap.appendChild(head);

    if (reply.personalization) {
      wrap.appendChild(el("p", "learn-personal", reply.personalization));
    }
    if (reply.fallbackNote) {
      wrap.appendChild(
        el("p", "learn-callout learn-callout--warn", reply.fallbackNote)
      );
    }
    if (reply.directAnswer) {
      wrap.appendChild(el("p", "learn-lead", reply.directAnswer));
    }

    for (const section of reply.sections || []) {
      const block = el("section", "learn-section");
      block.appendChild(el("h4", null, section.heading));
      block.appendChild(el("p", null, section.body));
      if (section.equation) {
        const pre = el("pre", "learn-equation");
        pre.appendChild(el("code", null, section.equation));
        block.appendChild(pre);
      }
      wrap.appendChild(block);
    }

    wrap.appendChild(renderExample(reply.example));

    if (reply.advanced) {
      const details = el("details", "learn-advanced");
      details.appendChild(
        el("summary", null, reply.advanced.heading || "Go deeper")
      );
      details.appendChild(el("p", null, reply.advanced.body));
      wrap.appendChild(details);
    }

    return wrap;
  }

  function renderExample(example) {
    const block = el("div", "learn-example");
    if (!example) {
      block.hidden = true;
      return block;
    }
    const head = el("div", "learn-example-head");
    head.appendChild(el("span", "learn-badge learn-badge--soft", "Worked example"));
    block.appendChild(head);
    if (example.problem) {
      block.appendChild(el("p", "learn-example-problem", example.problem));
    }
    if (Array.isArray(example.steps) && example.steps.length) {
      const steps = el("ol", "learn-steps");
      for (const step of example.steps) steps.appendChild(el("li", null, step));
      block.appendChild(steps);
    }
    if (example.answer) {
      const answer = el("p", "learn-answer");
      answer.appendChild(el("strong", null, "Answer:"));
      answer.appendChild(document.createTextNode(` ${example.answer}`));
      block.appendChild(answer);
    }
    return block;
  }

  function renderVisual(bubble, visual) {
    const slot = el("div", "chat-visual");
    bubble.appendChild(slot);
    import("./chat/visual.js")
      .then((mod) => {
        if (lifecycle.disposed || !slot.isConnected) return;
        const unmount = mod.mountVisual(slot, visual);
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

  /* ── Check card and evaluation ──────────────────────────────────────── */

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
    wrap.appendChild(
      renderFeedbackGroup("What was missing", evaluation.missing || [])
    );

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
        askFollowUp(
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
    if (!check || !user) return;
    setNotice(null);

    const data = await callTutor(getToken, "evaluate", {
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
      const saved = await emitLearningEvent(getToken, {
        ...data.learningEvent,
        eventId: `chat_${message.id}_${Date.now()}`,
        source: data.learningEvent.source || "chat",
      });
      if (!saved && !lifecycle.disposed) {
        setNotice(
          "Your feedback is shown, but this answer could not be saved to your progress. Retrying will not duplicate it."
        );
      }
    }
  }

  /* ── Sending, retry and follow-ups ──────────────────────────────────── */

  function setSending(value) {
    state.sending = value;
    if (els.thinking) els.thinking.hidden = !value;
    if (els.input) els.input.disabled = value;
    if (els.send) els.send.textContent = value ? "…" : "Send";
    updateSendButton();
    for (const button of root.querySelectorAll(".chat-retry")) {
      button.disabled = value;
    }
    updateQuickbar();
    if (value) scrollToEnd();
  }

  function updateSendButton() {
    if (!els.send || !els.input) return;
    els.send.disabled = state.sending || !els.input.value.trim();
  }

  function updateComposerMeta() {
    if (!els.input || !els.charCount) return;
    const length = els.input.value.length;
    els.charCount.textContent = `${length}/2000`;
    els.charCount.hidden = length <= 1600;
  }

  function bindComposer() {
    lifecycle.on(els.input, "input", () => {
      if (els.input.value.length > 2000) {
        els.input.value = els.input.value.slice(0, 2000);
      }
      updateComposerMeta();
      updateSendButton();
    });

    lifecycle.on(els.input, "keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendQuestion(els.input.value);
      }
    });

    lifecycle.on(els.form, "submit", (event) => {
      event.preventDefault();
      sendQuestion(els.input.value);
    });
  }

  function bindScroll() {
    lifecycle.on(
      els.log,
      "scroll",
      () => {
        if (!els.latest) return;
        const atBottom =
          els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 80;
        els.latest.hidden = atBottom;
      },
      { passive: true }
    );

    lifecycle.on(els.latest, "click", () => scrollToEnd());
  }

  function scrollToEnd() {
    if (!els.log) return;
    els.log.scrollTo({ top: els.log.scrollHeight, behavior: "smooth" });
  }

  function sendQuestion(text) {
    const question = String(text || "").trim();
    if (!question || state.sending || state.inFlight || !user) return;
    const base = state.messages;
    const userMessage = { id: makeId(), role: "user", content: question };
    if (els.input) els.input.value = "";
    updateComposerMeta();
    updateSendButton();
    void runChat(question, base, userMessage);
  }

  async function runChat(question, base, userMessage, persistUser = true) {
    if (state.inFlight) return;
    state.inFlight = true;
    state.messages = [...base, userMessage];
    els.messages.appendChild(renderMessage(userMessage));
    showStarters(false);
    setSending(true);
    setNotice(null);

    const controller = new AbortController();
    abortController = controller;

    if (user && ctx.db) {
      try {
        if (!state.chatId) {
          const chatRef = await createChatSession(ctx.db, user.uid, question);
          state.chatId = chatRef.id;
        }
        if (persistUser && !lifecycle.disposed) {
          await saveChatMessage(ctx.db, user.uid, state.chatId, {
            role: "user",
            content: question,
          });
        }
      } catch (err) {
        console.warn("Could not save chat message:", err);
      }
    }

    const history = base
      .filter((message) => message.id !== "welcome")
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.reply ? message.reply.directAnswer : message.content,
      }));
    const summary = summarizeConversation(
      base
        .slice(0, Math.max(0, base.length - 6))
        .map((message) => ({
          role: message.role,
          content: message.content,
          title: message.reply?.title || null,
        }))
    );

    try {
      const data = await callTutor(
        getToken,
        "chat",
        {
          question,
          history,
          summary,
          context: {
            track: state.context.board || undefined,
            classNum: state.context.classNum || undefined,
            subject: state.context.subject || undefined,
            language: state.context.language,
          },
        },
        { signal: controller.signal, dedupe: false }
      );

      if (lifecycle.disposed) return;

      const assistant = {
        id: makeId(),
        role: "assistant",
        content: data.reply.directAnswer,
        reply: data.reply,
        meta: data.meta,
      };
      state.messages = [...base, userMessage, assistant];
      els.messages.appendChild(renderMessage(assistant));
      state.lastAttempt = data.reply.retry
        ? { question, base, userMessage }
        : null;
      scrollToEnd();

      if (ctx.db && state.chatId) {
        try {
          await saveChatMessage(ctx.db, user.uid, state.chatId, {
            role: "assistant",
            content: data.reply.directAnswer,
            reply: data.reply,
            meta: data.meta,
          });
        } catch (err) {
          console.warn("Could not save tutor reply:", err);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError" || lifecycle.disposed) return;
      const tutorError = err instanceof TutorError ? err : null;

      if (tutorError?.code === "limit_reached") {
        if (!ctx.isPro) {
          ctx.showUpgrade({
            type: "chat",
            used: tutorError.used,
            limit: tutorError.limit,
          });
        }
        const text =
          tutorError.message ||
          "You have reached your daily free chat limit. Upgrade to Learning Allied Pro for unlimited conversations.";
        const assistant = {
          id: makeId(),
          role: "assistant",
          content: text,
          reply: fallbackReply(text, "limit"),
          error: true,
        };
        state.messages = [...base, userMessage, assistant];
        els.messages.appendChild(renderMessage(assistant));
        state.lastAttempt = null;
        scrollToEnd();
        return;
      }

      const text =
        tutorError?.message ||
        "I could not reach the tutor just now. Your question has not been answered. Please retry.";
      const assistant = {
        id: makeId(),
        role: "assistant",
        content: text,
        reply: fallbackReply(text, "unavailable", true),
        error: true,
      };
      state.messages = [...base, userMessage, assistant];
      els.messages.appendChild(renderMessage(assistant));
      state.lastAttempt = { question, base, userMessage };
      scrollToEnd();
    } finally {
      state.inFlight = false;
      if (!lifecycle.disposed) {
        setSending(false);
        updateQuickbar();
      }
      if (abortController === controller) abortController = null;
    }
  }

  function retryLast() {
    if (!state.lastAttempt || state.sending || state.inFlight) return;
    const attempt = state.lastAttempt;
    state.lastAttempt = null;
    state.messages = attempt.base;
    renderAll();
    void runChat(attempt.question, attempt.base, attempt.userMessage, false);
  }

  function askFollowUp(prompt, message) {
    const topic = message?.reply?.title;
    sendQuestion(topic ? `${prompt} (about ${topic})` : prompt);
  }

  function chip(label, handler) {
    const button = el("button", "chat-chip", label);
    button.type = "button";
    lifecycle.on(button, "click", handler);
    return button;
  }

  function showStarters(show) {
    if (!els.starters) return;
    els.starters.hidden = !show;
    if (show && !els.starters.childElementCount) {
      for (const starter of STARTERS) {
        const button = el("button", "chat-starter", starter);
        button.type = "button";
        lifecycle.on(button, "click", () => sendQuestion(starter));
        els.starters.appendChild(button);
      }
    }
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
        askFollowUp("Quiz me on what we just covered", lastAssistant)
      ),
      chip("Real-world example", () =>
        askFollowUp("Connect this to a real-world example", lastAssistant)
      )
    );
    els.quickbar.hidden = false;
  }

  function setNotice(text) {
    if (!els.notice) return;
    els.notice.textContent = text || "";
    els.notice.hidden = !text;
  }

  /* ── Resume ─────────────────────────────────────────────────────────── */

  function readResumeId() {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("id");
      if (fromUrl) return fromUrl;
      return (
        sessionStorage.getItem("learning-allied-open-chat") ||
        sessionStorage.getItem("aquila_open_chat")
      );
    } catch (_) {
      return null;
    }
  }

  async function resumeSession(id) {
    state.loadingChat = true;
    showStarters(false);
    if (els.loading) els.loading.hidden = false;

    try {
      const db = ctx.db;
      if (!db) return;
      const session = await loadChatSession(db, user.uid, id);
      if (lifecycle.disposed) return;
      if (!session) {
        setNotice(
          "That saved chat could not be found. Starting a new conversation."
        );
        return;
      }

      state.chatId = session.id;
      const loaded = session.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reply: message.reply || undefined,
        meta: message.meta || undefined,
      }));
      state.messages = loaded.length ? loaded : [welcomeMessage()];
      state.lastAttempt = null;
      setNotice(null);
      try {
        sessionStorage.removeItem("learning-allied-open-chat");
        sessionStorage.removeItem("aquila_open_chat");
      } catch (_) {
        /* storage may be unavailable */
      }
      renderAll();
    } catch (err) {
      console.warn("Could not load saved chat:", err);
      if (!lifecycle.disposed) {
        setNotice(
          "This saved chat could not be loaded. You can keep chatting here."
        );
      }
    } finally {
      state.loadingChat = false;
      if (!lifecycle.disposed) {
        if (els.loading) els.loading.hidden = true;
        showStarters(state.messages.length === 1);
        updateQuickbar();
      }
    }
  }
}
