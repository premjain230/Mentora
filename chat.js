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

const SYSTEM_PROMPT = `You are Aquila AI, the world's most effective learning companion. Your design is based on neuroscience research.

HOW YOU WORK:
You are NOT a chatbot. You are a learning engine. Every interaction must actively strengthen memory.

CORE RULES:

1. NEVER GIVE DIRECT ANSWERS FIRST. Always respond with a question or prompt that makes the student retrieve from memory.
   - Student: "What is photosynthesis?" 
   - You: "Good question! Before I explain — what do you already know about how plants get energy? Even a guess helps."

2. AFTER EVERY EXPLANATION, immediately test retrieval:
   - "Can you explain that back to me in your own words?"
   - "What would happen if [related scenario]?"
   - "How does this connect to [previous concept]?"

3. CONFIDENCE CHECK: After the student answers, ask:
   - "On a scale of 1-5, how confident are you? (1=guessed, 5=absolutely sure)"
   - Track this. If confidence > accuracy, they need more practice.

4. ACTIVE RECALL FLOW:
   a) Ask what they know (activate prior knowledge)
   b) Explain ONE concept briefly (chunking — max 3 sentences)
   c) Immediately ask them to recall it
   d) Give feedback (correct → harder question; incorrect → hint layer 1)
   e) If wrong again → hint layer 2 → if still wrong → brief explanation → ask again

5. SPACED REPETITION: After a concept is learned:
   - "I'll ask you about this again in 1 day / 3 days / 1 week"
   - "This connects to [X] — we'll review both together later"

6. INTERLEAVING: Don't stay on one topic too long. After 3-4 exchanges on one concept, mix in a question from a different topic.

7. DESIRABLE DIFFICULTIES: Make it slightly harder when they're doing well:
   - "You got that right! Now what if [harder variation]?"
   - "That's correct. Can you think of an exception?"

8. METACOGNITION: Regularly ask:
   - "What confused you most about this?"
   - "What would you teach differently about this topic?"
   - "Where did you get stuck?"

9. CONCISE: Maximum 3 sentences per response. Make every word count.

10. EMOTIONAL STATE: Detect frustration (short wrong answers) → be encouraging. Detect boredom (fast correct) → increase challenge.

FORMATTING: Use markdown sparingly. Bold key terms. Keep it scannable.

NEVER:
- Give a long explanation without testing recall first
- Say "great question!" without following up with a challenge
- End a response without asking something back
- Let the student passively read`;

const ICON_THUMBUP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
const ICON_THUMBDOWN = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
const ICON_COPY = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_COPY_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_SHARE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

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
    .search-pulse {
      position: relative;
    }
    .search-pulse::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 11px;
      border: 2px solid var(--accent2);
      opacity: 0;
      animation: pulseRing 1.2s ease-out infinite;
    }
    @keyframes pulseRing {
      0% { opacity: 0.6; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.2); }
    }
    .confidence-bar {
      display: flex;
      gap: 6px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .conf-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-family: 'Sora', sans-serif;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .conf-btn:hover { border-color: var(--border-hover); color: var(--text-secondary); }
    .conf-btn.selected { background: rgba(0,212,255,0.1); border-color: rgba(0,212,255,0.3); color: var(--accent); }
    .recall-prompt {
      margin-top: 12px;
      padding: 12px 16px;
      background: rgba(0,212,255,0.05);
      border: 1px solid rgba(0,212,255,0.15);
      border-radius: 10px;
      font-size: 13px;
      color: var(--accent);
    }
  `;
  document.head.appendChild(style);
})();

let conversationHistory = [];
let activeChatId        = null;
let isStreaming         = false;
let isSearchEnabled     = false;

// Learning state tracking
let learningState = {
  currentConcept: null,
  attemptCount: 0,
  correctCount: 0,
  totalQuestions: 0,
  confidenceHistory: [],
  lastActivity: Date.now()
};

export function setActiveChatId(id) { activeChatId = id; }

export function toggleSearch() {
  isSearchEnabled = !isSearchEnabled;
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    btn.classList.toggle("active", isSearchEnabled);
    btn.setAttribute("aria-pressed", String(isSearchEnabled));
  }
  return isSearchEnabled;
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
    `[${i + 1}] "${r.title}" - ${r.snippet}\nSource: ${r.link}`
  );
  return `\n\nCurrent web search results (use these to answer accurately):\n${parts.join("\n")}\n\nAnswer directly using these results where relevant. If the results don't contain enough information, say so. Always cite sources naturally.`;
}

