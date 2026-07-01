import { escapeHtml } from "./xss.js";
import { auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAndGate } from "./limits.js";

const API_ENDPOINT  = "/api/groq-proxy";
const SEARCH_ENDPOINT = "/api/search";
const MODEL         = "llama-3.3-70b-versatile";
const MAX_HISTORY   = 60;

const SYSTEM_PROMPT = `You are Aquila AI, an expert AI study companion built for JEE, NEET, and board exam aspirants as well as students in general.
You help students understand concepts deeply, solve problems step-by-step, create study plans, and analyse their performance.
Always be encouraging, precise, and structured. Use markdown formatting: headers (##), bullet lists, bold key terms, and code blocks where relevant.
When solving problems, show all working clearly. When explaining concepts, use relatable analogies.
Keep responses focused and never pad with unnecessary filler.

When you receive search results, use them to inform your answer. Cite sources from the search results when providing factual information. If search results are insufficient, acknowledge that clearly.`;

const ICON_THUMBUP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
const ICON_THUMBDOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_COPY_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_SHARE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const ICON_SEARCH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>`;

(function injectActionButtonStyles() {
  if (document.getElementById("aquila-action-styles")) return;
  const style = document.createElement("style");
  style.id = "aquila-action-styles";
  style.textContent = `
    .ai-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .ai-action-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      font-size: 12px;
      font-family: 'Sora', sans-serif;
      font-weight: 400;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
      line-height: 1;
    }
    .ai-action-btn:hover {
      color: var(--text-secondary);
      border-color: var(--border-hover);
      background: rgba(255,255,255,0.04);
    }
    .ai-action-btn.active-good {
      color: var(--accent);
      border-color: rgba(0,212,255,0.4);
      background: rgba(0,212,255,0.08);
    }
    .ai-action-btn.active-bad {
      color: var(--accent3);
      border-color: rgba(255,107,107,0.4);
      background: rgba(255,107,107,0.08);
    }
    .ai-action-btn.active-copy {
      color: var(--accent);
      border-color: rgba(0,212,255,0.4);
      background: rgba(0,212,255,0.08);
    }
    .ai-action-btn.active-share {
      color: var(--accent2);
      border-color: rgba(167,139,250,0.4);
      background: rgba(167,139,250,0.08);
    }
    .ai-action-divider {
      width: 1px;
      height: 16px;
      background: var(--border);
      flex-shrink: 0;
      margin: 0 2px;
    }
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    .thinking-section {
      margin: 8px 0;
      border: 1px solid rgba(167,139,250,0.2);
      border-radius: 10px;
      background: rgba(167,139,250,0.04);
      overflow: hidden;
    }
    .thinking-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--accent2);
      transition: background 0.15s;
    }
    .thinking-header:hover {
      background: rgba(167,139,250,0.06);
    }
    .thinking-dots {
      display: flex;
      gap: 3px;
    }
    .thinking-dots span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent2);
      animation: thinkDot 1.2s ease-in-out infinite;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 200ms; }
    .thinking-dots span:nth-child(3) { animation-delay: 400ms; }
    @keyframes thinkDot {
      0%,80%,100%{ opacity: 0.3; transform: scale(0.8); }
      40%{ opacity: 1; transform: scale(1.2); }
    }
    .thinking-chevron {
      margin-left: auto;
      transition: transform 0.25s;
      color: var(--text-muted);
    }
    .thinking-chevron.open { transform: rotate(90deg); }
    .thinking-body {
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-secondary);
      padding: 0 14px 14px;
      white-space: pre-wrap;
    }
    .search-indicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--accent2);
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(167,139,250,0.08);
      margin-bottom: 8px;
    }
    .search-indicator svg {
      animation: searchPulse 1.4s ease-in-out infinite;
    }
    @keyframes searchPulse {
      0%,100%{ opacity: 0.5; }
      50%{ opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();

let conversationHistory = [];
let activeChatId        = null;
let isStreaming         = false;
let isSearchEnabled     = false;

export function setActiveChatId(id) { activeChatId = id; }

export function toggleSearch() {
  isSearchEnabled = !isSearchEnabled;
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    btn.classList.toggle("active", isSearchEnabled);
    btn.setAttribute("aria-pressed", String(isSearchEnabled));
    btn.querySelector("span").textContent = isSearchEnabled ? "Search on" : "Search";
  }
  return isSearchEnabled;
}

export function setSearchEnabled(val) {
  isSearchEnabled = val;
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    btn.classList.toggle("active", isSearchEnabled);
    btn.setAttribute("aria-pressed", String(isSearchEnabled));
    btn.querySelector("span").textContent = isSearchEnabled ? "Search on" : "Search";
  }
}

