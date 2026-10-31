import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { formatDate } from "./shared/format.js";

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const list = root.querySelector("#chatHistoryList");
  if (!list) return () => lifecycle.dispose();

  loadSessions(list, ctx, lifecycle);

  return () => lifecycle.dispose();
}

async function loadSessions(list, ctx, lifecycle) {
  try {
    const snap = await getDocs(
      query(
        collection(ctx.db, "users", ctx.user.uid, "chats"),
        orderBy("updatedAt", "desc"),
        limit(50)
      )
    );
    if (lifecycle.disposed) return;

    const sessions = snap.docs.map((sessionDoc) => {
      const data = sessionDoc.data();
      return {
        id: sessionDoc.id,
        title:
          typeof data.title === "string" && data.title.trim()
            ? data.title
            : "Untitled chat",
        updatedAt: data.updatedAt ?? null,
        messageCount:
          typeof data.messageCount === "number" ? data.messageCount : 0,
      };
    });

    renderSessions(list, sessions, ctx, lifecycle);
  } catch (err) {
    if (lifecycle.disposed) return;
    console.warn("Could not load chat history:", err);
    renderError(list, ctx, lifecycle);
  } finally {
    if (!lifecycle.disposed) list.setAttribute("aria-busy", "false");
  }
}

function renderSessions(list, sessions, ctx, lifecycle) {
  list.replaceChildren();

  if (!sessions.length) {
    const empty = document.createElement("div");
    empty.className = "chat-history-empty";

    const text = document.createElement("p");
    text.textContent =
      "No saved chats found yet. Start a conversation and it will appear here.";
    empty.appendChild(text);

    const cta = document.createElement("a");
    cta.href = "/chat";
    cta.className = "dash-btn primary";
    cta.textContent = "Start your first chat";
    empty.appendChild(cta);

    list.appendChild(empty);
    return;
  }

  for (const session of sessions) {
    const href = `/chat?id=${encodeURIComponent(session.id)}`;
    const item = document.createElement("a");
    item.className = "chat-history-item";
    item.href = href;

    const main = document.createElement("div");
    main.className = "chat-history-main";

    const title = document.createElement("h3");
    title.className = "chat-history-title";
    title.textContent = session.title;

    const meta = document.createElement("div");
    meta.className = "chat-history-meta";
    const parts = [];
    const updated = formatDate(session.updatedAt);
    if (updated) parts.push(updated);
    if (session.messageCount > 0) {
      parts.push(
        `${session.messageCount} message${session.messageCount === 1 ? "" : "s"}`
      );
    }
    meta.textContent = parts.join(" · ") || "Saved conversation";

    main.append(title, meta);

    const open = document.createElement("span");
    open.className = "chat-history-open";
    open.textContent = "Open →";

    item.append(main, open);

    lifecycle.on(item, "click", () => {
      try {
        sessionStorage.setItem("learning-allied-open-chat", session.id);
        sessionStorage.setItem("aquila_open_chat", session.id);
      } catch (err) {
        /* storage may be unavailable */
      }
    });

    lifecycle.on(item, "auxclick", (event) => {
      if (event.button !== 1) return;
      try {
        sessionStorage.setItem("learning-allied-open-chat", session.id);
        sessionStorage.setItem("aquila_open_chat", session.id);
      } catch (err) {
        /* storage may be unavailable */
      }
    });

    list.appendChild(item);
  }

  list.setAttribute("aria-busy", "false");
}

function renderError(list, ctx, lifecycle) {
  list.replaceChildren();

  const error = document.createElement("div");
  error.className = "dash-error";
  error.textContent =
    "Chat history could not be loaded right now. Check your connection and refresh.";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "dash-btn chat-history-retry";
  retry.textContent = "Retry";
  lifecycle.on(retry, "click", () => {
    list.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "dash-loading";
    loading.textContent = "Loading chat sessions…";
    list.appendChild(loading);
    list.setAttribute("aria-busy", "true");
    loadSessions(list, ctx, lifecycle);
  });

  list.append(error, retry);
  list.setAttribute("aria-busy", "false");
}
