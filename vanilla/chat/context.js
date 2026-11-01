/**
 * Learning context: board / class / subject / language. The selects live in a
 * header popover; the header shows a compact summary of the active context.
 */

import { callTutor } from "../../lib/learning/types";
import { option } from "./messages.js";

const STORAGE_KEY = "learning-allied-tutor-context";

const LANGUAGE_LABEL = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

export function createContext(app) {
  const { els, state, lifecycle } = app;

  function hydrateTopbar() {
    if (!app.user) return;
    const displayName =
      app.ctx.userData?.displayName ||
      app.user.displayName ||
      (app.user.email ? app.user.email.split("@")[0] : "there");

    if (els.avatar && app.user.photoURL) {
      els.avatar.src = app.user.photoURL;
      els.avatar.alt = displayName;
    }

    if (els.proTag) els.proTag.hidden = !app.ctx.isPro;
  }

  function readSavedContext() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.board === "string") state.context.board = saved.board;
      if (saved.classNum != null && Number.isFinite(Number(saved.classNum))) {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.context));
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
    renderSummary();
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

  function summaryParts() {
    const track = selectedTrack();
    const parts = [track ? track.label : "General"];
    if (state.context.classNum) parts.push(`Class ${state.context.classNum}`);
    parts.push(state.context.subject || "All subjects");
    parts.push(LANGUAGE_LABEL[state.context.language] || "English");
    return parts;
  }

  function renderSummary() {
    if (!els.contextChips) return;
    const parts = summaryParts();
    els.contextChips.textContent = parts.join(" · ");
    els.contextChips.title = parts.join(" · ");
    if (els.contextBtn) {
      els.contextBtn.setAttribute(
        "aria-label",
        `Learning context: ${parts.join(", ")}. Change it`
      );
    }
  }

  function openPanel() {
    if (!els.contextPanel) return;
    els.contextPanel.hidden = false;
    if (els.contextBtn) els.contextBtn.setAttribute("aria-expanded", "true");
    const first = els.board || els.contextPanel.querySelector("select");
    if (first) first.focus();
  }

  function closePanel() {
    if (!els.contextPanel || els.contextPanel.hidden) return;
    els.contextPanel.hidden = true;
    if (els.contextBtn) els.contextBtn.setAttribute("aria-expanded", "false");
  }

  function togglePanel() {
    if (!els.contextPanel) return;
    if (els.contextPanel.hidden) openPanel();
    else closePanel();
  }

  async function loadCatalog() {
    if (!app.user) return;
    try {
      const res = await callTutor(app.getToken, "catalog", {});
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
    if (!app.user || !state.context.board) {
      state.subjects = [];
      renderSubjects();
      return;
    }
    const board = state.context.board;
    const classNum = state.context.classNum;
    try {
      const res = await callTutor(app.getToken, "catalog", {
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
    renderSummary();
  }

  function bindContext() {
    lifecycle.on(els.contextBtn, "click", togglePanel);

    lifecycle.on(document, "click", (event) => {
      if (!els.contextPanel || els.contextPanel.hidden) return;
      const target = event.target;
      if (els.contextPanel.contains(target) || els.contextBtn?.contains(target)) {
        return;
      }
      closePanel();
    });

    lifecycle.on(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.contextPanel && !els.contextPanel.hidden) {
        closePanel();
        els.contextBtn?.focus();
      }
    });

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
      renderSummary();
    });

    lifecycle.on(els.language, "change", () => {
      state.context.language = els.language.value;
      persistContext();
      renderSummary();
    });
  }

  return {
    hydrateTopbar,
    readSavedContext,
    persistContext,
    selectedTrack,
    renderContext,
    loadCatalog,
    loadSubjects,
    renderSummary,
    openPanel,
    closePanel,
    togglePanel,
    bindContext,
  };
}
