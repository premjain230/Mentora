import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { escapeHtml } from "./lifecycle.js";

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

let cache = { key: null, promise: null };

function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function pickQuestion(uid) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const hash = [...uid].reduce((total, char) => total + char.charCodeAt(0), 0);
  return QUESTIONS[(dayOfYear + hash) % QUESTIONS.length];
}

// Share one Firestore read per user/day across StrictMode mounts.
function loadDailyQuestion(db, user) {
  const todayKey = getTodayKey();
  const key = `${user.uid}:${todayKey}`;
  if (cache.key === key && cache.promise) return cache.promise;

  const ref = doc(db, "users", user.uid, "dailyQuestions", todayKey);
  const promise = getDoc(ref)
    .then((snap) =>
      snap.exists() ? null : { ref, question: pickQuestion(user.uid) }
    )
    .catch(() => {
      if (cache.key === key) cache = { key: null, promise: null };
      return null;
    });

  cache = { key, promise };
  return promise;
}

export function checkDailyQuestion({ db, user, lifecycle }) {
  if (!db || !user || !lifecycle) return;

  let cancelled = false;
  let modal = null;

  lifecycle.add(() => {
    cancelled = true;
    if (modal && modal.isConnected) modal.remove();
  });

  loadDailyQuestion(db, user).then((payload) => {
    if (cancelled || lifecycle.disposed || !payload) return;
    modal = showModal(payload, lifecycle);
  });
}

function showModal(payload, lifecycle) {
  const existing = document.getElementById("dailyQuestionModal");
  if (existing) return existing;

  const modal = document.createElement("div");
  modal.id = "dailyQuestionModal";
  modal.innerHTML = `
    <div class="dq-overlay">
      <div class="dq-card" role="dialog" aria-modal="true" aria-label="Daily question">
        <div class="dq-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Daily Question
        </div>
        <div class="dq-question">${escapeHtml(payload.question)}</div>
        <textarea class="dq-textarea" id="dqAnswer" placeholder="Share your thoughts..." maxlength="500"></textarea>
        <div class="dq-counter" id="dqCounter">0/500</div>
        <div class="dq-actions">
          <button class="dq-skip" id="dqSkip" type="button">Skip</button>
          <button class="dq-submit" id="dqSubmit" type="button">Submit</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const textarea = modal.querySelector("#dqAnswer");
  const counter = modal.querySelector("#dqCounter");
  const submitBtn = modal.querySelector("#dqSubmit");
  const skipBtn = modal.querySelector("#dqSkip");

  const close = () => {
    if (modal.isConnected) modal.remove();
  };

  lifecycle.on(textarea, "input", () => {
    const length = textarea.value.length;
    counter.textContent = `${length}/500`;
    counter.classList.toggle("limit-near", length > 450);
  });

  const handleSubmit = async () => {
    const answer = textarea.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    skipBtn.disabled = true;

    try {
      if (answer) {
        await setDoc(payload.ref, {
          question: payload.question,
          answer,
          skipped: false,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(payload.ref, {
          question: payload.question,
          skipped: true,
          createdAt: serverTimestamp(),
        });
      }
    } catch {}

    close();
  };

  lifecycle.on(submitBtn, "click", handleSubmit);
  lifecycle.on(skipBtn, "click", handleSubmit);
  lifecycle.on(textarea, "keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  });

  textarea.focus();
  return modal;
}
