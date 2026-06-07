// ── chat.js ──
// Powers the AI chat in home.html.
// - Calls Groq API (llama-3.3-70b-versatile) with full conversation history.
// - Streams the response token-by-token into the UI.
// - Persists each session to Firestore under users/{uid}/chats/{chatId}/messages.
// - Exports: sendMessage(), renderMessage(), clearWelcome(), setActiveChatId()

import { auth, db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const GROQ_API_KEY  = "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";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL         = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Mentora, an expert AI study companion built for JEE and NEET aspirants and students in general.
You help students understand concepts deeply, solve problems step-by-step, create study plans, and analyse their performance.
Always be encouraging, precise, and structured. Use markdown formatting: headers (##), bullet lists, bold key terms, and code blocks where relevant.
When solving problems, show all working clearly. When explaining concepts, use relatable analogies.
Keep responses focused and never pad with unnecessary filler.`;

// ─── State ───────────────────────────────────────────────────────────────────
let conversationHistory = []; // { role, content }[]
let activeChatId        = null;
let isStreaming         = false;

export function setActiveChatId(id) { activeChatId = id; }

// ─── Public: sendMessage ──────────────────────────────────────────────────────
// Called by home.html's sendMessage() global wrapper
export async function sendMessage() {
  if (isStreaming) return;

  const input   = document.getElementById("chatInput");
  const rawText = input?.value?.trim();
  if (!rawText) return;

  const text = escapeHtml(rawText);
  input.value = "";
  input.style.height = "auto";

  clearWelcome();
  renderMessage("user", rawText);

  conversationHistory.push({ role: "user", content: rawText });

  // Persist user message
  const chatRef = await ensureChatSession(rawText);

  await saveMessage(chatRef, "user", rawText);

  // Render loading bubble
  const aiBubble = createAiBubble();
  isStreaming     = true;

  try {
    const replyText = await streamGroqResponse(aiBubble);
    conversationHistory.push({ role: "assistant", content: replyText });
    await saveMessage(chatRef, "assistant", replyText);

    // Update chat title after first exchange
    if (conversationHistory.length === 2) {
      const title = rawText.slice(0, 60) + (rawText.length > 60 ? "…" : "");
      await updateChatTitle(chatRef, title);
      updateSidebarTitle(activeChatId, title);
    }
  } catch (err) {
    aiBubble.innerHTML = `<span style="color:#f472b6;">⚠ ${err.message}</span>`;
  } finally {
    isStreaming = false;
  }
}

// ─── Groq streaming ───────────────────────────────────────────────────────────
async function streamGroqResponse(bubble) {
  const res = await fetch(GROQ_ENDPOINT, {
    method : "POST",
    headers: {
      "Content-Type" : "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model    : MODEL,
      messages : [
        { role: "system", content: SYSTEM_PROMPT },
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
    buffer = lines.pop(); // keep incomplete line

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

  // Remove streaming cursor
  bubble.innerHTML = renderMarkdown(fullText);
  scrollChatToBottom();
  return fullText;
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
export function renderMessage(role, content) {
  const chatArea = document.getElementById("chatArea");
  if (!chatArea) return;

  if (role === "user") {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "display:flex;justify-content:flex-end;padding:6px 20px;";
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
    wrap.innerHTML = `
      <div style="
        width:30px;height:30px;flex-shrink:0;
        background:linear-gradient(135deg,#6c63ff,#00d4aa);
        border-radius:8px;display:flex;align-items:center;
        justify-content:center;font-size:14px;margin-top:2px;
      ">🎓</div>
      <div class="ai-message" style="
        flex:1;font-size:14px;line-height:1.75;color:#e8ecf0;
        word-break:break-word;
      ">${renderMarkdown(content)}</div>`;
    chatArea.appendChild(wrap);
  }
  scrollChatToBottom();
}

function createAiBubble() {
  const chatArea = document.getElementById("chatArea");
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:12px;padding:6px 20px;align-items:flex-start;";
  const bubble = document.createElement("div");
  bubble.className = "ai-message";
  bubble.style.cssText =
    "flex:1;font-size:14px;line-height:1.75;color:#e8ecf0;word-break:break-word;";
  bubble.innerHTML = typingIndicator();
  wrap.innerHTML = `
    <div style="
      width:30px;height:30px;flex-shrink:0;
      background:linear-gradient(135deg,#6c63ff,#00d4aa);
      border-radius:8px;display:flex;align-items:center;
      justify-content:center;font-size:14px;margin-top:2px;
    ">🎓</div>`;
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
// Converts the most common markdown to HTML without a library dependency.
function renderMarkdown(md) {
  let html = escapeHtml(md);

  // Code blocks  ```lang\n...\n```
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:#1a1d27;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;overflow-x:auto;font-family:'Space Mono',monospace;font-size:12.5px;margin:10px 0;"><code>${code.trim()}</code></pre>`
  );

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g,
    `<code style="background:rgba(108,99,255,0.15);border-radius:4px;padding:2px 6px;font-family:'Space Mono',monospace;font-size:12.5px;color:#a78bfa;">$1</code>`
  );

  // ### headers
  html = html.replace(/^### (.+)$/gm,
    `<h3 style="font-size:15px;font-weight:600;color:#f0f0f8;margin:14px 0 6px;">$1</h3>`
  );
  html = html.replace(/^## (.+)$/gm,
    `<h2 style="font-size:17px;font-weight:700;color:#f0f0f8;margin:16px 0 8px;border-bottom:1px solid rgba(255,255,255,0.07);padding-bottom:6px;">$1</h2>`
  );
  html = html.replace(/^# (.+)$/gm,
    `<h1 style="font-size:20px;font-weight:700;color:#f0f0f8;margin:18px 0 10px;">$1</h1>`
  );

  // **bold**
  html = html.replace(/\*\*(.+?)\*\*/g,
    `<strong style="color:#f0f0f8;font-weight:600;">$1</strong>`
  );

  // *italic*
  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  // Bullet lists  - item
  html = html.replace(/^[*\-] (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;list-style:disc;">$1</li>`
  );
  html = html.replace(/(<li[\s\S]+?<\/li>)/g,
    `<ul style="margin:8px 0;">$1</ul>`
  );

  // Numbered lists  1. item
  html = html.replace(/^\d+\. (.+)$/gm,
    `<li style="margin:4px 0 4px 18px;">$1</li>`
  );

  // Horizontal rule ---
  html = html.replace(/^---$/gm,
    `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;">`
  );

  // Newlines → <br>
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
  "></span>
  <style>@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}</style>`;
}

// ─── Firestore persistence ────────────────────────────────────────────────────
async function ensureChatSession(firstMessage) {
  const user = auth.currentUser;
  if (!user) return null;

  if (activeChatId) {
    return doc(db, "users", user.uid, "chats", activeChatId);
  }

  // Create a new chat document
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
  // Update updatedAt on parent
  await setDoc(chatRef, { updatedAt: serverTimestamp() }, { merge: true });
}

async function updateChatTitle(chatRef, title) {
  if (!chatRef) return;
  await setDoc(chatRef, { title }, { merge: true });
}

function updateSidebarTitle(chatId, title) {
  const el = document.querySelector(`[data-chat-id="${chatId}"]`);
  if (el) el.childNodes[1].textContent = title;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ─── Expose globally for home.html inline handlers ───────────────────────────
window.sendMessage   = sendMessage;
window.clearWelcome  = clearWelcome;
