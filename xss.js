export function escapeHtml(text) {
  if (typeof text !== "string") return "";
  var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
