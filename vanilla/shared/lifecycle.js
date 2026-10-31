export function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);
}

/**
 * Groups every listener, observer and timer owned by a vanilla controller so a
 * single dispose() (or React StrictMode remount) cannot leak them.
 */
export function createLifecycle() {
  const controller = new AbortController();
  const disposers = [];
  let disposed = false;

  return {
    get signal() {
      return controller.signal;
    },
    get disposed() {
      return disposed;
    },
    on(target, type, handler, options) {
      if (!target) return;
      target.addEventListener(type, handler, {
        ...options,
        signal: controller.signal,
      });
    },
    add(disposer) {
      if (typeof disposer === "function") disposers.push(disposer);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const fn of disposers.splice(0)) {
        try {
          fn();
        } catch {}
      }
    },
  };
}
