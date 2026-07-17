// ── chat.js ──
// Powers the AI chat in home.html.
// - Calls Groq API (llama-3.3-70b-versatile) with full conversation history.
// - Streams the response token-by-token into the UI.
// - Persists each session to Firestore under users/{uid}/chats/{chatId}/messages.
// - Action buttons: thumbs up, thumbs down, copy, share on every AI response.
// - Exports: sendMessage(), renderMessage(), clearWelcome(), setActiveChatId()

import { escapeHtml } from "./xss.js";
import { auth, db } from "./firebase-config.js";
import {
  collection, addDoc, doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkAndGate } from "./limits.js";
import { loadProfile, saveProfile } from "./modules/memory-system.js";
import { createProfile, getWeakestConcepts, getSessionSummary } from "./modules/student-model.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_ENDPOINT  = "/api/groq-proxy";
const MODEL         = "llama-3.3-70b-versatile";
const MAX_HISTORY   = 60;

const BASE_SYSTEM_PROMPT = `You are Mentora, an expert AI study companion built for JEE and NEET aspirants and students in general.
You help students understand concepts deeply, solve problems step-by-step, create study plans, and analyse their performance.
Always be encouraging, precise, and structured. Use markdown formatting: headers (##), bullet lists, bold key terms, and code blocks where relevant.
When solving problems, show all working clearly. When explaining concepts, use relatable analogies.
Keep responses focused and never pad with unnecessary filler.`;

// ─── Student Model ────────────────────────────────────────────────────────────
let studentProfile = null;
let sessionInteractions = 0;
let sessionMistakes = 0;

export async function loadStudentProfile(uid) {
  if (!uid) return;
  let profile = await loadProfile(uid);
  if (!profile) {
    profile = createProfile(uid);
    await saveProfile(uid, profile);
  }
  studentProfile = profile;
  sessionInteractions = 0;
  sessionMistakes = 0;
}

function buildSystemPrompt() {
  let context = BASE_SYSTEM_PROMPT;
  if (!studentProfile) return context;
  const weak = getWeakestConcepts(studentProfile, 5);
  const summary = getSessionSummary(studentProfile);
  const parts = [];
  if (weak.length > 0) {
    parts.push("Weak areas: " + weak.map(c => c.conceptId).join(", "));
  }
  if (summary.averageMastery > 0) {
    parts.push("Avg mastery: " + summary.averageMastery + "%");
  }
  if (summary.conceptsLearned > 0) {
    parts.push("Concepts learned: " + summary.conceptsLearned);
  }
  if (summary.totalMistakes > 0) {
    parts.push("Total mistakes tracked: " + summary.totalMistakes);
  }
  if (parts.length > 0) {
    context += "\n\nStudent Context:\n" + parts.join("\n");
  }
  return context;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICON_THUMBUP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
const ICON_THUMBDOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_COPY_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_SHARE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;



// ─── State ───────────────────────────────────────────────────────────────────
let conversationHistory = [];
let activeChatId        = null;
let isStreaming         = false;

export function setActiveChatId(id) { activeChatId = id; }

// ─── Public: sendMessage ──────────────────────────────────────────────────────
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

    conversationHistory.push({ role: "user", content: rawText });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    }

  const chatRef = await ensureChatSession(rawText);
  await saveMessage(chatRef, "user", rawText);

  const aiBubble = createAiBubble();
  isStreaming     = true;

  try {
    const replyText = await streamGroqResponse(aiBubble);
    // Append action buttons after streaming finishes
    const actions = createActionButtons(replyText);
    aiBubble.appendChild(actions);

    conversationHistory.push({ role: "assistant", content: replyText });
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    }
    await saveMessage(chatRef, "assistant", replyText);

    if (conversationHistory.length === 2) {
      const title = rawText.slice(0, 60) + (rawText.length > 60 ? "…" : "");
      await updateChatTitle(chatRef, title);
      updateSidebarTitle(activeChatId, title);
    }
  } catch (err) {
    aiBubble.innerHTML = `<span class="text-muted" style="color:var(--red);">⚠ ${err.message}</span>`;
  } finally {
    isStreaming = false;
  }
}

