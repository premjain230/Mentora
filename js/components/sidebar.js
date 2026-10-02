/**
 * Sidebar loader.
 *
 * The markup lives in /sidebar.html and the styles in /css/sidebar.css. This
 * file only fetches the fragment and wires behaviour. To change the nav, edit
 * sidebar.html — not this file.
 *
 * Usage (once per page, anywhere before </body>):
 *   <div id="sidebarMount"></div>
 *   <script type="module">
 *     import { mountSidebar } from "./js/components/sidebar.js";
 *     await mountSidebar();                    // active item auto-detected
 *     await mountSidebar("home.html");         // or force the active item
 *   </script>
 *
 * Notes:
 *  - Requires an HTTP server (Vercel, or VS Code Live Server). Opening the page
 *    via file:// will fail on fetch() and the sidebar will be skipped.
 *  - mountSidebar() is async, so await it if the page depends on #navSection
 *    existing immediately. It resolves to the <aside> element, or null.
 */

import { pageUrl } from "../../api-base.js";

const MOBILE_BREAKPOINT = 880;
const SIDEBAR_URL = "/sidebar.html";

/** "/chat.html" -> "chat", "/" -> "home". Used to match data-nav values. */
function navKey(raw) {
  const seg = String(raw || "").split("?")[0].split("#")[0].split("/").filter(Boolean).pop() || "";
  return seg.replace(/\.html$/, "") || "home";
}

export async function mountSidebar(active) {
  const mount = document.getElementById("sidebarMount");
  if (!mount) return null;

  // Accept both mountSidebar() and the older mountSidebar({ activeHref }).
  const activeHref = typeof active === "string" ? active : active?.activeHref;

  let html;
  try {
    const res = await fetch(SIDEBAR_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error(`[sidebar] could not load ${SIDEBAR_URL}:`, err);
    console.warn("[sidebar] serve the folder over http (e.g. VS Code Live Server) — fetch() does not work on file://");
    return null;
  }

  mount.innerHTML = html;

  // Resolve clean URLs for local static serving (/chat -> /chat.html).
  if (pageUrl("/chat") !== "/chat") {
    mount.querySelectorAll("a[href^='/']").forEach((a) => {
      const href = a.getAttribute("href")
      a.setAttribute("href", pageUrl(href));
    });
  }

  highlightActive(mount, navKey(activeHref || location.pathname));
  wireInteractions(mount);
  watchOverflow(mount);
  return mount.querySelector(".sidebar");
}

/**
 * Toggles data-scrollable on the nav list so css/sidebar.css only applies the
 * top/bottom fade mask when the list actually overflows. Without this, the first
 * and last items look permanently faded on a short nav.
 */
function watchOverflow(mount) {
  const nav = mount.querySelector(".nav-section");
  if (!nav) return;

  const sync = () => {
    const scrollable = nav.scrollHeight - nav.clientHeight > 4;
    nav.dataset.scrollable = String(scrollable);
  };

  sync();
  if (typeof ResizeObserver === "function") new ResizeObserver(sync).observe(nav);
  if (typeof MutationObserver === "function") new MutationObserver(sync).observe(nav, { childList: true, subtree: true });
  window.addEventListener("resize", sync, { passive: true });
}

function highlightActive(mount, currentKey) {
  mount.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === currentKey);
  });
}

function wireInteractions(mount) {
  const sidebar = mount.querySelector(".sidebar");
  const overlay = mount.querySelector(".sidebar-overlay");
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = mount.querySelector(".sidebar-close");
  const main = document.querySelector(".main");

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

  function openSidebar() {
    if (!sidebar || !isMobile()) return;
    sidebar.classList.add("open");
    overlay?.classList.add("open");
    menuBtn?.setAttribute("aria-expanded", "true");
    document.body.classList.add("sidebar-open");
    if (main) main.inert = true;
    requestAnimationFrame(() => closeBtn?.focus());
  }

  function closeSidebar({ restoreFocus = true } = {}) {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    overlay?.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sidebar-open");
    if (main) main.inert = false;
    if (restoreFocus && isMobile()) menuBtn?.focus();
  }

  function toggleNavGroup(toggle) {
    if (!toggle) return;
    const open = !toggle.classList.contains("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.nextElementSibling?.classList.toggle("open", open);
  }

  menuBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", () => closeSidebar());
  overlay?.addEventListener("click", () => closeSidebar());

  mount.querySelectorAll(".nav-group-toggle").forEach((btn) => {
    btn.addEventListener("click", () => toggleNavGroup(btn));
  });

  // Close the drawer on mobile after any nav choice.
  mount.querySelectorAll(".nav-item:not(.nav-group-toggle)").forEach((el) => {
    el.addEventListener("click", () => {
      if (isMobile()) closeSidebar({ restoreFocus: false });
    });
  });

  // Escape closes; Tab is trapped inside the open drawer.
  document.addEventListener("keydown", (event) => {
    if (!sidebar?.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSidebar();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...sidebar.querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")].filter(
      (el) => el.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Never leave a stale open drawer behind when growing past the breakpoint.
  let wasMobile = isMobile();
  window.addEventListener(
    "resize",
    () => {
      const next = isMobile();
      if (wasMobile && !next) closeSidebar({ restoreFocus: false });
      wasMobile = next;
    },
    { passive: true },
  );

  // Legacy globals — inline onclick handlers and the admin dashboard rely on these.
  window.toggleNavGroup = toggleNavGroup;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
}
