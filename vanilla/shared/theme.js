const PRIMARY_KEY = "learning-allied-theme";
const LEGACY_KEY = "aquila-theme";

export function getTheme() {
  try {
    const value =
      localStorage.getItem(PRIMARY_KEY) || localStorage.getItem(LEGACY_KEY);
    return value === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("light-mode", resolved === "light");
  return resolved;
}

export function setTheme(theme) {
  const resolved = applyTheme(theme);
  try {
    localStorage.setItem(PRIMARY_KEY, resolved);
    localStorage.setItem(LEGACY_KEY, resolved);
  } catch {
    /* storage can be unavailable in private browsing */
  }
  window.dispatchEvent(
    new CustomEvent("learning-allied-theme-change", { detail: { theme: resolved } })
  );
  return resolved;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}