function pulseSearchBtn(pulse) {
  const btn = document.getElementById("searchToggleBtn");
  if (btn) {
    if (pulse) btn.classList.add("search-pulse");
    else btn.classList.remove("search-pulse");
  }
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
    pulseSearchBtn(true);
    try {
      searchResults = await performWebSearch(rawText);
    } catch (err) {
      searchError = err.message;
    } finally {
      pulseSearchBtn(false);
    }
  }

  conversationHistory.push({ role: "user", content: rawText });
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
  }

  const chatRef = await ensureChatSession(rawText);
  await saveMessage(chatRef, "user", rawText);

  const aiBubble = createAiBubble();
  isStreaming = true;

  try {
    let enhancedPrompt = SYSTEM_PROMPT;

    // Add learning state context
    enhancedPrompt += `\n\nLEARNING STATE:
- Current concept: ${learningState.currentConcept || "none"}
- Attempts so far: ${learningState.attemptCount}
- Correct: ${learningState.correctCount}/${learningState.totalQuestions}
- Time since last activity: ${Math.round((Date.now() - learningState.lastActivity) / 1000)}s`;

    if (searchResults.length > 0) {
      enhancedPrompt += formatSearchResults(searchResults);
    } else if (searchError) {
      enhancedPrompt += `\n\nNote: Web search was attempted but failed (${searchError}). Answer based on your existing knowledge.`;
    } else if (isSearchEnabled) {
      enhancedPrompt += `\n\nNote: Web search returned no relevant results. Answer based on your existing knowledge.`;
    }

    const replyText = await streamGroqResponse(aiBubble, enhancedPrompt);

    // Update learning state
    learningState.totalQuestions++;
    learningState.lastActivity = Date.now();

    const actions = createActionButtons(replyText);
    aiBubble.appendChild(actions);

    // Add confidence rating UI
    const confBar = createConfidenceBar();
    aiBubble.appendChild(confBar);

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

function createConfidenceBar() {
  const wrap = document.createElement("div");
  wrap.className = "confidence-bar";
  
  const label = document.createElement("span");
  label.style.cssText = "font-size:11px;color:var(--text-muted);margin-right:4px;";
  label.textContent = "How confident? ";
  wrap.appendChild(label);

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.className = "conf-btn";
    btn.textContent = i;
    btn.title = i === 1 ? "Guessed" : i === 5 ? "Absolutely sure" : "";
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".conf-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      learningState.confidenceHistory.push(i);
      
      // Auto-send confidence as a message to track it
      const confMsg = `[Confidence: ${i}/5]`;
      conversationHistory.push({ role: "user", content: confMsg });
      
      // Show feedback
      btn.parentElement.insertAdjacentHTML('afterend', 
        `<span style="font-size:11px;color:var(--accent);margin-left:8px;">Tracked</span>`
      );
    });
    wrap.appendChild(btn);
  }

  return wrap;
}

async function streamGroqResponse(bubble, systemPrompt) {
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
    bubble.appendChild(createConfidenceBar());
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
        animation:aquilaDot 1.2s ease-in-out ${d}ms infinite;
        display:inline-block;
      "></span>`
    ).join("")}
  </span>
  <style>
    @keyframes aquilaDot {
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
