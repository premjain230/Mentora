import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";
import { formatDate } from "./shared/format.js";

const DURATION_DEFAULT = 25;

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);

  const els = {
    setupView: root.querySelector("#ssSetupView"),
    sessionView: root.querySelector("#ssSessionView"),
    subject: root.querySelector("#ssSubject"),
    topic: root.querySelector("#ssTopic"),
    goal: root.querySelector("#ssGoal"),
    durations: root.querySelector("#ssDurations"),
    startBtn: root.querySelector("#ssStartBtn"),
    history: root.querySelector("#ssHistory"),
    sessionTitle: root.querySelector("#ssSessionTitle"),
    sessionMeta: root.querySelector("#ssSessionMeta"),
    timer: root.querySelector("#ssTimer"),
    ring: root.querySelector("#ssTimerRing"),
    goalBox: root.querySelector("#ssGoalBox"),
    goalText: root.querySelector("#ssGoalText"),
    pauseBtn: root.querySelector("#ssPauseBtn"),
    resumeBtn: root.querySelector("#ssResumeBtn"),
    endBtn: root.querySelector("#ssEndBtn"),
    objectives: root.querySelector("#ssObjectives"),
    tipsSection: root.querySelector("#ssTipsSection"),
    tips: root.querySelector("#ssTips"),
    keyPoints: root.querySelector("#ssKeyPoints"),
    practiceSection: root.querySelector("#ssPracticeSection"),
    practice: root.querySelector("#ssPracticeQuestions"),
  };

  const state = {
    sessionDocId: null,
    timerInterval: null,
    secondsElapsed: 0,
    sessionStatus: "active",
    plan: null,
    lastPersist: 0,
    paused: false,
  };

  if (!els.setupView || !els.sessionView) {
    return () => lifecycle.dispose();
  }

  async function emitEvent(type, fields = {}) {
    if (!ctx.user) return;
    try {
      await ctx.authFetch("/api/learning-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          source: "study_session",
          ...fields,
        }),
      });
    } catch (err) {
      console.warn("Could not emit learning event:", err);
    }
  }

  function conceptIdFor(subject, topic) {
    const clean = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60);
    const left = clean(subject);
    const right = clean(topic);
    if (!left) return null;
    return right ? `${left}_${right}` : left;
  }

  function showSetup() {
    els.setupView.hidden = false;
    els.sessionView.hidden = true;
  }

  function showSession() {
    els.setupView.hidden = true;
    els.sessionView.hidden = false;
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function startTimer() {
    stopTimer();
    state.paused = false;
    state.timerInterval = setInterval(tick, 1000);
    if (els.pauseBtn) els.pauseBtn.hidden = false;
    if (els.resumeBtn) els.resumeBtn.hidden = true;
  }

  function tick() {
    state.secondsElapsed += 1;
    updateTimer();
    maybePersistProgress();
  }

  function updateTimer() {
    const minutes = String(Math.floor(state.secondsElapsed / 60)).padStart(2, "0");
    const seconds = String(state.secondsElapsed % 60).padStart(2, "0");
    if (els.timer) els.timer.textContent = `${minutes}:${seconds}`;
    if (els.ring && state.plan) {
      const total = Math.max(1, Number(state.plan.durationMinutes) * 60) || 1;
      const percent = Math.min(100, (state.secondsElapsed / total) * 100);
      els.ring.style.setProperty("--p", `${percent}%`);
    }
  }

  function maybePersistProgress() {
    const now = Date.now();
    if (now - state.lastPersist < 10000) return;
    state.lastPersist = now;
    persistProgress();
  }

  function persistProgress() {
    if (!state.sessionDocId || !ctx.user) return;
    state.lastPersist = Date.now();
    updateDoc(
      doc(ctx.db, "users", ctx.user.uid, "studySessions", state.sessionDocId),
      { timeFocused: state.secondsElapsed, updatedAt: serverTimestamp() }
    ).catch((err) => console.warn("Progress save failed", err));
  }

  function renderChecklist(container, items) {
    if (!container) return;
    container.replaceChildren();
    (items || []).forEach((item) => {
      const row = document.createElement("div");
      row.className = "study-check-item";
      row.setAttribute("role", "checkbox");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-checked", "false");

      const box = document.createElement("div");
      box.className = "study-check-box";

      const label = document.createElement("div");
      label.className = "study-check-label";
      label.textContent = String(item);

      row.append(box, label);
      lifecycle.on(row, "click", () => {
        const done = row.classList.toggle("done");
        row.setAttribute("aria-checked", done ? "true" : "false");
      });
      lifecycle.on(row, "keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        row.click();
      });

      container.appendChild(row);
    });
  }

  function renderBullets(container, items, className = "study-key-point", dotClass = "dot") {
    if (!container) return;
    container.replaceChildren();
    (items || []).forEach((item) => {
      const row = document.createElement("div");
      row.className = className;

      const dot = document.createElement("span");
      dot.className = dotClass;

      const text = document.createElement("span");
      text.textContent = String(item);

      row.append(dot, text);
      container.appendChild(row);
    });
  }

  function renderPractice(container, items) {
    if (!container) return;
    container.replaceChildren();
    (items || []).forEach((item) => {
      const block = document.createElement("div");
      block.className = "study-practice-item";
      block.textContent = String(item);
      container.appendChild(block);
    });
  }

  function renderSession() {
    const plan = state.plan;
    if (!plan) return;

    if (els.sessionTitle) {
      els.sessionTitle.textContent =
        plan.title || `${plan.subject} — ${plan.topic}`;
    }
    if (els.sessionMeta) {
      els.sessionMeta.textContent = `${plan.subject} · ${plan.topic} · ${plan.durationMinutes} min`;
    }

    renderChecklist(els.objectives, plan.objectives);
    if (!plan.objectives?.length && els.objectives) {
      const empty = document.createElement("div");
      empty.className = "study-empty-state";
      empty.textContent = "No objectives generated.";
      els.objectives.appendChild(empty);
    }

    const tips = plan.focusTips || [];
    if (els.tipsSection) els.tipsSection.hidden = tips.length === 0;
    renderBullets(els.tips, tips, "study-key-point", "dot tip");

    renderBullets(els.keyPoints, plan.keyPoints);
    if (!plan.keyPoints?.length && els.keyPoints) {
      const empty = document.createElement("div");
      empty.className = "study-empty-state";
      empty.textContent = "No key points generated.";
      els.keyPoints.appendChild(empty);
    }

    const practice = plan.practiceQuestions || [];
    if (els.practiceSection) els.practiceSection.hidden = practice.length === 0;
    renderPractice(els.practice, practice);

    if (els.goalBox && els.goalText) {
      if (plan.goal) {
        els.goalBox.hidden = false;
        els.goalText.textContent = plan.goal;
      } else {
        els.goalBox.hidden = true;
        els.goalText.textContent = "";
      }
    }

    showSession();
    updateTimer();
    startTimer();
  }

  async function startSession() {
    const subject = els.subject?.value.trim() || "";
    const topic = els.topic?.value.trim() || "";
    const goal = els.goal?.value.trim() || "";
    const activeChip = els.durations?.querySelector(".study-duration-chip.active");
    const durationMinutes = parseInt(activeChip?.dataset.min, 10) || DURATION_DEFAULT;

    if (!subject) {
      toast.show("Please enter a subject.", "error");
      return;
    }
    if (!topic) {
      toast.show("Please enter a topic.", "error");
      return;
    }

    if (els.startBtn) {
      els.startBtn.disabled = true;
      els.startBtn.textContent = "Building your session…";
    }

    try {
      const res = await ctx.authFetch("/api/study-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, durationMinutes, goal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create your session.");

      const plan = { goal: goal || "", ...(data.plan || {}) };
      state.plan = {
        title: String(plan.title || `${subject} — ${topic}`),
        subject: String(plan.subject || subject),
        topic: String(plan.topic || topic),
        durationMinutes: Number(plan.durationMinutes) || durationMinutes,
        goal: String(plan.goal || ""),
        objectives: Array.isArray(plan.objectives) ? plan.objectives : [],
        keyPoints: Array.isArray(plan.keyPoints) ? plan.keyPoints : [],
        practiceQuestions: Array.isArray(plan.practiceQuestions)
          ? plan.practiceQuestions
          : [],
        focusTips: Array.isArray(plan.focusTips) ? plan.focusTips : [],
      };

      const sessionRef = doc(
        collection(ctx.db, "users", ctx.user.uid, "studySessions")
      );
      await setDoc(sessionRef, {
        subject: state.plan.subject,
        topic: state.plan.topic,
        durationMinutes: state.plan.durationMinutes,
        goal: state.plan.goal,
        plan: {
          title: state.plan.title,
          objectives: state.plan.objectives,
          keyPoints: state.plan.keyPoints,
          practiceQuestions: state.plan.practiceQuestions,
          focusTips: state.plan.focusTips,
        },
        status: "active",
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      state.sessionDocId = sessionRef.id;
      state.secondsElapsed = 0;
      state.sessionStatus = "active";
      state.lastPersist = 0;

      const conceptId = conceptIdFor(state.plan.subject, state.plan.topic);
      void emitEvent("study_session_started", {
        conceptId,
        subject: state.plan.subject,
        topic: state.plan.topic,
        sessionId: sessionRef.id,
        payload: { durationMinutes: state.plan.durationMinutes, source: "study_session" },
      });
      void emitEvent("lesson_started", {
        conceptId,
        subject: state.plan.subject,
        topic: state.plan.topic,
        sessionId: sessionRef.id,
        payload: { durationMinutes: state.plan.durationMinutes },
      });

      renderSession();
      if (els.startBtn) {
        els.startBtn.disabled = false;
        els.startBtn.textContent = "Start Session";
      }
    } catch (err) {
      if (els.startBtn) {
        els.startBtn.disabled = false;
        els.startBtn.textContent = "Start Session";
      }
      toast.show(err?.message || "Could not create your session right now.", "error");
    }
  }

  function pauseTimer() {
    stopTimer();
    state.paused = true;
    if (els.pauseBtn) els.pauseBtn.hidden = true;
    if (els.resumeBtn) els.resumeBtn.hidden = false;
  }

  function resumeTimer() {
    if (state.sessionStatus !== "active") return;
    startTimer();
  }

  async function endSession() {
    const wasPaused = state.paused;
    stopTimer();

    if (!window.confirm("Finish this session? Your focused time will be saved.")) {
      if (!wasPaused) startTimer();
      return;
    }

    state.sessionStatus = "completed";
    state.paused = false;

    if (state.sessionDocId && ctx.user) {
      try {
        await updateDoc(
          doc(ctx.db, "users", ctx.user.uid, "studySessions", state.sessionDocId),
          {
            status: "completed",
            timeFocused: state.secondsElapsed,
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      } catch (err) {
        console.warn("Session close failed", err);
      }

      const plan = state.plan;
      if (plan && state.secondsElapsed >= 60) {
        const conceptId = conceptIdFor(plan.subject, plan.topic);
        void emitEvent("study_session_completed", {
          conceptId,
          subject: plan.subject,
          topic: plan.topic,
          sessionId: state.sessionDocId,
          payload: {
            durationMinutes: plan.durationMinutes,
            timeFocusedSeconds: state.secondsElapsed,
            source: "study_session",
          },
        });
        if (state.secondsElapsed >= 120) {
          void emitEvent("topic_reviewed", {
            conceptId,
            subject: plan.subject,
            topic: plan.topic,
            sessionId: state.sessionDocId,
            payload: { timeFocusedSeconds: state.secondsElapsed },
          });
        }
      }
    }

    toast.show("Session saved — nice focus!", "success");
    state.sessionDocId = null;
    state.plan = null;
    state.secondsElapsed = 0;
    loadHistory();
    showSetup();
  }

  function renderHistory(list) {
    if (!els.history) return;
    els.history.replaceChildren();

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "study-empty-state";
      empty.textContent =
        "No sessions yet. Start your first guided focus block above — it stays synced with the Learning Allied app.";
      els.history.appendChild(empty);
      return;
    }

    const icons = {
      completed: "Completed",
      abandoned: "Abandoned",
      active: "Active",
    };

    list.forEach((session) => {
      const row = document.createElement("div");
      row.className = "study-history-item";

      const icon = document.createElement("div");
      icon.className = "study-history-icon";
      icon.innerHTML =
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

      const body = document.createElement("div");
      body.className = "study-history-body";

      const name = document.createElement("div");
      name.className = "study-history-name";
      name.textContent = `${session.subject || "Study"} · ${session.topic || "Session"}`;

      const parts = [];
      if (session.durationMinutes) parts.push(`${session.durationMinutes} min`);
      const when = formatDate(session.startedAt);
      if (when) parts.push(when);

      const sub = document.createElement("div");
      sub.className = "study-history-sub";
      sub.textContent = parts.join(" · ");

      body.append(name, sub);

      const status = document.createElement("span");
      const statusKey = session.status || "active";
      status.className = `study-history-status ${statusKey}`;
      status.textContent = icons[statusKey] || "Active";

      row.append(icon, body, status);
      els.history.appendChild(row);
    });
  }

  async function loadHistory() {
    if (!els.history) return;
    try {
      const snap = await getDocs(
        query(
          collection(ctx.db, "users", ctx.user.uid, "studySessions"),
          orderBy("startedAt", "desc"),
          limit(20)
        )
      );
      if (lifecycle.disposed) return;
      const list = snap.docs.map((sessionDoc) => ({
        id: sessionDoc.id,
        ...sessionDoc.data(),
      }));
      renderHistory(list);
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("Could not load session history:", err);
      els.history.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "study-empty-state";
      empty.textContent = "Could not load your history.";
      els.history.appendChild(empty);
    }
  }

  lifecycle.on(els.durations, "click", (event) => {
    const chip = event.target.closest(".study-duration-chip");
    if (!chip) return;
    els.durations
      .querySelectorAll(".study-duration-chip")
      .forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
  });

  lifecycle.on(els.startBtn, "click", startSession);
  lifecycle.on(els.pauseBtn, "click", pauseTimer);
  lifecycle.on(els.resumeBtn, "click", resumeTimer);
  lifecycle.on(els.endBtn, "click", endSession);

  lifecycle.on(document, "visibilitychange", () => {
    if (document.hidden && state.sessionDocId) persistProgress();
  });
  lifecycle.on(window, "beforeunload", () => {
    if (state.sessionDocId && state.sessionStatus === "active") persistProgress();
  });
  lifecycle.on(window, "pagehide", () => {
    if (state.sessionDocId) persistProgress();
  });

  lifecycle.add(() => {
    stopTimer();
    if (state.sessionDocId && state.sessionStatus === "active") persistProgress();
  });

  showSetup();
  loadHistory();

  return () => lifecycle.dispose();
}
