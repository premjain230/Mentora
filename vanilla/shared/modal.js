const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createModalController(lifecycle) {
  let active = null;
  let lastFocus = null;

  function focusables(modal) {
    return Array.from(modal.querySelectorAll(FOCUSABLE)).filter(
      (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true"
    );
  }

  function open(modal, options = {}) {
    if (!modal) return null;
    if (active && active !== modal) close(active);

    lastFocus = document.activeElement;
    active = modal;
    modal.hidden = false;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const initial = options.initialFocus || focusables(modal)[0] || modal;
    requestAnimationFrame(() => {
      if (active === modal && typeof initial.focus === "function") initial.focus();
    });
    return modal;
  }

  function close(modal = active) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
    if (active === modal) active = null;
    if (!active) document.body.classList.remove("modal-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  function onKeydown(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables(active);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  lifecycle.on(document, "keydown", onKeydown);
  lifecycle.add(() => {
    if (active) close();
    document.body.classList.remove("modal-open");
  });

  return {
    open,
    close,
    get active() {
      return active;
    },
    isOpen(modal) {
      return Boolean(modal) && active === modal;
    },
  };
}