async function performWebSearch(query) {
  const res = await fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.slice(0, 400) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Search failed (${res.status})`);
  }
  const data = await res.json();
  return data.results || [];
}

function formatSearchResults(results) {
  if (!results || results.length === 0) return "";
  const parts = results.map((r, i) =>
    `Source ${i + 1}: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
  );
  return `\n\nWeb search results for context:\n${parts.join("\n\n")}\n\nUse these search results to provide an accurate, up-to-date answer. Cite relevant sources naturally in your response. If the search results don't contain enough information to answer the question fully, acknowledge that clearly.`;
}

export async function sendMessage() {
  if (isStreaming) return;

  const input   = document.getElementById("chatInput");
  const rawText = input?.value?.trim();
  if (!rawText) return;

  const uid = auth.currentUser?.uid;
  if (uid) {
    const allowed = await checkAndGate(uid, "chat");
    if (!allowed) return;
  }

  input.value = "";
  input.style.height = "auto";

  clearWelcome();
  renderMessage("user", rawText);

  let searchResults = [];
  let searchError = null;

  if (isSearchEnabled) {
    const searchIndicator = document.createElement("div");
    searchIndicator.className = "search-indicator";
    searchIndicator.id = "searchIndicator";
    searchIndicator.innerHTML = `${ICON_SEARCH} Searching the web for current information...`;
    conversationHistory.push({ role: "assistant", content: "[Searching the web...]" });
    renderRawMessage("assistant", searchIndicator.outerHTML);

    try {
      searchResults = await performWebSearch(rawText);
      document.getElementById("searchIndicator")?.remove();
    } catch (err) {
      searchError = err.message;
      document.getElementById("searchIndicator")?.remove();
    }
  }

  conversationHistory.push({ role: "user", content: rawText });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
  }

  const chatRef = await ensureChatSession(rawText);
  await saveMessage(chatRef, "user", rawText);

  const thinkingContainer = document.createElement("div");
  thinkingContainer.className = "thinking-section";
  thinkingContainer.id = "thinkingSection";

  const thinkingHeader = document.createElement("div");
  thinkingHeader.className = "thinking-header";
  thinkingHeader.innerHTML = `
    <span class="thinking-dots"><span></span><span></span><span></span></span>
    Aquila is thinking
    <span class="thinking-chevron">▶</span>
  `;

  const thinkingBody = document.createElement("div");
  thinkingBody.className = "thinking-body";
  thinkingBody.id = "thinkingBody";

  thinkingContainer.appendChild(thinkingHeader);
  thinkingContainer.appendChild(thinkingBody);

  const aiBubble = createAiBubble();
  aiBubble.parentElement?.insertBefore(thinkingContainer, aiBubble);

  isStreaming = true;

  try {
    let enhancedPrompt = SYSTEM_PROMPT;

    if (searchResults.length > 0 && isSearchEnabled) {
      const searchContext = formatSearchResults(searchResults);
      enhancedPrompt += searchContext;
      thinkingBody.textContent = "I found some web results. Let me analyze them to give you the best answer...";
    } else if (searchError && isSearchEnabled) {
      thinkingBody.textContent = `I tried to search the web but encountered an issue: ${searchError}. Let me answer based on what I know.`;
    } else if (isSearchEnabled) {
      thinkingBody.textContent = "I searched the web but didn't find relevant results. Let me answer based on my knowledge.";
    } else {
      thinkingBody.textContent = "Let me think through this step by step...";
    }

    const replyText = await streamGroqResponse(aiBubble, enhancedPrompt, thinkingBody);

    thinkingHeader.querySelector(".thinking-dots")?.remove();
    thinkingHeader.querySelector(".thinking-chevron")?.classList.add("open");
    thinkingHeader.addEventListener("click", () => {
      thinkingBody.style.display = thinkingBody.style.display === "none" ? "" : "none";
    });

    const actions = createActionButtons(replyText);
    aiBubble.appendChild(actions);

    conversationHistory.push({ role: "assistant", content: replyText });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    }
    await saveMessage(chatRef, "assistant", replyText);

    if (conversationHistory.length === 2) {
      const title = rawText.slice(0, 60) + (rawText.length > 60 ? "\u2026" : "");
      await updateChatTitle(chatRef, title);
      updateSidebarTitle(activeChatId, title);
    }
  } catch (err) {
    aiBubble.innerHTML = `<span style="color:#f472b6;">\u26a0 ${err.message}</span>`;
  } finally {
    isStreaming = false;
  }
}

