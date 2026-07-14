import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const QUESTIONS = [
  "What is one thing you learned yesterday that you want to understand better today?",
  "If you could master one subject instantly, which would it be and why?",
  "What's the biggest distraction stopping you from studying right now?",
  "Describe a moment when studying felt truly exciting. What made it different?",
  "What would your ideal study session look like from start to finish?",
  "Which topic have you been avoiding, and what's one small step you can take toward it today?",
  "If you could ask the smartest person in the world one question about your studies, what would it be?",
  "What grade or result would make you proud, not because of the number, but because of the growth it represents?",
  "What is a study habit you've outgrown, and what new habit do you want to build?",
  "When do you feel most focused — morning, afternoon, or night — and how can you protect that time?",
  "What's one concept you think you understand but would struggle to explain to a 10-year-old?",
  "If your future self could send one piece of advice back to you today, what would it be?",
  "What part of studying brings you the most joy, and how can you do more of it?",
  "How do you measure your progress beyond marks and grades?",
  "What's the most interesting question you've ever been asked about your field of study?",
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pickQuestion(uid) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const hash = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0);
  return QUESTIONS[(dayOfYear + hash) % QUESTIONS.length];
}

export async function checkDailyQuestion(user) {
  if (!user || !db) return;

  const todayKey = getTodayKey();
  const dqRef = doc(db, "users", user.uid, "dailyQuestions", todayKey);

  try {
    const snap = await getDoc(dqRef);
    if (snap.exists()) return;
  } catch {
    return;
  }

  const question = pickQuestion(user.uid);
  showModal(question, dqRef);
}

function showModal(question, dqRef) {
  const existing = document.getElementById("dailyQuestionModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "dailyQuestionModal";
  modal.innerHTML = `
    <style>
      .dq-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: dqFadeIn 0.3s ease;
      }
      @keyframes dqFadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes dqSlideUp { from { opacity:0; transform:translateY(24px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
      .dq-card {
        max-width: 520px; width: 100%;
        background: var(--glass, rgba(26,29,39,0.85));
        border: 1px solid var(--border, rgba(255,255,255,0.1));
        border-radius: 22px;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        padding: 36px 32px 28px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.45);
        animation: dqSlideUp 0.35s cubic-bezier(0.16,1,0.3,1);
      }
      .dq-badge {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 1.5px;
        color: var(--accent, #00d4ff);
        background: rgba(0,212,255,0.08);
        border: 1px solid rgba(0,212,255,0.2);
        border-radius: 20px;
        padding: 4px 12px;
        margin-bottom: 16px;
      }
      .dq-badge svg { width: 12px; height: 12px; }
      .dq-question {
        font-size: 17px; font-weight: 500;
        color: var(--text-primary, #f0f0f8);
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .dq-textarea {
        width: 100%; min-height: 100px; max-height: 200px;
        background: var(--bg-input, #1e2130);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 12px;
        padding: 14px 16px;
        font-family: var(--font-main, 'Sora', sans-serif);
        font-size: 14px;
        color: var(--text-primary, #f0f0f8);
        resize: none;
        outline: none;
        transition: border-color 0.2s;
        line-height: 1.6;
        overflow-y: auto;
      }
      .dq-textarea:focus {
        border-color: rgba(0,212,255,0.4);
        box-shadow: 0 0 0 3px rgba(0,212,255,0.10);
      }
      .dq-textarea::placeholder { color: var(--text-muted, #4a4d62); }
      .dq-counter {
        text-align: right;
        font-size: 11px;
        color: var(--text-muted, #4a4d62);
        font-family: var(--font-mono, 'Space Mono', monospace);
        margin-top: 6px;
        transition: color 0.2s;
      }
      .dq-counter.limit-near { color: var(--accent3, #ff6b6b); }
      .dq-actions {
        display: flex; gap: 10px; margin-top: 16px;
        justify-content: flex-end;
      }
      .dq-skip {
        padding: 10px 18px;
        background: transparent;
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 10px;
        color: var(--text-secondary, #8b8fa8);
        font-family: var(--font-main, 'Sora', sans-serif);
        font-size: 13px; font-weight: 500;
        cursor: pointer;
        transition: all 0.18s;
      }
      .dq-skip:hover { background: rgba(255,255,255,0.04); color: var(--text-primary, #f0f0f8); }
      .dq-submit {
        padding: 10px 24px;
        background: var(--accent, #00d4ff);
        border: none; border-radius: 10px;
        color: #06121a;
        font-family: var(--font-main, 'Sora', sans-serif);
        font-size: 13px; font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 14px rgba(0,212,255,0.35);
      }
      .dq-submit:hover { background: #33ddff; transform: translateY(-1px); }
      .dq-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    </style>
    <div class="dq-overlay">
      <div class="dq-card">
        <div class="dq-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Daily Question
        </div>
        <div class="dq-question">${escHtml(question)}</div>
        <textarea class="dq-textarea" id="dqAnswer" placeholder="Share your thoughts..." maxlength="500"></textarea>
        <div class="dq-counter" id="dqCounter">0/500</div>
        <div class="dq-actions">
          <button class="dq-skip" id="dqSkip">Skip</button>
          <button class="dq-submit" id="dqSubmit">Submit</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const textarea = document.getElementById("dqAnswer");
  const submitBtn = document.getElementById("dqSubmit");
  const skipBtn = document.getElementById("dqSkip");

  textarea.focus();

  const counter = document.getElementById("dqCounter");
  textarea.addEventListener("input", () => {
    const len = textarea.value.length;
    counter.textContent = `${len}/500`;
    counter.classList.toggle("limit-near", len > 450);
  });

  async function handleSubmit() {
    const answer = textarea.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    skipBtn.disabled = true;
    if (answer) {
      try {
        await setDoc(dqRef, {
          question,
          answer,
          skipped: false,
          createdAt: serverTimestamp(),
        });
      } catch {}
    } else {
      try {
        await setDoc(dqRef, {
          question,
          skipped: true,
          createdAt: serverTimestamp(),
        });
      } catch {}
    }
    modal.remove();
  }

  submitBtn.addEventListener("click", handleSubmit);
  skipBtn.addEventListener("click", handleSubmit);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });
}

function escHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
