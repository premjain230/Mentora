export function mountToast(root, lifecycle, options = {}) {
  if (!root) return { show() {}, hide() {}, element: null };

  let element = root.querySelector("[data-dashboard-toast]");
  const created = !element;

  if (!element) {
    element = document.createElement("div");
    element.className = options.className || "toast dashboard-toast";
    element.setAttribute("data-dashboard-toast", "");
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    root.appendChild(element);
  }

  let timer = null;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function hide() {
    clearTimer();
    element.classList.remove("is-visible");
    element.removeAttribute("data-type");
  }

  function show(message, type = "info", duration = 3200) {
    clearTimer();
    element.textContent = message == null ? "" : String(message);
    element.setAttribute("data-type", type);
    element.classList.add("is-visible");
    if (duration > 0) {
      timer = setTimeout(() => {
        timer = null;
        element.classList.remove("is-visible");
      }, duration);
    }
  }

  lifecycle.add(() => {
    clearTimer();
    if (created) element.remove();
  });

  return { show, hide, element };
}