function createActionButtons(rawText) {
  const wrap = document.createElement("div");
  wrap.className = "ai-actions";

  const likeBtn = document.createElement("button");
  likeBtn.className = "ai-action-btn";
  likeBtn.title = "Good response";
  likeBtn.innerHTML = `${ICON_THUMBUP}<span>Good</span>`;
  likeBtn.addEventListener("click", () => {
    const isActive = likeBtn.classList.toggle("active-good");
    dislikeBtn.classList.remove("active-bad");
    likeBtn.querySelector("span").textContent = isActive ? "Liked!" : "Good";
    dislikeBtn.querySelector("span").textContent = "Bad";
  });

  const dislikeBtn = document.createElement("button");
  dislikeBtn.className = "ai-action-btn";
  dislikeBtn.title = "Bad response";
  dislikeBtn.innerHTML = `${ICON_THUMBDOWN}<span>Bad</span>`;
  dislikeBtn.addEventListener("click", () => {
    const isActive = dislikeBtn.classList.toggle("active-bad");
    likeBtn.classList.remove("active-good");
    dislikeBtn.querySelector("span").textContent = isActive ? "Noted!" : "Bad";
    likeBtn.querySelector("span").textContent = "Good";
  });

  const divider = document.createElement("div");
  divider.className = "ai-action-divider";

  const copyBtn = document.createElement("button");
  copyBtn.className = "ai-action-btn";
  copyBtn.title = "Copy response";
  copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(rawText).catch(() => {});
    copyBtn.classList.add("active-copy");
    copyBtn.innerHTML = `${ICON_COPY_CHECK}<span>Copied!</span>`;
    setTimeout(() => {
      copyBtn.classList.remove("active-copy");
      copyBtn.innerHTML = `${ICON_COPY}<span>Copy</span>`;
    }, 2200);
  });

  const shareBtn = document.createElement("button");
  shareBtn.className = "ai-action-btn";
  shareBtn.title = "Share response";
  shareBtn.innerHTML = `${ICON_SHARE}<span>Share</span>`;
  shareBtn.addEventListener("click", () => {
    const sharePayload = {
      title: "Aquila AI",
      text: `Here's what Aquila AI said:\n\n${rawText}`,
    };
    if (navigator.share) {
      navigator.share(sharePayload).catch(() => {});
    } else {
      navigator.clipboard.writeText(sharePayload.text).catch(() => {});
      shareBtn.classList.add("active-share");
      shareBtn.querySelector("span").textContent = "Link copied!";
      setTimeout(() => {
        shareBtn.classList.remove("active-share");
        shareBtn.querySelector("span").textContent = "Share";
      }, 2200);
    }
  });

  wrap.appendChild(likeBtn);
  wrap.appendChild(dislikeBtn);
  wrap.appendChild(divider);
  wrap.appendChild(copyBtn);
  wrap.appendChild(shareBtn);
  return wrap;
}

