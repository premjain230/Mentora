import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";

const SUBJECT_COLORS = [
  "#6b9bff",
  "#a78bfa",
  "#f5b74a",
  "#ff7b7b",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fb923c",
];

const TABS = ["today", "weekly", "progress", "milestones"];

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function todayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);
  const uid = ctx.user?.uid;
  if (!uid) return () => lifecycle.dispose();

  const els = {
    tabs: root.querySelector("#plannerTabs"),
    content: root.querySelector("#plannerContent"),
    replanBtn: root.querySelector("#plannerReplanBtn"),
    deleteBtn: root.querySelector("#plannerDeleteBtn"),
    replanModal: root.querySelector("#plannerReplanModal"),
    replanSub: root.querySelector("#plannerReplanSub"),
    replanCancel: root.querySelector("#plannerReplanCancel"),
    replanConfirm: root.querySelector("#plannerReplanConfirm"),
    deleteModal: root.querySelector("#plannerDeleteModal"),
    deleteCount: root.querySelector("#plannerDeleteCount"),
    deleteCancel: root.querySelector("#plannerDeleteCancel"),
    deleteConfirm: root.querySelector("#plannerDeleteConfirm"),
  };

  if (!els.content || !els.tabs) {
    return () => lifecycle.dispose();
  }

  const state = {
    profile: null,
    plan: null,
    tasks: [],
    progress: null,
    currentTab: "today",
    loading: true,
  };

  let loadSeq = 0;
  const busyTasks = new Set();
  let replanBusy = false;
  let deleteBusy = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function subjectColor(index) {
    return SUBJECT_COLORS[Math.max(0, index) % SUBJECT_COLORS.length];
  }

  function daysUntil(dateStr) {
    if (!dateStr) return 0;
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return 0;
    return Math.max(0, Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24)));
  }

  function totalHours(progress) {
    return ((Number(progress?.totalMinutesStudied) || 0) / 60).toFixed(1);
  }

  function completionRate(tasks) {
    if (!tasks.length) return 0;
    return Math.round(
      (tasks.filter((task) => task.status === "completed").length / tasks.length) * 100
    );
  }

  function todaysTasks(tasks) {
    const date = todayKey();
    const day = todayName();
    return tasks.filter(
      (task) =>
        task.scheduledDate === date || (!task.scheduledDate && task.day === day)
    );
  }

  function missedTasks(tasks) {
    const date = todayKey();
    return tasks.filter(
      (task) =>
        task.status === "pending" && task.scheduledDate && task.scheduledDate < date
    );
  }

  function planProgressPct(daysLeft) {
    const { profile, plan } = state;
    if (!profile?.examDate || !profile?.startDate) return 0;
    const totalDays = Math.ceil(
      (new Date(profile.examDate) - new Date(profile.startDate)) / 86400000
    );
    if (!totalDays || totalDays <= 0) return 0;
    const remaining = profile.examDate ? daysLeft : plan?.daysUntilExam || 0;
    return Math.min(100, Math.round(((totalDays - remaining) / totalDays) * 100));
  }

  async function readProgress() {
    try {
      const snap = await getDoc(doc(ctx.db, "progress", uid));
      return snap.exists()
        ? snap.data()
        : { tasksCompleted: 0, totalMinutesStudied: 0, subjectHours: {} };
    } catch (err) {
      console.warn("Progress read failed:", err);
      return { tasksCompleted: 0, totalMinutesStudied: 0, subjectHours: {} };
    }
  }

  async function logEvent(type, metadata = {}) {
    try {
      await addDoc(collection(ctx.db, "analytics", uid, "events"), {
        eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        timestamp: serverTimestamp(),
        metadata,
      });
    } catch {
      /* analytics must never block the planner */
    }
  }

  function showLoading() {
    const wrap = el("div", "planner-loading");
    for (let i = 0; i < 3; i += 1) {
      wrap.appendChild(el("span", "planner-loading-dot"));
    }
    els.content.replaceChildren(wrap);
  }

  function updateTopbar() {
    const hasPlan = Boolean(state.plan);
    const missed = missedTasks(state.tasks).length;
    if (els.replanBtn) {
      els.replanBtn.hidden = !hasPlan || missed === 0;
    }
    if (els.deleteBtn) {
      els.deleteBtn.hidden = !hasPlan;
    }
  }

  async function loadPlannerData() {
    const seq = ++loadSeq;
    state.loading = true;
    showLoading();
    try {
      const profileSnap = await getDoc(doc(ctx.db, "users", uid));
      const planQuery = query(
        collection(ctx.db, "studyPlans"),
        where("userId", "==", uid),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const [planSnap, progress] = await Promise.all([
        getDocs(planQuery),
        readProgress(),
      ]);
      if (lifecycle.disposed || seq !== loadSeq) return;

      state.profile = profileSnap.exists() ? profileSnap.data() : null;
      state.progress = progress;

      if (planSnap.empty) {
        state.plan = null;
        state.tasks = [];
        state.loading = false;
        updateTopbar();
        renderNoPlan();
        return;
      }

      const planData = planSnap.docs[0].data();
      state.plan = { ...planData, planId: planData.planId || planSnap.docs[0].id };

      const tasksSnap = await getDocs(
        query(
          collection(ctx.db, "tasks"),
          where("userId", "==", uid),
          where("planId", "==", state.plan.planId),
          orderBy("createdAt", "asc")
        )
      );
      if (lifecycle.disposed || seq !== loadSeq) return;

      state.tasks = tasksSnap.docs.map((taskDoc) => ({
        ...taskDoc.data(),
        taskId: taskDoc.data().taskId || taskDoc.id,
      }));
      state.loading = false;
      updateTopbar();
      renderTab(state.currentTab);
    } catch (err) {
      if (lifecycle.disposed || seq !== loadSeq) return;
      console.error("Planner load failed:", err);
      state.loading = false;
      updateTopbar();
      renderError(err);
    }
  }

  function renderNoPlan() {
    const wrap = el("div", "planner-empty");
    wrap.appendChild(el("div", "planner-empty-icon", "📋"));
    wrap.appendChild(el("div", "planner-empty-title", "No study plan yet"));
    wrap.appendChild(
      el(
        "div",
        "planner-empty-sub",
        "Let Learning Allied build a personalised daily schedule based on your exam, subjects, and available time."
      )
    );
    const btn = el("button", "dash-btn primary", "Create my plan");
    btn.type = "button";
    lifecycle.on(btn, "click", () => ctx.navigate("/planner-onboarding"));
    wrap.appendChild(btn);
    els.content.replaceChildren(wrap);
  }

  function renderError(err) {
    const wrap = el("div", "planner-empty");
    wrap.appendChild(el("div", "planner-empty-icon", "⚠️"));
    wrap.appendChild(el("div", "planner-empty-title", "Could not load your plan"));
    wrap.appendChild(
      el(
        "div",
        "planner-empty-sub",
        err?.message || "Please check your connection and try again."
      )
    );
    const btn = el("button", "dash-btn", "Try again");
    btn.type = "button";
    lifecycle.on(btn, "click", () => loadPlannerData());
    wrap.appendChild(btn);
    els.content.replaceChildren(wrap);
  }

  function renderTab(tab) {
    if (!state.plan) {
      renderNoPlan();
      return;
    }
    if (tab === "weekly") renderWeekly();
    else if (tab === "progress") renderProgress();
    else if (tab === "milestones") renderMilestones();
    else renderToday();
  }

  function statCard(label, value, sub, tone) {
    const card = el("div", `planner-stat${tone ? ` tone-${tone}` : ""}`);
    card.appendChild(el("div", "planner-stat-label", label));
    card.appendChild(el("div", "planner-stat-val", value));
    card.appendChild(el("div", "planner-stat-sub", sub));
    return card;
  }

  function progressLine(label, value, percent) {
    const group = el("div");
    const head = el("div", "planner-prog-label");
    head.appendChild(el("span", null, label));
    head.appendChild(el("span", null, value));
    const bar = el("div", "planner-bar");
    const fill = el("div", "planner-bar-fill");
    fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    bar.appendChild(fill);
    group.append(head, bar);
    return group;
  }

  function renderToday() {
    const { profile, plan, tasks, progress } = state;
    const today = todaysTasks(tasks);
    const missed = missedTasks(tasks);
    const rate = completionRate(tasks);
    const daysLeft = profile?.examDate
      ? daysUntil(profile.examDate)
      : plan?.daysUntilExam || 0;
    const planPct = planProgressPct(daysLeft);

    const wrap = el("div");

    const stats = el("div", "planner-stats");
    stats.append(
      statCard(
        "Completion",
        `${rate}%`,
        `${tasks.filter((task) => task.status === "completed").length} of ${tasks.length} tasks`,
        "accent"
      ),
      statCard(
        "Study streak",
        String(progress?.currentStreak || 0),
        "days in a row",
        "purple"
      ),
      statCard("Total hours", totalHours(progress), "hrs studied so far", "amber"),
      statCard(
        "Days left",
        String(daysLeft),
        `until ${profile?.examType || "exam"}`,
        "red"
      )
    );
    wrap.appendChild(stats);

    const banner = el("div", "planner-countdown");
    banner.appendChild(el("div", "planner-countdown-days", daysLeft));
    const info = el("div", "planner-countdown-info");
    info.appendChild(
      el(
        "div",
        "planner-countdown-title",
        `Days until ${profile?.examType || "your exam"}`
      )
    );
    info.appendChild(
      el(
        "div",
        "planner-countdown-sub",
        plan?.summary || "Keep going — consistency beats intensity."
      )
    );
    banner.appendChild(info);

    const todayDone = today.filter((task) => task.status === "completed").length;
    const todayPct = today.length ? Math.round((todayDone / today.length) * 100) : 0;
    const countdownProgress = el("div", "planner-countdown-progress");
    countdownProgress.append(
      progressLine("Plan progress", `${planPct}%`, planPct),
      progressLine("Today done", `${todayDone}/${today.length} tasks`, todayPct)
    );
    banner.appendChild(countdownProgress);
    wrap.appendChild(banner);

    if (missed.length > 0) {
      const alert = el("div", "planner-missed");
      alert.appendChild(el("span", "planner-missed-icon", "⚠️"));
      const body = el("div", "planner-missed-body");
      body.appendChild(
        el(
          "div",
          "planner-missed-title",
          `${missed.length} task${missed.length > 1 ? "s" : ""} missed`
        )
      );
      body.appendChild(
        el(
          "div",
          "planner-missed-sub",
          "Learning Allied can rebuild your schedule around what was missed."
        )
      );
      alert.appendChild(body);
      const replanBtn = el("button", "planner-task-btn", "Replan");
      replanBtn.type = "button";
      replanBtn.dataset.action = "replan";
      alert.appendChild(replanBtn);
      wrap.appendChild(alert);
    }

    const twoCol = el("div", "planner-two-col");
    const left = el("div");
    const taskHeader = el("div", "planner-section-title");
    taskHeader.appendChild(el("span", null, "Today's sessions"));
    left.appendChild(taskHeader);

    if (today.length === 0) {
      left.appendChild(
        el(
          "div",
          "planner-today-empty",
          "No sessions scheduled for today. Check the weekly tab or create a new plan."
        )
      );
    } else {
      const list = el("div", "planner-task-list");
      today.forEach((task) => list.appendChild(buildTaskCard(task)));
      left.appendChild(list);
    }
    twoCol.appendChild(left);

    const right = el("div");
    right.appendChild(el("div", "planner-section-title", "Subject progress"));
    const panel = el("div", "planner-panel");
    const row = el("div", "planner-subject-row");
    const allocation = plan?.subjectAllocation || {};
    const subjectHours = progress?.subjectHours || {};
    const subjects =
      Object.keys(allocation).length > 0
        ? Object.keys(allocation)
        : profile?.subjects || [];

    if (subjects.length === 0) {
      row.appendChild(el("div", "planner-today-empty", "No subject data yet."));
    }

    subjects.forEach((subject, index) => {
      const studied = Number(subjectHours[subject]) || 0;
      const weekly = Number(allocation[subject]?.weeklyHours);
      const target = weekly ? weekly * 4 : 20;
      const pct = Math.min(100, Math.round((studied / target) * 100));
      const item = el("div", "planner-subj-item");
      const head = el("div", "planner-subj-head");
      head.appendChild(el("span", "planner-subj-name", subject));
      head.appendChild(el("span", "planner-subj-pct", `${pct}%`));
      const bar = el("div", "planner-subj-bar");
      const fill = el("div", "planner-subj-fill");
      fill.style.width = `${pct}%`;
      fill.style.background = subjectColor(index);
      bar.appendChild(fill);
      item.append(head, bar);
      row.appendChild(item);
    });
    panel.appendChild(row);
    right.appendChild(panel);
    twoCol.appendChild(right);
    wrap.appendChild(twoCol);

    els.content.replaceChildren(wrap);
  }

  function buildTaskCard(task) {
    const card = el(
      "div",
      `planner-task${task.status === "completed" ? " completed" : ""}`
    );
    card.dataset.taskId = task.taskId;

    const check = el(
      "button",
      `planner-task-check${task.status === "completed" ? " done" : ""}`,
      task.status === "completed" ? "✓" : ""
    );
    check.type = "button";
    check.dataset.action = "complete";
    check.setAttribute("aria-label", `Mark ${task.topic || "task"} complete`);
    check.setAttribute("aria-pressed", task.status === "completed" ? "true" : "false");
    card.appendChild(check);

    const body = el("div", "planner-task-body");
    const subjects = state.profile?.subjects || [];
    const subjectIndex = subjects.indexOf(task.subject);
    const subjectEl = el("div", "planner-task-subject", task.subject || "Study");
    subjectEl.style.color = subjectColor(subjectIndex >= 0 ? subjectIndex : 0);
    body.appendChild(subjectEl);
    body.appendChild(el("div", "planner-task-topic", task.topic || "Session"));

    const meta = el("div", "planner-task-meta");
    meta.appendChild(el("span", "planner-task-dur", `${task.durationMinutes || 60} min`));
    meta.appendChild(
      el("span", `planner-type ${task.type || "learn"}`, task.type || "learn")
    );
    const priority = el(
      "div",
      `planner-priority ${task.priority || "medium"}`
    );
    priority.title = `${task.priority || "medium"} priority`;
    meta.appendChild(priority);
    body.appendChild(meta);
    card.appendChild(body);

    const actions = el("div", "planner-task-actions");
    if (task.status !== "completed" && task.status !== "skipped") {
      const skip = el("button", "planner-task-btn", "Skip");
      skip.type = "button";
      skip.dataset.action = "skip";
      actions.appendChild(skip);
    }
    card.appendChild(actions);
    return card;
  }

  function findTask(taskId) {
    return state.tasks.find((task) => task.taskId === taskId);
  }

  async function updateProgressCounters(task) {
    const minutes = Number(task.durationMinutes) || 60;
    const updates = {
      lastUpdated: serverTimestamp(),
      totalMinutesStudied: increment(minutes),
      tasksCompleted: increment(1),
    };
    if (task.subject) {
      updates[`subjectHours.${task.subject}`] = increment(minutes / 60);
    }
    await setDoc(doc(ctx.db, "progress", uid), updates, { merge: true });
  }

  async function updateStreak() {
    const data = await readProgress();
    const today = todayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split("T")[0];

    let streak = Number(data.currentStreak) || 0;
    if (data.lastStudiedDate === today) return streak;

    streak = data.lastStudiedDate === yesterdayKey ? streak + 1 : 1;
    await setDoc(
      doc(ctx.db, "progress", uid),
      {
        currentStreak: streak,
        longestStreak: Math.max(streak, Number(data.longestStreak) || 0),
        lastStudiedDate: today,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    return streak;
  }

  function celebrateDayComplete() {
    const overlay = el("div", "planner-celebration");
    overlay.appendChild(el("div", "planner-celeb-pop", "🎉"));
    root.appendChild(overlay);
    toast.show("All of today's tasks done — you crushed it!", "success");
    const outTimer = setTimeout(() => overlay.classList.add("out"), 2600);
    const removeTimer = setTimeout(() => overlay.remove(), 3000);
    lifecycle.add(() => {
      clearTimeout(outTimer);
      clearTimeout(removeTimer);
      overlay.remove();
    });
  }

  async function completeTask(taskId) {
    const task = findTask(taskId);
    if (!task || task.status === "completed" || busyTasks.has(taskId)) return;
    busyTasks.add(taskId);
    try {
      await updateDoc(doc(ctx.db, "tasks", taskId), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateProgressCounters(task);
      const streak = await updateStreak();
      task.status = "completed";
      state.progress = await readProgress();
      if (lifecycle.disposed) return;

      renderTab(state.currentTab);

      if (streak > 1) {
        toast.show(`Task completed · ${streak}-day streak 🔥`, "success");
      } else {
        toast.show("Task completed · Day 1 of a new streak", "success");
      }

      const today = todaysTasks(state.tasks);
      const allDone =
        today.length > 0 && today.every((item) => item.status === "completed");
      if (allDone) celebrateDayComplete();

      await logEvent("task_completed", { subject: task.subject });
    } catch (err) {
      console.error(err);
      toast.show("Could not update task.", "error");
    } finally {
      busyTasks.delete(taskId);
    }
  }

  async function skipTask(taskId) {
    const task = findTask(taskId);
    if (!task || task.status === "completed" || task.status === "skipped") return;
    if (busyTasks.has(taskId)) return;
    busyTasks.add(taskId);
    try {
      await updateDoc(doc(ctx.db, "tasks", taskId), {
        status: "skipped",
        updatedAt: serverTimestamp(),
      });
      await setDoc(
        doc(ctx.db, "progress", uid),
        { tasksSkipped: increment(1), lastUpdated: serverTimestamp() },
        { merge: true }
      );
      task.status = "skipped";
      state.progress = await readProgress();
      if (lifecycle.disposed) return;
      renderTab(state.currentTab);
      toast.show("Task skipped.", "info");
      await logEvent("task_skipped", { subject: task.subject });
    } catch (err) {
      console.error(err);
      toast.show("Could not skip task.", "error");
    } finally {
      busyTasks.delete(taskId);
    }
  }

  function renderWeekly() {
    const weeklyPlan = state.plan?.weeklyPlan || [];
    const wrap = el("div");

    if (weeklyPlan.length === 0) {
      const empty = el("div", "planner-empty");
      empty.appendChild(el("div", "planner-empty-icon", "📅"));
      empty.appendChild(el("div", "planner-empty-title", "No weekly plan data"));
      wrap.appendChild(empty);
      els.content.replaceChildren(wrap);
      return;
    }

    const currentDay = todayName();
    weeklyPlan.forEach((week) => {
      const section = el("div", "planner-week");
      const title = el(
        "div",
        "planner-section-title",
        `Week ${week.week}${week.theme ? ` — ${week.theme}` : ""}`
      );
      section.appendChild(title);

      const grid = el("div", "planner-week-grid");
      (week.days || []).forEach((day) => {
        const col = el(
          "div",
          `planner-week-day${day.day === currentDay ? " today" : ""}`
        );
        col.appendChild(
          el("div", "planner-week-label", String(day.day || "").slice(0, 3))
        );
        (day.sessions || []).forEach((session) => {
          const card = el(
            "div",
            `planner-week-session ${session.type || "learn"}`
          );
          card.appendChild(
            el("div", "planner-ws-subject", session.subject || "Study")
          );
          card.appendChild(
            el(
              "div",
              "planner-ws-topic",
              `${session.topic || "Session"} (${
                Number(session.durationMinutes) || 60
              }m)`
            )
          );
          col.appendChild(card);
        });
        grid.appendChild(col);
      });
      section.appendChild(grid);
      wrap.appendChild(section);
    });

    els.content.replaceChildren(wrap);
  }

  function renderProgress() {
    const { tasks, progress } = state;
    const wrap = el("div");
    const completed = tasks.filter((task) => task.status === "completed").length;
    const skipped = tasks.filter((task) => task.status === "skipped").length;
    const pending = tasks.filter((task) => task.status === "pending").length;

    const stats = el("div", "planner-stats");
    stats.append(
      statCard("Completed", String(completed), "tasks done", "accent"),
      statCard("Hours studied", totalHours(progress), "total hrs", "amber"),
      statCard(
        "Streak",
        String(progress?.currentStreak || 0),
        `best: ${progress?.longestStreak || 0} days`,
        "purple"
      ),
      statCard("Skipped", String(skipped), `${pending} pending`, "")
    );
    wrap.appendChild(stats);

    const subjectHours = progress?.subjectHours || {};
    const subjects = Object.keys(subjectHours);
    if (subjects.length > 0) {
      wrap.appendChild(
        el("div", "planner-section-title", "Hours by subject")
      );
      const panel = el("div", "planner-panel");
      const row = el("div", "planner-subject-row");
      const maxHours = Math.max(
        ...subjects.map((subject) => Number(subjectHours[subject]) || 0)
      );

      subjects.forEach((subject, index) => {
        const hours = Number(subjectHours[subject]) || 0;
        const pct = maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0;
        const item = el("div", "planner-subj-item");
        const head = el("div", "planner-subj-head");
        head.appendChild(el("span", "planner-subj-name", subject));
        head.appendChild(el("span", "planner-subj-pct", `${hours.toFixed(1)}h`));
        const bar = el("div", "planner-subj-bar");
        const fill = el("div", "planner-subj-fill");
        fill.style.width = `${pct}%`;
        fill.style.background = subjectColor(index);
        bar.appendChild(fill);
        item.append(head, bar);
        row.appendChild(item);
      });

      panel.appendChild(row);
      wrap.appendChild(panel);
    }

    els.content.replaceChildren(wrap);
  }

  function renderMilestones() {
    const milestones = state.plan?.milestones || [];
    const wrap = el("div");

    if (milestones.length === 0) {
      const empty = el("div", "planner-empty");
      empty.appendChild(el("div", "planner-empty-icon", "🏆"));
      empty.appendChild(el("div", "planner-empty-title", "No milestones yet"));
      wrap.appendChild(empty);
      els.content.replaceChildren(wrap);
      return;
    }

    wrap.appendChild(el("div", "planner-section-title", "Plan milestones"));
    const list = el("div", "planner-milestones");
    milestones.forEach((milestone) => {
      const item = el("div", "planner-milestone");
      item.appendChild(
        el("div", "planner-milestone-week", `Week ${milestone.week}`)
      );
      const body = el("div");
      body.appendChild(
        el("div", "planner-milestone-goal", milestone.goal || "Milestone")
      );
      const checks = el("div", "planner-milestone-checks");
      (milestone.checkpoints || []).forEach((checkpoint) => {
        checks.appendChild(el("div", "planner-milestone-check", checkpoint));
      });
      body.appendChild(checks);
      item.appendChild(body);
      list.appendChild(item);
    });
    wrap.appendChild(list);

    els.content.replaceChildren(wrap);
  }

  function openReplanModal() {
    const missed = missedTasks(state.tasks);
    if (!state.plan || missed.length === 0) {
      toast.show("No missed tasks to replan.", "info");
      return;
    }
    if (els.replanSub) {
      els.replanSub.textContent = `You have ${missed.length} missed task${
        missed.length !== 1 ? "s" : ""
      }. Learning Allied will generate a 3-day catch-up schedule without overloading your remaining study time.`;
    }
    if (els.replanModal) {
      els.replanModal.hidden = false;
      els.replanConfirm?.focus();
    }
  }

  function closeReplanModal() {
    if (els.replanModal) els.replanModal.hidden = true;
  }

  function openDeleteModal() {
    if (!state.plan) return;
    if (els.deleteCount) {
      const count = state.tasks.length;
      els.deleteCount.textContent = `${count} task${count !== 1 ? "s" : ""}`;
    }
    if (els.deleteModal) {
      els.deleteModal.hidden = false;
      els.deleteCancel?.focus();
    }
  }

  function closeDeleteModal() {
    if (els.deleteModal) els.deleteModal.hidden = true;
  }

  async function executeReplan() {
    if (replanBusy) return;
    const missed = missedTasks(state.tasks).slice(0, 50);
    if (missed.length === 0) {
      closeReplanModal();
      toast.show("No missed tasks to replan.", "info");
      return;
    }

    replanBusy = true;
    if (els.replanConfirm) {
      els.replanConfirm.disabled = true;
      els.replanConfirm.textContent = "Generating…";
    }

    try {
      const res = await ctx.authFetch("/api/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missedTasks: missed.map((task) => ({
            subject: task.subject,
            topic: task.topic,
            durationMinutes: task.durationMinutes,
          })),
          dailyHours: state.profile?.dailyHours || 6,
          examDate: state.profile?.examDate || "",
          examType: state.profile?.examType || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Replan failed.");
      }
      if (lifecycle.disposed) return;

      const adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
      const queues = new Map();
      missed.forEach((task) => {
        const key = `${String(task.subject || "").toLowerCase().trim()}|${String(
          task.topic || ""
        )
          .toLowerCase()
          .trim()}`;
        if (!queues.has(key)) queues.set(key, []);
        queues.get(key).push(task);
      });

      const writes = [];
      adjustments.forEach((adjustment) => {
        const key = `${String(adjustment.subject || "")
          .toLowerCase()
          .trim()}|${String(adjustment.topic || "").toLowerCase().trim()}`;
        const queue = queues.get(key);
        const task = queue && queue.shift();
        if (!task) return;
        const changes = {
          status: "rescheduled",
          priority: ["high", "medium", "low"].includes(adjustment.priority)
            ? adjustment.priority
            : task.priority || "medium",
          updatedAt: serverTimestamp(),
        };
        if (adjustment.suggestedDate) {
          changes.scheduledDate = adjustment.suggestedDate;
        }
        writes.push(updateDoc(doc(ctx.db, "tasks", task.taskId), changes));
      });

      const results = await Promise.allSettled(writes);
      const applied = results.filter((result) => result.status === "fulfilled")
        .length;
      if (lifecycle.disposed) return;

      closeReplanModal();
      await logEvent("replan_generated", {
        missedCount: missed.length,
        rescheduled: applied,
      });

      if (applied > 0) {
        toast.show(
          `Catch-up plan applied to ${applied} task${applied !== 1 ? "s" : ""}.`,
          "success"
        );
      } else {
        toast.show("No schedule changes were suggested.", "info");
      }
      await loadPlannerData();
    } catch (err) {
      console.error(err);
      toast.show(err?.message || "Could not generate catch-up plan.", "error");
    } finally {
      replanBusy = false;
      if (els.replanConfirm) {
        els.replanConfirm.disabled = false;
        els.replanConfirm.textContent = "Generate catch-up plan";
      }
    }
  }

  async function executeDeletePlan() {
    if (deleteBusy || !state.plan) return;
    deleteBusy = true;
    if (els.deleteConfirm) {
      els.deleteConfirm.disabled = true;
      els.deleteConfirm.textContent = "Deleting…";
    }

    const planId = state.plan.planId;
    try {
      const batch = writeBatch(ctx.db);
      const snap = await getDocs(
        query(
          collection(ctx.db, "tasks"),
          where("planId", "==", planId),
          where("userId", "==", uid)
        )
      );
      snap.forEach((taskDoc) => batch.delete(taskDoc.ref));
      batch.delete(doc(ctx.db, "studyPlans", planId));
      await batch.commit();
      if (lifecycle.disposed) return;

      await logEvent("plan_deleted", { planId });
      closeDeleteModal();
      state.plan = null;
      state.tasks = [];
      state.loading = true;
      updateTopbar();
      showLoading();
      toast.show("Plan deleted.", "success");

      const timer = setTimeout(() => {
        if (!lifecycle.disposed) ctx.navigate("/planner-onboarding");
      }, 1200);
      lifecycle.add(() => clearTimeout(timer));
    } catch (err) {
      console.error(err);
      toast.show(err?.message || "Could not delete plan.", "error");
      if (els.deleteConfirm) {
        els.deleteConfirm.disabled = false;
        els.deleteConfirm.textContent = "Yes, delete plan";
      }
    } finally {
      deleteBusy = false;
    }
  }

  function setTab(tab) {
    if (!TABS.includes(tab)) return;
    state.currentTab = tab;
    els.tabs.querySelectorAll(".planner-tab").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (state.loading) return;
    renderTab(tab);
  }

  lifecycle.on(els.tabs, "click", (event) => {
    const tab = event.target.closest(".planner-tab");
    if (!tab) return;
    setTab(tab.dataset.tab);
  });

  lifecycle.on(els.tabs, "keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const tab = event.target.closest(".planner-tab");
    if (!tab) return;
    event.preventDefault();
    setTab(tab.dataset.tab);
  });

  lifecycle.on(els.content, "click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const kind = action.dataset.action;
    if (kind === "replan") {
      openReplanModal();
      return;
    }
    const card = action.closest("[data-task-id]");
    const taskId = card?.dataset.taskId;
    if (!taskId) return;
    if (kind === "complete") completeTask(taskId);
    else if (kind === "skip") skipTask(taskId);
  });

  lifecycle.on(els.replanBtn, "click", openReplanModal);
  lifecycle.on(els.deleteBtn, "click", openDeleteModal);
  lifecycle.on(els.replanCancel, "click", closeReplanModal);
  lifecycle.on(els.replanConfirm, "click", executeReplan);
  lifecycle.on(els.deleteCancel, "click", closeDeleteModal);
  lifecycle.on(els.deleteConfirm, "click", executeDeletePlan);

  [els.replanModal, els.deleteModal].forEach((modal) => {
    lifecycle.on(modal, "click", (event) => {
      if (event.target !== modal) return;
      modal.hidden = true;
    });
  });

  lifecycle.on(document, "keydown", (event) => {
    if (event.key !== "Escape") return;
    if (els.replanModal && !els.replanModal.hidden) closeReplanModal();
    if (els.deleteModal && !els.deleteModal.hidden) closeDeleteModal();
  });

  showLoading();
  loadPlannerData();

  return () => lifecycle.dispose();
}
