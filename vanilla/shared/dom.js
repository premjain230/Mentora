export function qs(root, selector) {
  return root ? root.querySelector(selector) : null;
}

export function qsa(root, selector) {
  return root ? Array.from(root.querySelectorAll(selector)) : [];
}

export function setText(root, selector, value, fallback = "") {
  const element = qs(root, selector);
  if (!element) return null;
  element.textContent = value == null || value === "" ? fallback : String(value);
  return element;
}

export function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = Boolean(hidden);
  element.setAttribute("aria-hidden", hidden ? "true" : "false");
}

export function setBusy(element, busy) {
  if (!element) return;
  element.classList.toggle("is-busy", Boolean(busy));
  if ("disabled" in element) element.disabled = Boolean(busy);
  element.setAttribute("aria-busy", busy ? "true" : "false");
}
