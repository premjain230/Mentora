/**
 * Conversation rail. Titles come from the existing `users/{uid}/chats`
 * collection and keep their Firestore document ids, so saved conversations stay
 * where the rest of the app expects them. Pinning and renaming are ordinary
 * owner-updates; deleting is owner-verified server work because messages are
 * create-only in the security rules.
 */

import { el } from "../shared/dom.js";
import { toDate } from "../shared/format.js";
import { createModalController } from "../shared/modal.js";
import {
  listChatSessions,
  renameChatSession,
  setChatPinned,
} from "../../lib/chat-store";
import { deleteChatSession } from "./manage.js";

const RAIL_KEY = "learning-allied-chat-rail";
const MOBILE_QUERY = "(max-width: 880px)";
const DAY = 24 * 60 * 60 * 1000;

export function createRail(app) {
  const { els, state, lifecycle } = app;
  const modal = createModalController(lifecycle);

  let sessions = [];
  let filter = "";
  let menuSessionId = null;
  let menuTrigger = null;
  let pendingDelete = null;
  let deleting = false;

  function readCollapsed() {
    try {
      return localStorage.getItem(RAIL_KEY) === "collapsed";
    } catch (_) {
      return false;
    }
  }

  function persistCollapsed(collapsed) {
    try {
      localStorage.setItem(RAIL_KEY, collapsed ? "collapsed" : "expanded");
    } catch (_) {
      /* storage may be unavailable */
    }
  }

  function applyCollapsed(collapsed) {
    els.workspace?.classList.toggle("is-rail-collapsed", collapsed);
    if (els.rail) els.rail.dataset.collapsed = collapsed ? "true" : "false";
    els.railCollapse?.setAttribute("aria-expanded", String(!collapsed));
    els.railCollapse?.setAttribute(
      "aria-label",
      collapsed ? "Expand conversations" : "Collapse conversations"
    );
    if (els.railToggle) {
      els.railToggle.setAttribute("aria-expanded", String(!collapsed));
    }
    if (!collapsed) closeMenu();
  }

  function toggleCollapsed() {
    const collapsed = !els.workspace?.classList.contains("is-rail-collapsed");
    applyCollapsed(collapsed);
    persistCollapsed(collapsed);
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function openDrawer() {
    if (!els.rail) return;
    els.rail.classList.add("is-open");
    if (els.scrim) els.scrim.hidden = false;
    els.railToggle?.setAttribute("aria-expanded", "true");
    setTimeout(() => els.railSearch?.focus(), 60);
  }

  function closeDrawer() {
    els.rail?.classList.remove("is-open");
    if (els.scrim) els.scrim.hidden = true;
    els.railToggle?.setAttribute(
      "aria-expanded",
      String(!els.workspace?.classList.contains("is-rail-collapsed"))
    );
  }

  async function refresh() {
    if (!app.user || !app.db) return;
    els.railList?.setAttribute("aria-busy", "true");
    try {
      const list = await listChatSessions(app.db, app.user.uid, 50);
      if (lifecycle.disposed) return;
      sessions = list;
      renderList();
    } catch (err) {
      if (lifecycle.disposed) return;
      renderError();
    } finally {
      els.railList?.setAttribute("aria-busy", "false");
    }
  }

  function visibleSessions() {
    if (!filter) return sessions;
    return sessions.filter((session) =>
      String(session.title || "").toLowerCase().includes(filter)
    );
  }

  function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function groupSessions(list) {
    const pinned = list.filter((session) => session.pinned);
    const rest = list.filter((session) => !session.pinned);
    const today = startOfToday();
    const groups = [];

    if (pinned.length) {
      groups.push({ key: "pinned", label: "Pinned", items: pinned });
    }

    const buckets = new Map();
    for (const session of rest) {
      const stamp = toDate(session.updatedAt);
      const ms = stamp ? stamp.getTime() : null;
      let key = "earlier";
      if (ms != null) {
        if (ms >= today) key = "today";
        else if (ms >= today - DAY) key = "yesterday";
        else if (ms >= today - 7 * DAY) key = "week";
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(session);
    }

    for (const [key, label] of [
      ["today", "Today"],
      ["yesterday", "Yesterday"],
      ["week", "Previous 7 days"],
      ["earlier", "Earlier"],
    ]) {
      const items = buckets.get(key);
      if (items?.length) groups.push({ key, label, items });
    }

    return groups;
  }

  function itemNode(session) {
    const item = el("div", "chat-rail-item");
    item.dataset.id = session.id;
    if (session.id === state.chatId) item.dataset.active = "true";
    if (session.pinned) item.dataset.pinned = "true";

    const open = el("button", "chat-rail-open");
    open.type = "button";
    open.appendChild(el("span", "chat-rail-title", session.title));

    const meta = [];
    if (session.messageCount > 0) {
      meta.push(
        `${session.messageCount} message${session.messageCount === 1 ? "" : "s"}`
      );
    }
    open.appendChild(
      el("span", "chat-rail-meta", meta.join(" · ") || "Saved conversation")
    );

    const more = el("button", "chat-rail-more", "⋯");
    more.type = "button";
    more.dataset.more = session.id;
    more.setAttribute("aria-label", `Options for ${session.title}`);
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-expanded", "false");

    item.append(open, more);
    return item;
  }

  function renderList() {
    if (!els.railList) return;
    const items = visibleSessions();
    els.railList.replaceChildren();

    if (!sessions.length) {
      const empty = el("div", "chat-rail-empty");
      empty.appendChild(el("p", "chat-rail-empty-title", "No conversations yet"));
      empty.appendChild(
        el(
          "p",
          "chat-rail-empty-text",
          "Your chats are saved here automatically once you ask the first question."
        )
      );
      els.railList.appendChild(empty);
      return;
    }

    if (!items.length) {
      els.railList.appendChild(
        el("p", "chat-rail-empty", `No conversations match “${filter}”.`)
      );
      return;
    }

    for (const group of groupSessions(items)) {
      const section = el("section", "chat-rail-group");
      section.appendChild(el("h2", "chat-rail-group-label", group.label));
      for (const session of group.items) section.appendChild(itemNode(session));
      els.railList.appendChild(section);
    }
  }

  function renderError() {
    if (!els.railList) return;
    els.railList.replaceChildren();
    const box = el("div", "chat-rail-empty");
    box.appendChild(
      el(
        "p",
        "chat-rail-empty-text",
        "Conversations could not be loaded. Check your connection."
      )
    );
    const retry = el("button", "chat-rail-retry", "Retry");
    retry.type = "button";
    lifecycle.on(retry, "click", () => refresh());
    box.appendChild(retry);
    els.railList.appendChild(box);
  }

  function setActive(id) {
    if (!els.railList) return;
    for (const item of els.railList.querySelectorAll(".chat-rail-item")) {
      if (item.dataset.id === id) item.dataset.active = "true";
      else delete item.dataset.active;
    }
  }

  function closeMenu() {
    if (!els.menu) return;
    els.menu.hidden = true;
    menuSessionId = null;
    if (menuTrigger) {
      menuTrigger.setAttribute("aria-expanded", "false");
      menuTrigger = null;
    }
  }

  function openMenu(session, trigger) {
    if (!els.menu || !els.rail) return;
    closeMenu();
    menuSessionId = session.id;
    menuTrigger = trigger;
    els.menuPin.textContent = session.pinned ? "Unpin" : "Pin";
    els.menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");

    const railRect = els.rail.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    const width = 168;
    const left = Math.max(
      8,
      Math.min(rect.left - railRect.left - width + rect.width, railRect.width - width - 8)
    );
    const below = rect.bottom - railRect.top + 6;
    const fitsBelow = below + els.menu.offsetHeight < railRect.height - 12;
    els.menu.style.left = `${left}px`;
    els.menu.style.top = `${
      fitsBelow ? below : rect.top - railRect.top - els.menu.offsetHeight - 6
    }px`;
  }

  function beginRename(session, item) {
    const titleEl = item?.querySelector(".chat-rail-title");
    if (!titleEl) return;

    const input = el("input", "chat-rail-rename");
    input.type = "text";
    input.value = session.title;
    input.maxLength = 200;
    input.setAttribute("aria-label", "Conversation title");
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let settled = false;
    const finish = async (commit) => {
      if (settled) return;
      settled = true;
      const value = input.value.trim();
      if (lifecycle.disposed) return;
      if (!commit || !value || value === session.title) {
        renderList();
        return;
      }
      try {
        const saved = await renameChatSession(
          app.db,
          app.user.uid,
          session.id,
          value
        );
        session.title = saved;
        if (state.chatId === session.id) app.setTitle(saved);
      } catch (err) {
        app.notify(err?.message || "The title could not be saved.", "error");
      }
      if (!lifecycle.disposed) renderList();
    };

    lifecycle.on(input, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    lifecycle.on(input, "blur", () => finish(true));
  }

  async function togglePin(session) {
    try {
      await setChatPinned(app.db, app.user.uid, session.id, !session.pinned);
      session.pinned = !session.pinned;
      if (!lifecycle.disposed) renderList();
    } catch (err) {
      app.notify(err?.message || "The conversation could not be updated.", "error");
    }
  }

  function requestDelete(session) {
    pendingDelete = session;
    if (els.deleteText) {
      els.deleteText.textContent = `“${session.title}” and every message in it will be removed. This cannot be undone.`;
    }
    modal.open(els.deleteModal, { initialFocus: els.deleteCancel });
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const session = pendingDelete;
    deleting = true;
    if (els.deleteConfirm) {
      els.deleteConfirm.disabled = true;
      els.deleteConfirm.textContent = "Deleting…";
    }

    try {
      await deleteChatSession(app.getToken, session.id);
      sessions = sessions.filter((item) => item.id !== session.id);
      modal.close(els.deleteModal);
      if (state.chatId === session.id) app.startNewChat({ skipRefresh: true });
      renderList();
      app.notify("Conversation deleted.", "success");
    } catch (err) {
      if (els.deleteText) {
        els.deleteText.textContent =
          err?.message || "The conversation could not be deleted. Please retry.";
      }
    } finally {
      deleting = false;
      pendingDelete = null;
      if (els.deleteConfirm) {
        els.deleteConfirm.disabled = false;
        els.deleteConfirm.textContent = "Delete conversation";
      }
    }
  }

  function bind() {
    applyCollapsed(readCollapsed());

    lifecycle.on(els.railNew, "click", () => {
      closeDrawer();
      app.startNewChat();
    });

    lifecycle.on(els.railCollapse, "click", () => {
      if (isMobile()) closeDrawer();
      else toggleCollapsed();
    });

    lifecycle.on(els.railToggle, "click", () => {
      if (isMobile()) {
        if (els.rail?.classList.contains("is-open")) closeDrawer();
        else openDrawer();
      } else {
        toggleCollapsed();
      }
    });

    lifecycle.on(els.scrim, "click", closeDrawer);

    lifecycle.on(els.railSearch, "input", () => {
      filter = String(els.railSearch.value || "").trim().toLowerCase();
      renderList();
    });

    lifecycle.on(els.railList, "click", (event) => {
      const target = event.target;
      const item = target.closest?.(".chat-rail-item");
      if (!item) return;
      const session = sessions.find((entry) => entry.id === item.dataset.id);
      if (!session) return;

      if (target.closest(".chat-rail-more")) {
        if (menuSessionId === session.id) closeMenu();
        else openMenu(session, target.closest(".chat-rail-more"));
        return;
      }

      if (target.closest(".chat-rail-open")) {
        closeMenu();
        if (isMobile()) closeDrawer();
        app.openConversation(session.id);
      }
    });

    lifecycle.on(els.railList, "scroll", closeMenu, { passive: true });

    lifecycle.on(els.menu, "click", (event) => {
      const action = event.target.closest?.("[data-rail-action]")?.dataset
        .railAction;
      if (!action || !menuSessionId) return;
      const session = sessions.find((entry) => entry.id === menuSessionId);
      if (!session) return;
      if (action === "rename") {
        const item = els.railList.querySelector(
          `.chat-rail-item[data-id="${session.id}"]`
        );
        closeMenu();
        beginRename(session, item);
      } else if (action === "pin") {
        closeMenu();
        void togglePin(session);
      } else if (action === "delete") {
        closeMenu();
        requestDelete(session);
      }
    });

    lifecycle.on(document, "click", (event) => {
      if (!els.menu || els.menu.hidden) return;
      const target = event.target;
      if (els.menu.contains(target) || target.closest?.(".chat-rail-more")) return;
      closeMenu();
    });

    lifecycle.on(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.menu && !els.menu.hidden) {
        closeMenu();
        menuTrigger?.focus();
      }
    });

    lifecycle.on(els.deleteCancel, "click", () => modal.close(els.deleteModal));
    lifecycle.on(els.deleteConfirm, "click", () => void confirmDelete());

    if (typeof window.matchMedia === "function") {
      const media = window.matchMedia(MOBILE_QUERY);
      lifecycle.on(media, "change", () => {
        if (!media.matches) closeDrawer();
      });
    }
  }

  return {
    bind,
    refresh,
    renderList,
    setActive,
    toggleCollapsed,
    openDrawer,
    closeDrawer,
    beginRename,
    confirmDelete,
  };
}
