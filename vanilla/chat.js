/**
 * Chat controller — conversation shell, tutor calls and persistence.
 *
 * The view is split into small modules under vanilla/chat/: context popover,
 * transcript, check cards, conversation rail and composer. Tutor calls,
 * learning events and message storage still go through the same shared clients
 * the page used before, and `mount(root, ctx)` stays the entry point.
 */

import {
  chatTitleFrom,
  createChatSession,
  loadChatSession,
  loadEarlierChatMessages,
  renameChatSession,
  saveChatMessage,
} from "../lib/chat-store";
import {
  callTutor,
  summarizeConversation,
  TutorError,
} from "../lib/learning/types";
import { createLifecycle } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";
import { NEW_CHAT_TITLE, fallbackReply, makeId } from "./chat/messages.js";
import { createContext } from "./chat/context.js";
import { createTranscript } from "./chat/transcript.js";
import { createCheck } from "./chat/check.js";
import { createRail } from "./chat/rail.js";
import { createComposer } from "./chat/composer.js";

const MESSAGE_PAGE = 40;

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const els = {
    messages: root.querySelector("#chatMessages"),
    log: root.querySelector("#chatLog"),
    empty: root.querySelector("#chatEmpty"),
    starters: root.querySelector("#chatStarters"),
    loading: root.querySelector("#chatLoading"),
    thinking: root.querySelector("#chatThinking"),
    latest: root.querySelector("#chatLatestBtn"),
    notice: root.querySelector("#chatProgressNotice"),
    quickbar: root.querySelector("#chatQuickbar"),
    form: root.querySelector("#chatForm"),
    input: root.querySelector("#chatInput"),
    send: root.querySelector("#chatSend"),
    charCount: root.querySelector("#chatCharCount"),
    earlier: root.querySelector("#chatEarlier"),
    title: root.querySelector("#chatTitle"),
    titleInput: root.querySelector("#chatTitleInput"),
    contextBtn: root.querySelector("#chatContextBtn"),
    contextChips: root.querySelector("#chatContextChips"),
    contextPanel: root.querySelector("#chatContextPanel"),
    board: root.querySelector("#chatBoard"),
    classSelect: root.querySelector("#chatClass"),
    subject: root.querySelector("#chatSubject"),
    language: root.querySelector("#chatLanguage"),
    avatar: root.querySelector("#topbarAvatar"),
    proTag: root.querySelector("#chatProTag"),
    workspace: root.querySelector("#chatWorkspace"),
    rail: root.querySelector("#chatRail"),
    railList: root.querySelector("#chatRailList"),
    railSearch: root.querySelector("#chatSearch"),
    railNew: root.querySelector("#chatRailNew"),
    railCollapse: root.querySelector("#chatRailCollapse"),
    railClose: root.querySelector("#chatRailClose"),
    railToggle: root.querySelector("#chatRailToggle"),
    scrim: root.querySelector("#chatRailScrim"),
    menu: root.querySelector("#chatRailMenu"),
    menuPin: root.querySelector("#chatRailMenuPin"),
    menuPinLabel: root.querySelector("#chatRailMenuPinLabel"),
    deleteModal: root.querySelector("#chatDeleteModal"),
    deleteText: root.querySelector("#chatDeleteText"),
    deleteClose: root.querySelector("#chatDeleteClose"),
    deleteCancel: root.querySelector("#chatDeleteCancel"),
    deleteConfirm: root.querySelector("#chatDeleteConfirm"),
  };

  if (!els.messages || !els.log || !els.form) {
    return () => lifecycle.dispose();
  }

  const state = {
    messages: [],
    tracks: [],
    subjects: [],
    profile: null,
    context: { board: "", classNum: null, subject: "", language: "en" },
    sending: false,
    inFlight: false,
    loadingChat: false,
    lastAttempt: null,
    chatId: null,
    title: NEW_CHAT_TITLE,
    hasEarlier: false,
    earlierCursor: null,
    earlierLoading: false,
    visualUnmounts: [],
  };

  let abortController = null;
  const user = ctx.user;
  const getToken = () => ctx.user.getIdToken();
  const toast = mountToast(root, lifecycle);

  const app = {
    root,
    els,
    state,
    lifecycle,
    ctx,
    user,
    db: ctx.db,
    getToken,
    notify: (message, type = "info") => toast.show(message, type),
    tutor: (action, payload = {}, options) =>
      callTutor(getToken, action, payload, options),
    setNotice,
    setSending,
    stopGeneration,
    scrollToEnd,
    setTitle,
    persistTitle,
    beginDraft,
    startNewChat,
    openConversation,
    sendQuestion,
    retryLast,
    askFollowUp,
    resumeSession,
    loadEarlier,
  };

  // Namespaces are kept intact because the transcript and the orchestrator call
  // `app.transcript.*`, `app.check.*` and friends; flattening them onto `app`
  // leaves every `app.<namespace>` undefined at mount time.
  app.context = createContext(app);
  app.transcript = createTranscript(app);
  app.check = createCheck(app);
  app.rail = createRail(app);
  app.composer = createComposer(app);

  app.context.hydrateTopbar();
  app.context.readSavedContext();
  app.context.renderContext();
  app.transcript.renderAll({ scroll: false });
  app.composer.bind();
  app.composer.autoGrow();
  app.context.bindContext();
  app.transcript.bindScroll();
  app.rail.bind();
  bindTitle();
  bindEarlier();

  void app.context.loadCatalog();
  void app.rail.refresh();

  const resumeId = readResumeId();
  if (resumeId && user) void app.resumeSession(resumeId);

  lifecycle.add(() => {
    try {
      abortController?.abort();
    } catch (_) {
      /* already aborted */
    }
    app.transcript.clearVisuals();
  });

  return () => lifecycle.dispose();

  /* ── Page chrome ────────────────────────────────────────────────────── */

  function bindTitle() {
    lifecycle.on(els.title, "click", () => {
      if (!state.chatId || state.sending) return;
      els.titleInput.value = state.title;
      els.titleInput.hidden = false;
      els.title.hidden = true;
      els.titleInput.focus();
      els.titleInput.select();
    });

    const finish = (commit) => {
      if (!els.titleInput || els.titleInput.hidden) return;
      const value = els.titleInput.value;
      els.titleInput.hidden = true;
      els.title.hidden = false;
      if (commit) void persistTitle(value);
    };

    lifecycle.on(els.titleInput, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });

    lifecycle.on(els.titleInput, "blur", () => finish(true));
  }

  function bindEarlier() {
    lifecycle.on(els.earlier, "click", () => void loadEarlier());
  }

  function setTitle(value) {
    state.title = value || NEW_CHAT_TITLE;
    if (!els.title) return;
    const label = els.title.querySelector(".chat-title-text");
    if (label) label.textContent = state.title;
    else els.title.textContent = state.title;
    els.title.disabled = !state.chatId;
    els.title.setAttribute(
      "title",
      state.chatId ? "Rename conversation" : "Start a conversation to name it"
    );
  }

  async function persistTitle(value) {
    if (!state.chatId || !user || !ctx.db) return;
    const clean = String(value || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (!clean) {
      app.notify("A conversation title cannot be empty.", "error");
      return;
    }
    if (clean === state.title) return;
    try {
      const saved = await renameChatSession(ctx.db, user.uid, state.chatId, clean);
      setTitle(saved);
      void app.rail.refresh();
    } catch (err) {
      app.notify(err?.message || "The title could not be saved.", "error");
    }
  }

  function setNotice(text) {
    if (!els.notice) return;
    els.notice.textContent = text || "";
    els.notice.hidden = !text;
  }

  function setSending(value) {
    state.sending = value;
    app.transcript.setSending(value);
    app.composer.updateSendButton();
    app.transcript.updateQuickbar();
    if (value) app.transcript.scrollToEnd();
  }

  function scrollToEnd() {
    app.transcript.scrollToEnd();
  }

  /** Aborts the browser request. The model may still finish server-side, so the
   * UI only claims that we stopped waiting for the answer. */
  function stopGeneration() {
    if (!state.inFlight || !abortController) return;
    const controller = abortController;
    abortController = null;
    try {
      controller.abort();
    } catch (_) {
      /* already aborted */
    }
    state.inFlight = false;
    setSending(false);
    setNotice(
      "Stopped waiting for the tutor's response. Your question is still in this conversation and no answer was added."
    );
  }

  /* ── Conversation switching ─────────────────────────────────────────── */

  function startNewChat(options = {}) {
    try {
      abortController?.abort();
    } catch (_) {
      /* already aborted */
    }
    abortController = null;
    state.inFlight = false;
    state.loadingChat = false;
    state.chatId = null;
    state.messages = [];
    state.hasEarlier = false;
    state.earlierCursor = null;
    state.lastAttempt = null;
    state.sending = false;
    setTitle(null);
    app.transcript.renderAll({ scroll: false });
    app.transcript.setSending(false);
    app.rail.setActive(null);
    if (els.loading) els.loading.hidden = true;
    if (!options.keepNotice) setNotice(null);
    if (!options.skipRefresh) void app.rail.refresh();
    updateHistoryUrl(null);
    clearOpenChatKeys();
    app.composer.updateSendButton();
    els.input?.focus();
  }

  async function openConversation(id) {
    if (!id) return;
    if (id === state.chatId) return;
    if (state.inFlight) {
      try {
        abortController?.abort();
      } catch (_) {
        /* already aborted */
      }
      state.inFlight = false;
      setSending(false);
    }
    await resumeSession(id);
  }

  /* ── Sending ────────────────────────────────────────────────────────── */

  function sendQuestion(text) {
    const question = String(text || "").trim();
    if (!question || state.sending || state.inFlight || state.loadingChat) return;
    if (!user) return;
    if (question.length > 2000) {
      app.notify("Questions are limited to 2000 characters.", "error");
      return;
    }

    const base = state.messages;
    const userMessage = { id: makeId(), role: "user", content: question };
    app.composer.reset();
    els.input?.focus();
    void runChat(question, base, userMessage);
  }

  async function runChat(question, base, userMessage, persistUser = true) {
    if (state.inFlight) return;
    state.inFlight = true;
    state.messages = [...base, userMessage];
    app.transcript.appendMessage(userMessage);
    setSending(true);
    setNotice(null);

    const controller = new AbortController();
    abortController = controller;

    if (user && ctx.db) {
      try {
        if (!state.chatId) {
          const chatRef = await createChatSession(ctx.db, user.uid, question);
          state.chatId = chatRef.id;
          setTitle(chatTitleFrom(question));
          updateHistoryUrl(state.chatId);
          app.rail.setActive(state.chatId);
          void app.rail.refresh();
        }
        if (persistUser) {
          await saveChatMessage(ctx.db, user.uid, state.chatId, {
            role: "user",
            content: question,
          });
        }
      } catch (err) {
        if (!lifecycle.disposed) {
          setNotice(
            "Your question is shown, but this conversation could not be saved. Check your connection — the tutor can still answer."
          );
        }
      }
    }

    const history = base.slice(-6).map((message) => ({
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
      const data = await app.tutor(
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
      if (abortController === controller) abortController = null;

      const assistant = {
        id: makeId(),
        role: "assistant",
        content: data.reply.directAnswer,
        reply: data.reply,
        meta: data.meta,
      };
      state.messages = [...base, userMessage, assistant];
      app.transcript.appendMessage(assistant);
      state.lastAttempt = data.reply.retry
        ? { question, base, userMessage }
        : null;
      app.transcript.scrollToEnd();
      app.transcript.updateQuickbar();

      if (ctx.db && state.chatId) {
        try {
          await saveChatMessage(ctx.db, user.uid, state.chatId, {
            role: "assistant",
            content: data.reply.directAnswer,
            reply: data.reply,
            meta: data.meta,
          });
          void app.rail.refresh();
        } catch (err) {
          if (!lifecycle.disposed) {
            setNotice(
              "This answer is shown, but it could not be saved to your conversation. Retrying the question will not duplicate it."
            );
          }
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
        app.transcript.appendMessage(assistant);
        state.lastAttempt = null;
        app.transcript.scrollToEnd();
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
      app.transcript.appendMessage(assistant);
      state.lastAttempt = { question, base, userMessage };
      app.transcript.scrollToEnd();
    } finally {
      state.inFlight = false;
      if (!lifecycle.disposed) {
        setSending(false);
        app.transcript.updateQuickbar();
      }
      if (abortController === controller) abortController = null;
    }
  }

  function retryLast() {
    if (!state.lastAttempt || state.sending || state.inFlight) return;
    const attempt = state.lastAttempt;
    state.lastAttempt = null;
    state.messages = attempt.base;
    app.transcript.renderAll();
    void runChat(attempt.question, attempt.base, attempt.userMessage, false);
  }

  function askFollowUp(prompt, message) {
    const topic = message?.reply?.title;
    sendQuestion(topic ? `${prompt} (about ${topic})` : prompt);
  }

  function beginDraft(text) {
    app.composer.setDraft(text || "");
  }

  /* ── Resume and history window ──────────────────────────────────────── */

  async function resumeSession(id) {
    if (!ctx.db || !user) return;
    state.loadingChat = true;
    app.transcript.syncEmpty();
    if (els.loading) els.loading.hidden = false;

    try {
      const session = await loadChatSession(ctx.db, user.uid, id, {
        limit: MESSAGE_PAGE,
      });
      if (lifecycle.disposed) return;

      if (!session) {
        if (els.loading) els.loading.hidden = true;
        state.loadingChat = false;
        setNotice("That saved chat could not be found. Starting a new conversation.");
        startNewChat({ keepNotice: true, skipRefresh: true });
        return;
      }

      state.chatId = session.id;
      state.hasEarlier = session.hasMore;
      state.earlierCursor = session.nextCursor;
      state.messages = session.messages.map(toUiMessage);
      state.lastAttempt = null;
      setTitle(session.title);
      app.transcript.renderAll();
      app.rail.setActive(session.id);
      updateHistoryUrl(session.id);
      clearOpenChatKeys();

      if (session.hasMore) {
        setNotice(
          "Showing the most recent messages in this conversation. Load earlier messages above."
        );
      }
    } catch (err) {
      if (!lifecycle.disposed) {
        setNotice("This saved chat could not be loaded. You can keep chatting here.");
      }
    } finally {
      state.loadingChat = false;
      if (!lifecycle.disposed) {
        if (els.loading) els.loading.hidden = true;
        app.transcript.syncEmpty();
        app.transcript.updateQuickbar();
      }
    }
  }

  async function loadEarlier() {
    if (!state.chatId || !state.earlierCursor || state.earlierLoading) return;
    state.earlierLoading = true;
    const button = els.earlier;
    if (button) {
      button.disabled = true;
      button.textContent = "Loading earlier messages…";
    }

    const previousHeight = els.log.scrollHeight;
    const previousTop = els.log.scrollTop;

    try {
      const page = await loadEarlierChatMessages(
        ctx.db,
        user.uid,
        state.chatId,
        state.earlierCursor,
        MESSAGE_PAGE
      );
      if (lifecycle.disposed) return;

      state.earlierCursor = page.nextCursor;
      state.hasEarlier = page.hasMore;

      if (!page.messages.length) {
        setNotice("There are no earlier messages in this conversation.");
      } else {
        const earlier = page.messages.map(toUiMessage);
        state.messages = [...earlier, ...state.messages];
        app.transcript.prependMessages(earlier);
        els.log.scrollTop = previousTop + (els.log.scrollHeight - previousHeight);
      }
    } catch (err) {
      if (!lifecycle.disposed) {
        setNotice("Earlier messages could not be loaded. Please retry.");
      }
    } finally {
      state.earlierLoading = false;
      if (!lifecycle.disposed && button) {
        button.disabled = false;
        button.textContent = "Load earlier messages";
        app.transcript.syncEarlier();
      }
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  function toUiMessage(message) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      reply: message.reply || undefined,
      meta: message.meta || undefined,
    };
  }

  function updateHistoryUrl(id) {
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("id", id);
      else url.searchParams.delete("id");
      const next = `${url.pathname}${url.search}`;
      if (`${window.location.pathname}${window.location.search}` !== next) {
        window.history.replaceState(null, "", next);
      }
    } catch (_) {
      /* history is optional */
    }
  }

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

  function clearOpenChatKeys() {
    try {
      sessionStorage.removeItem("learning-allied-open-chat");
      sessionStorage.removeItem("aquila_open_chat");
    } catch (_) {
      /* storage may be unavailable */
    }
  }
}
