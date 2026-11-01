/**
 * Composer: auto-growing textarea, character budget, Enter to send.
 */

const MAX_CHARS = 2000;
const MAX_HEIGHT = 176;

export function createComposer(app) {
  const { els, state, lifecycle } = app;

  function autoGrow() {
    if (!els.input) return;
    els.input.style.height = "auto";
    els.input.style.height = `${Math.min(els.input.scrollHeight, MAX_HEIGHT)}px`;
  }

  function updateMeta() {
    if (!els.input || !els.charCount) return;
    const length = els.input.value.length;
    els.charCount.textContent = `${length}/${MAX_CHARS}`;
    els.charCount.hidden = length <= 1600;
  }

  function updateSendButton() {
    if (!els.send || !els.input) return;
    const busy = state.sending;
    els.send.disabled = busy || !els.input.value.trim();
    els.send.classList.toggle("is-busy", busy);
    els.form?.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function reset() {
    if (!els.input) return;
    els.input.value = "";
    autoGrow();
    updateMeta();
    updateSendButton();
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
      app.sendQuestion(els.input.value);
    });

    lifecycle.on(els.form, "submit", (event) => {
      event.preventDefault();
      app.sendQuestion(els.input.value);
    });
  }

  return { bind, autoGrow, updateMeta, updateSendButton, reset };
}