async function streamGroqResponse(bubble, systemPrompt, thinkingBody) {
  const res = await fetch(API_ENDPOINT, {
    method : "POST",
    headers: { "Content-Type" : "application/json" },
    body: JSON.stringify({
      model    : MODEL,
      messages : [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
      max_tokens : 2048,
      temperature: 0.65,
      stream     : true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText  = "";
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      const stripped = line.replace(/^data: /, "").trim();
      if (!stripped || stripped === "[DONE]") continue;
      try {
        const json  = JSON.parse(stripped);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullText += delta;
          bubble.innerHTML = renderMarkdown(fullText) + cursorHtml();
          smoothScrollToBottom();
        }
      } catch { /* ignore parse errors on partial chunks */ }
    }
  }

  bubble.innerHTML = renderMarkdown(fullText);
  smoothScrollToBottom();
  return fullText;
}

function renderRawMessage(role, htmlContent) {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;

  if (role === "assistant") {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
    wrap.innerHTML = `
      <div style="
        width:30px;height:30px;flex-shrink:0;
        background:linear-gradient(135deg,#6c63ff,#00d4aa);
        border-radius:8px;display:flex;align-items:center;
        justify-content:center;font-size:14px;margin-top:2px;
      ">\u{1F4DD}</div>`;
    const contentDiv = document.createElement("div");
    contentDiv.style.cssText = "flex:1;";
    contentDiv.innerHTML = htmlContent;
    wrap.appendChild(contentDiv);
    chatArea.appendChild(wrap);
    smoothScrollToBottom();
  }
}

export function renderMessage(role, content) {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;

  if (role === "user") {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;justify-content:flex-end;padding:6px 20px;";
    wrap.innerHTML = `
      <div style="
        background:#1e2130;
        border:1px solid rgba(255,255,255,0.08);
        border-radius:14px 14px 4px 14px;
        padding:12px 16px;
        max-width:72%;
        font-size:14px;
        line-height:1.65;
        color:#f0f0f8;
        word-break:break-word;
      ">${escapeHtml(content)}</div>`;
    chatArea.appendChild(wrap);
  } else {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.style.cssText = "flex:1;font-size:14px;line-height:1.75;word-break:break-word;";
    bubble.innerHTML = renderMarkdown(content);
    bubble.appendChild(createActionButtons(content));
    wrap.innerHTML = `
      <div style="
        width:30px;height:30px;flex-shrink:0;
        background:linear-gradient(135deg,#6c63ff,#00d4aa);
        border-radius:8px;display:flex;align-items:center;
        justify-content:center;font-size:14px;margin-top:2px;
      ">\u{1F4DD}</div>`;
    wrap.appendChild(bubble);
    chatArea.appendChild(wrap);
  }
  smoothScrollToBottom();
}

function createAiBubble() {
  const chatArea = document.getElementById("chatArea");
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.style.cssText = "flex:1;font-size:14px;line-height:1.75;word-break:break-word;";
  bubble.innerHTML = typingIndicator();
  wrap.innerHTML = `
    <div style="
      width:30px;height:30px;flex-shrink:0;
      background:linear-gradient(135deg,#6c63ff,#00d4aa);
      border-radius:8px;display:flex;align-items:center;
      justify-content:center;font-size:14px;margin-top:2px;
    ">\u{1F4DD}</div>`;
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  smoothScrollToBottom();
  return bubble;
}

export function clearWelcome() {
  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.remove();
}

function smoothScrollToBottom() {
  const ca = document.getElementById("chatArea");
  if (ca) {
    ca.scrollTo({
      top: ca.scrollHeight,
      behavior: "smooth",
    });
  }
}

function renderMarkdown(md) {
  let html = escapeHtml(md);

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;overflow-x:auto;font-family:'Space Mono',monospace;font-size:12.5px;margin:10px 0;"><code>${code.trim()}</code></pre>`
  );

  html = html.replace(/`([^`]+)`/g,
    `<code style="background:rgba(108,99,255,0.15);border-radius:4px;padding:2px 6px;font-family:'Space Mono',monospace;font-size:12.5px;color:var(--accent2);">$1</code>`
  );

  html = html.replace(/^### (.+)$/gm,
    `<h3 style="font-size:15px;font-weight:600;margin:14px 0 6px;">$1</h3>`
  );
  html = html.replace(/^## (.+)$/gm,
    `<h2 style="font-size:17px;font-weight:700;margin:16px 0 8px;border-bottom:1px solid var(--border);padding-bottom:6px;">$1</h2>`
  );
  html = html.replace(/^# (.+)$/gm,
    `<h1 style="font-size:20px;font-weight:700;margin:18px 0 10px;">$1</h1>`
  );

  html = html.replace(/\*\*(.+?)\*\*/g,
    `<strong style="font-weight:600;">$1</strong>`
  );

  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  html = html.replace(/^[*\-] (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;list-style:disc;">$1</li>`
  );
  html = html.replace(/(<li[\s\S]+?<\/li>)/g,
    `<ul style="margin:8px 0;">$1</ul>`
  );

  html = html.replace(/^\d+\. (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;">$1</li>`
  );

  html = html.replace(/^---$/gm,
    `<hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">`
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

function typingIndicator() {
  return `<span style="display:inline-flex;gap:4px;align-items:center;height:22px;">
    ${[0, 200, 400].map(d =>
      `<span style="
        width:6px;height:6px;border-radius:50%;background:#6c63ff;
        animation:mentoraDot 1.2s ease-in-out ${d}ms infinite;
        display:inline-block;
      "></span>`
    ).join("")}
  </span>
  <style>
    @keyframes mentoraDot {
      0%,80%,100%{transform:translateY(0);opacity:.4}
      40%{transform:translateY(-6px);opacity:1}
    }
  </style>`;
}

function cursorHtml() {
  return `<span style="
    display:inline-block;width:2px;height:15px;background:#6c63ff;
    border-radius:2px;margin-left:2px;vertical-align:middle;
    animation:blink .7s step-end infinite;
  "></span>`;
}

