/* Aquila — shell polish (nav, search, drawer, a11y, premium feel)
   Loaded on every app page. Safe to include multiple times. */
(function () {
  if (window.__aquilaShellPolish) return;
  window.__aquilaShellPolish = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ── Active nav sync — trustworthy, not hardcoded ── */
  function syncActiveNav() {
    const path = (location.pathname.split("/").pop() || "home.html").toLowerCase();
    const hash = location.hash;
    const isChat = path === "chat.html" || new URLSearchParams(location.search).get("mode") === "chat";
    $$(".nav-item, .upgrade-nav-btn").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      let shouldActive = false;
      if (!href) return;
      if (href.includes("home.html") && path === "home.html" && !isChat) shouldActive = true;
      if (href.includes("chat.html") && (path === "chat.html" || (path === "home.html" && isChat))) shouldActive = true;
      if (href && href !== "#" && path && href.endsWith(path) && !href.includes("home.html") && !href.includes("chat.html")) shouldActive = true;
      if (hash && href.includes(hash)) shouldActive = true;
      if (shouldActive) {
        $$(".nav-item.active, .upgrade-nav-btn.active").forEach((el) => el.classList.remove("active"));
        a.classList.add("active");
        // Expand community if child active
        const grp = a.closest(".nav-group-children");
        if (grp) {
          grp.classList.add("open");
          const tog = grp.previousElementSibling;
          if (tog) { tog.classList.add("open"); tog.setAttribute("aria-expanded", "true"); }
        }
      }
    });
    // Mark duplicates hidden
    const sidebars = $$(".sidebar");
    if (sidebars.length > 1) {
      sidebars.slice(1).forEach((sb) => { sb.style.display = "none"; sb.setAttribute("aria-hidden", "true"); });
    }
  }

  /* ── Community toggle — keyboard + a11y ── */
  function polishCommunityToggles() {
    $$(".nav-group-toggle, .nav-group").forEach((el) => {
      const tog = el.classList.contains("nav-group-toggle") ? el : el.querySelector(".nav-group-toggle");
      const children = el.classList.contains("nav-group") ? el.querySelector(".nav-group-children") : el.nextElementSibling;
      if (!tog || !children) return;
      if (tog.dataset.polished) return;
      tog.dataset.polished = "1";
      // Make accessible if it was a div
      if (tog.tagName !== "BUTTON") {
        tog.setAttribute("role", "button");
        tog.setAttribute("tabindex", "0");
        tog.setAttribute("aria-expanded", children.classList.contains("open") ? "true" : "false");
        tog.setAttribute("aria-controls", children.id || "");
        if (!children.id) children.id = "nav-group-" + Math.random().toString(36).slice(2, 6);
        tog.setAttribute("aria-controls", children.id);
      } else {
        tog.setAttribute("aria-expanded", children.classList.contains("open") ? "true" : "false");
      }
      const toggle = () => {
        const open = tog.classList.toggle("open");
        children.classList.toggle("open", open);
        tog.setAttribute("aria-expanded", String(open));
        // smooth max-height already via CSS
      };
      tog.addEventListener("click", (e) => { e.preventDefault(); toggle(); });
      tog.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        if (e.key === "Escape") { tog.classList.remove("open"); children.classList.remove("open"); tog.setAttribute("aria-expanded", "false"); tog.blur(); }
      });
      // Expose global for inline onclick compatibility
      window.toggleNavGroup = (node) => {
        const t = node && node.classList.contains("nav-group-toggle") ? node : tog;
        const c = t.nextElementSibling || children;
        const o = t.classList.toggle("open");
        if (c) c.classList.toggle("open", o);
        t.setAttribute("aria-expanded", String(o));
      };
    });
  }

  /* ── Sidebar drawer — premium: focus trap, Escape, overlay, safe scroll lock ── */
  function polishDrawer() {
    const sidebar = $("#sidebar");
    const overlay = $("#sidebarOverlay");
    const menuBtn = $("#menuBtn");
    const closeBtn = $("#sidebarClose");
    if (!sidebar || !overlay || sidebar.dataset.polishedDrawer) return;
    sidebar.dataset.polishedDrawer = "1";

    let lastFocus = null;

    function isOpen() { return sidebar.classList.contains("open"); }

    function openDrawer() {
      lastFocus = document.activeElement;
      sidebar.classList.add("open");
      overlay.classList.add("open");
      overlay.style.display = "block";
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      // Move focus to close button for a11y
      setTimeout(() => closeBtn?.focus(), 120);
      // trap
      document.addEventListener("keydown", onKey);
    }
    function closeDrawer() {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
      overlay.style.opacity = "";
      overlay.style.pointerEvents = "";
      setTimeout(() => { if (!isOpen()) overlay.style.display = ""; }, 300);
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (lastFocus && typeof lastFocus.focus === "function") {
        try { lastFocus.focus({ preventScroll: true }); } catch {}
      }
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); closeDrawer(); }
      if (e.key === "Tab" && isOpen()) {
        const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]', sidebar).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    if (menuBtn && !menuBtn.dataset.polished) {
      menuBtn.dataset.polished = "1";
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-controls", "sidebar");
      menuBtn.addEventListener("click", openDrawer);
    }
    if (closeBtn && !closeBtn.dataset.polished) {
      closeBtn.dataset.polished = "1";
      closeBtn.addEventListener("click", closeDrawer);
    }
    if (overlay && !overlay.dataset.polished) {
      overlay.dataset.polished = "1";
      overlay.addEventListener("click", closeDrawer);
    }
    // Close on nav click (mobile)
    $$(".nav-item:not(.nav-group-toggle)", sidebar).forEach((a) => {
      if (a.dataset.drawer) return;
      a.dataset.drawer = "1";
      a.addEventListener("click", () => { if (window.innerWidth <= 880) closeDrawer(); });
    });
    // Expose for other scripts
    window.__aquilaOpenSidebar = openDrawer;
    window.__aquilaCloseSidebar = closeDrawer;
    // Override any prior global openSidebar/closeSidebar to use polished version
    try {
      window.openSidebar = openDrawer;
      window.closeSidebar = closeDrawer;
    } catch {}
  }

  /* ── Topbar search — make it alive ── */
  function polishSearch() {
    const input = $("#topbarSearch");
    if (!input || input.dataset.polishedSearch) return;
    input.dataset.polishedSearch = "1";
    input.setAttribute("type", "search");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", "Search chats, topics, or ask Aquila");
    input.setAttribute("placeholder", input.getAttribute("placeholder") || "Search or ask Aquila…");
    // Clear button
    const wrap = input.parentElement;
    if (wrap && !wrap.querySelector(".topbar-search-clear")) {
      const clr = document.createElement("button");
      clr.type = "button";
      clr.className = "topbar-search-clear";
      clr.setAttribute("aria-label", "Clear search");
      clr.textContent = "×";
      wrap.appendChild(clr);
      const updateClear = () => clr.classList.toggle("show", !!input.value);
      input.addEventListener("input", updateClear);
      clr.addEventListener("click", () => { input.value = ""; updateClear(); input.focus(); filterNav(""); });
      updateClear();
    }
    let t = null;
    function filterNav(q) {
      const nav = $("#navSection");
      if (!nav) return;
      const term = q.trim().toLowerCase();
      if (!term) {
        $$(".nav-item", nav).forEach((a) => { a.style.display = ""; a.style.opacity = ""; });
        $$(".nav-label", nav).forEach((l) => l.style.display = "");
        return;
      }
      $$(".nav-item", nav).forEach((a) => {
        const txt = a.textContent.toLowerCase();
        const show = txt.includes(term);
        a.style.display = show ? "" : "none";
        a.style.opacity = show ? "" : "0.4";
      });
    }
    function goSearch(q) {
      if (!q) return;
      const isChat = location.pathname.endsWith("chat.html") || new URLSearchParams(location.search).get("mode") === "chat";
      if (isChat) {
        const inp = $("#chatInput");
        if (inp) {
          inp.value = q;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          // trigger app's send if available
          if (typeof window.sendMessage === "function") window.sendMessage();
          else inp.focus();
        }
      } else {
        try { sessionStorage.setItem("aquila_pending_prompt", q); } catch {}
        location.href = "chat.html";
      }
    }
    input.addEventListener("input", () => {
      clearTimeout(t);
      const v = input.value;
      filterNav(v);
      // subtle live highlight, not noisy
      t = setTimeout(() => {}, 180);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        goSearch(q);
      }
      if (e.key === "Escape") {
        input.value = "";
        filterNav("");
        input.blur();
      }
    });
    // Focus ring polish already via CSS; ensure parent has relative
    if (wrap) wrap.style.position = "relative";
  }

  /* ── Toast stacking polish ── */
  function polishToasts() {
    // Ensure single container at bottom safe area
    let c = $("#toastContainer");
    if (!c) {
      // chat/home use #toast single; upgrade to stacked container
      const single = $("#toast");
      if (single && !single.parentElement.classList.contains("toast-container")) {
        c = document.createElement("div");
        c.id = "toastContainer";
        c.className = "toast-container";
        c.style.cssText = "position:fixed;bottom:max(16px, env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:min(92vw,420px);";
        single.parentNode.insertBefore(c, single);
        c.appendChild(single);
        single.style.position = "static";
        single.style.transform = "none";
        single.style.bottom = "auto";
        single.style.left = "auto";
      }
    }
    // Wrap window.showToast if present to auto-dismiss stacking
    if (typeof window.showToast === "function" && !window.__toastWrapped) {
      const orig = window.showToast;
      window.__toastWrapped = true;
      window.showToast = function (msg, isError) {
        try { return orig(msg, isError); } catch (e) { console.warn(e); }
        // also ensure visibility
        const t = $("#toast");
        if (t) { t.classList.add("show"); clearTimeout(window._toastTimer); window._toastTimer = setTimeout(() => t.classList.remove("show"), 3200); }
      };
    }
  }

  /* ── Modal max-height polish — iOS 100dvh fix ── */
  function polishModals() {
    $$(".modal-overlay").forEach((ov) => {
      if (ov.dataset.polishedModal) return;
      ov.dataset.polishedModal = "1";
      ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open", "show"); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") ov.classList.remove("open", "show"); });
    });
  }

  /* ── Syllabys progress — make it trustworthy skeletons ── */
  function polishSyllabus() {
    const prog = $("#syllabusProgress");
    const card = $("#syllabusCard");
    if (prog && card && !prog.dataset.polished) {
      prog.dataset.polished = "1";
      prog.style.transition = "opacity 0.22s ease";
      const obs = new MutationObserver(() => {
        if (prog.textContent && prog.style.display !== "none") {
          prog.style.opacity = "1";
        }
      });
      obs.observe(prog, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ── Init ── */
  function init() {
    syncActiveNav();
    polishCommunityToggles();
    polishDrawer();
    polishSearch();
    polishToasts();
    polishModals();
    polishSyllabus();
    // Re-run on dynamic nav injection (like recommendations)
    const nav = $("#navSection");
    if (nav && !nav.dataset.observed) {
      nav.dataset.observed = "1";
      new MutationObserver(() => {
        syncActiveNav();
        polishCommunityToggles();
      }).observe(nav, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  // also run now if DOM already interactive
  if (document.readyState !== "loading") init();
  // Re-apply after SPA navigations
  window.addEventListener("pageshow", init);
  setTimeout(init, 400);
  setTimeout(init, 1200);
})();
