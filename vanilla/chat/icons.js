/**
 * Chat icon geometry. Shared by the static React markup and the vanilla rail so
 * dynamically rendered rows use the exact same strokes as the server markup.
 */

export const ICON_PATHS = {
  panel: '<path d="M3 4.5h14M3 10h14M3 15.5h9" />',
  chevronLeft: '<path d="M12.5 5 7.5 10l5 5" />',
  close: '<path d="m5 5 10 10M15 5 5 15" />',
  plus: '<path d="M10 4v12M4 10h12" />',
  search: '<circle cx="9" cy="9" r="5.25" /><path d="m13 13 3.5 3.5" />',
  history:
    '<path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" /><path d="M3.5 4v3.7H7" /><path d="M10 6.6V10l2.4 1.4" />',
  pencil:
    '<path d="m4 16 1-4 8.6-8.6a1.4 1.4 0 0 1 2 2L7 14l-3 2Z" /><path d="m12 5 3 3" />',
  pin: '<path d="M7 3.5h6l-1 4 3 3v1H5v-1l3-3-1-4Z" /><path d="M10 11.5v5" />',
  trash:
    '<path d="M4.5 6h11" /><path d="M8 6V4.5h4V6" /><path d="M6 6l.7 9.1a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4L14 6" /><path d="M8.5 9v4.5M11.5 9v4.5" />',
  more: '<circle cx="5" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />',
  copy: '<rect x="7" y="7" width="9" height="9" rx="2" /><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-7A1.5 1.5 0 0 0 3 5.5v7A1.5 1.5 0 0 0 4.5 14H6" />',
  thumbsUp: '<path d="M7 10v6M7 10l3.5-6.5a1.5 1.5 0 0 1 2.5 1.2v2.8h4a1.5 1.5 0 0 1 1.5 1.5l-1 5a2 2 0 0 1-2 1.5H7M7 16H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3" />',
  thumbsDown: '<path d="M7 10V4M7 10l3.5 6.5a1.5 1.5 0 0 0 2.5-1.2v-2.8h4a1.5 1.5 0 0 0 1.5-1.5l-1-5a2 2 0 0 0-2-1.5H7M7 4H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3" />',
  check: '<path d="m5 10.5 3.5 3.5L15.5 6.5" />',
  refresh:
    '<path d="M16 10a6 6 0 1 1-1.8-4.3" /><path d="M16 3.5v4h-4" />',
  arrowRight: '<path d="M4 10h11" /><path d="m11 5.5 4.5 4.5L11 14.5" />',
  bulb: '<path d="M10 3.5a5 5 0 0 0-3 9c.5.4.8 1 .8 1.6v.4h4.4v-.4c0-.6.3-1.2.8-1.6a5 5 0 0 0-3-9Z" /><path d="M8 16.5h4" />',
  layers:
    '<path d="m10 3 6.5 3.5L10 10 3.5 6.5 10 3Z" /><path d="m3.5 10 6.5 3.5 6.5-3.5" /><path d="m3.5 13.5 6.5 3.5 6.5-3.5" />',
  message:
    '<path d="M4 5.5h12v7H9.5L6 15.5V12.5H4v-7Z" />',
  target:
    '<circle cx="10" cy="10" r="6.5" /><path d="m7 10 2.2 2.2 4-4.4" />',
  globe:
    '<circle cx="10" cy="10" r="6.5" /><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13" />',
  chevronDown: '<path d="M6 8l4 4 4-4" />',
  pro: '<path d="m10 3 5 3v4.4c0 3-2 5.1-5 6.6-3-1.5-5-3.6-5-6.6V6l5-3Z" />',
  arrowUp: '<path d="M10 16V4.5M5.5 9 10 4.5 14.5 9" />',
  stop: '<rect x="6.5" y="6.5" width="7" height="7" rx="1.4" fill="currentColor" stroke="none" />',
  arrowDown: '<path d="M10 4v11M5.5 10.5 10 15l4.5-4.5" />',
  spark:
    '<path d="M10 2.5 11.6 8l5.4 2-5.4 2-1.6 5.5L8.4 12 3 10l5.4-2L10 2.5Z" />',
};

export function iconMarkup(name, size = 15) {
  const body = ICON_PATHS[name] || "";
  return (
    `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ` +
    `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
  );
}
