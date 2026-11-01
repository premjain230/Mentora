/**
 * Composer: auto-growing textarea, character budget, Enter to send, and a
 * send/stop control that aborts the browser request while the tutor is working.
 */

const MAX_CHARS = 2000;
const MAX_HEIGHT = 200;
const DEFAULT_LABEL = "Send message";
const STOP_LABEL = "Stop waiting for the answer";

export function createComposer(app) {
  const { state, els, lifecycle } = app;

  function autoGrow() {
    if (!els.input) return;
    els.input.style.height = "auto";
    const next = Math.min(els.input.scrollHeight, MAX_HEIGHT);
    els.input.style.height = `${next}px`;
    els.input.style.overflowY =
      els.input.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    const box = els.form?.querySelector(".chat-composer-box");
    if (box) box.classList.toggle("is-expanded", next > 46);
  }

  function updateMeta() {
    if (!els.input || !els.charCount) return;
    const length = els.input.value.length;
    els.charCount.textContent = `${length}/${MAX_CHARS}`;
    els.charCount.hidden = length <= 1600;
  }

  function updateSendButton() {
    if (!els.send || !els.input) return;
    const busy = state.inFlight;
    els.send.dataset.state = busy ? "stop" : "send";
    els.send.disabled = busy ? false : !els.input.value.trim();
    els.send.setAttribute("aria-label", busy ? STOP_LABEL : DEFAULT_LABEL);
    els.send.title = busy ? "Stop waiting" : "Send";
    els.form?.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function reset() {
    if (!els.input) return;
    els.input.value = "";
    autoGrow();
    updateMeta();
    updateSendButton();
  }

  function setDraft(text) {
    if (!els.input) return;
    els.input.value = String(text || "");
    autoGrow();
    updateMeta();
    updateSendButton();
    els.input.focus();
    const end = els.input.value.length;
    els.input.setSelectionRange(end, end);
  }

  function submit() {
    if (state.inFlight) {
      app.stopGeneration();
      return;
    }
    app.sendQuestion(els.input.value);
  }

  function bind() {
    lifecycle.on(els.input, "input", () => {
      if (els.input.value.length > MAX_CHARS) {
        els.input.value = els.input.value.slice(0, MAX_CHARS);
      }
      autoGrow();
      updateMeta();
      updateSendButton();
    });

    lifecycle.on(els.input, "keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (state.inFlight) return;
      app.sendQuestion(els.input.value);
    });

    lifecycle.on(els.form, "submit", (event) => {
      event.preventDefault();
      submit();
    });
  }

  return {
    bind,
    autoGrow,
    updateMeta,
    updateSendButton,
    reset,
    setDraft,
  };
}