async function ensureChatSession(firstMessage) {
  const user = auth.currentUser;
  if (!user) return null;

  if (activeChatId) {
    return doc(db, "users", user.uid, "chats", activeChatId);
  }

  const title  = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "\u2026" : "");
  const chatRef = await addDoc(
    collection(db, "users", user.uid, "chats"),
    {
      title,
      createdAt : serverTimestamp(),
      updatedAt : serverTimestamp(),
      messageCount: 0,
    }
  );
  activeChatId = chatRef.id;
  return chatRef;
}

async function saveMessage(chatRef, role, content) {
  if (!chatRef) return;
  await addDoc(collection(chatRef, "messages"), {
    role,
    content,
    ts: serverTimestamp(),
  });
  await setDoc(chatRef, { updatedAt: serverTimestamp() }, { merge: true });
}

async function updateChatTitle(chatRef, title) {
  if (!chatRef) return;
  await setDoc(chatRef, { title }, { merge: true });
}

function updateSidebarTitle(chatId, title) {
  const el = document.querySelector(`[data-chat-id="${chatId}"]`);
  if (!el) return;
  const titleEl = el.querySelector(".chat-title") || el.childNodes[1];
  if (titleEl) titleEl.textContent = title;
}

window.sendMessage   = sendMessage;
window.clearWelcome  = clearWelcome;
window.toggleSearch  = toggleSearch;