// ─── Create action buttons ────────────────────────────────────────────────────
function createActionButtons(rawText) {
  const wrap = document.createElement("div");
  wrap.className = "ai-actions";

  // Thumbs up
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

  // Thumbs down
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

  // Divider
  const divider = document.createElement("div");
  divider.className = "ai-action-divider";

  // Copy
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

  // Share
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

// ─── Groq streaming ───────────────────────────────────────────────────────────
async function streamGroqResponse(bubble) {
  const res = await fetch(API_ENDPOINT, {
    method : "POST",
    headers: { "Content-Type" : "application/json" },
    body: JSON.stringify({
      model    : MODEL,
      messages : [
        { role: "system", content: buildSystemPrompt() },
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
          scrollChatToBottom();
        }
      } catch { /* ignore parse errors on partial chunks */ }
    }
  }

  bubble.innerHTML = renderMarkdown(fullText);
  scrollChatToBottom();
  return fullText;
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
export function renderMessage(role, content) {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;

  const wrap = document.createElement("div");
  wrap.className = "message-row " + role;

  if (role === "user") {
    const bubble = document.createElement("div");
    bubble.className = "user-bubble";
    bubble.textContent = content;
    wrap.appendChild(bubble);
  } else {
    const avatar = document.createElement("div");
    avatar.className = "assistant-avatar";
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.innerHTML = renderMarkdown(content);
    bubble.appendChild(createActionButtons(content));
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
  }
  chatArea.appendChild(wrap);
  scrollChatToBottom();
}

function createAiBubble() {
  const chatArea = document.getElementById("chatArea");
  const wrap = document.createElement("div");
  wrap.className = "message-row assistant";
  const avatar = document.createElement("div");
  avatar.className = "assistant-avatar";
  avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  const bubble = document.createElement("div");
  bubble.className = "ai-bubble";
  bubble.innerHTML = typingIndicator();
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  scrollChatToBottom();
  return bubble;
}

export function clearWelcome() {
  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.remove();
}

function scrollChatToBottom() {
  const ca = document.getElementById("chatArea");
  if (ca) ca.scrollTop = ca.scrollHeight;
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
function renderMarkdown(md) {
  let html = escapeHtml(md);

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  html = html.replace(/`([^`]+)`/g, `<code>$1</code>`);

  html = html.replace(/^### (.+)$/gm, `<h3>$1</h3>`);
  html = html.replace(/^## (.+)$/gm, `<h2>$1</h2>`);
  html = html.replace(/^# (.+)$/gm, `<h1>$1</h1>`);

  html = html.replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`);
  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  html = html.replace(/^[*\-] (.+)$/gm, `<li>$1</li>`);
  html = html.replace(/(<li[\s\S]+?<\/li>)/g, `<ul>$1</ul>`);

  html = html.replace(/^\d+\. (.+)$/gm, `<li>$1</li>`);

  html = html.replace(/^---$/gm, `<hr>`);

  html = html.replace(/\n/g, "<br>");

  return html;
}

function typingIndicator() {
  return `<span class="loading-dots"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></span>`;
}

function cursorHtml() {
  return `<span class="cursor-blink"></span>`;
}

// ─── Firestore persistence ────────────────────────────────────────────────────
async function ensureChatSession(firstMessage) {
  const user = auth.currentUser;
  if (!user) return null;

  if (activeChatId) {
    return doc(db, "users", user.uid, "chats", activeChatId);
  }

  const title  = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
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

// ─── Public: resetChat ───────────────────────────────────────────────────────
export function resetChat() {
  conversationHistory = [];
  activeChatId = null;
  isStreaming = false;
  const input = document.getElementById("chatInput");
  if (input) { input.value = ""; input.disabled = false; input.focus(); }
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = false;
  const chatArea = document.getElementById("chatArea");
  if (chatArea) chatArea.innerHTML = "";
  const welcome = document.getElementById("welcomeScreen");
  if (welcome) welcome.style.display = "flex";
}

// ─── Expose globally for home.html inline handlers ───────────────────────────
window.sendMessage   = sendMessage;
window.clearWelcome  = clearWelcome;
