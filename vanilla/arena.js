/**
 * Arena controller — vanilla port of the legacy arena.html module script.
 * Real Firestore progress via /api/arena, real AI battles via /api/groq-proxy,
 * learning events via /api/learning-event. No sample questions: if the AI is
 * unreachable the battle surfaces an error and offers a retry.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
} from "firebase/firestore";
import {
  getChapters,
  getSubjectsForTrack,
  getTracks,
  toSubjectKey,
} from "../js/learning/arena-curriculum.js";
import { createLifecycle, escapeHtml } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";
import {
  DEFEAT_SCORE,
  FINAL_BOSS_DEFEAT_SCORE,
  canBattle,
  computeProgress,
  createDefaultProgress,
  defeatChapter,
} from "./arena/progress.js";

const MODEL = "openai/gpt-oss-120b";
const LAST_SUBJECT_KEY = "arena_last_subjectKey";
const BATTLE_SIZE = 5;
const BOSS_SIZE = 8;

export function mount(root, ctx) {
  if (!root || !ctx?.user) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);
  const uid = ctx.user.uid;

  const byId = (id) => root.querySelector(`#${id}`);
  const els = {
    breadcrumb: byId("breadcrumb"),
    battleGrid: byId("battleGrid"),
    continueRow: byId("continueRow"),
    continueLabel: byId("continueLabel"),
    continueBtn: byId("continueBtn"),
    landingError: byId("landingError"),
    classTitle: byId("classTitle"),
    classRow: byId("classRow"),
    subjectTitle: byId("subjectTitle"),
    subjectGrid: byId("subjectGrid"),
    mapSubject: byId("mapSubject"),
    mapSubtitle: byId("mapSubtitle"),
    mapProgress: byId("mapProgress"),
    mapDefeated: byId("mapDefeated"),
    masteryChip: byId("masteryChip"),
    mapMastered: byId("mapMastered"),
    mapProgressFill: byId("mapProgressFill"),
    mapSearch: byId("mapSearch"),
    resumeBtn: byId("resumeBtn"),
    mapLoading: byId("mapLoading"),
    mapError: byId("mapError"),
    mapEmpty: byId("mapEmpty"),
    mapPath: byId("mapPath"),
    mapStage: byId("mapStage"),
    chTitle: byId("chTitle"),
    chSubtitle: byId("chSubtitle"),
    chState: byId("chState"),
    chDiff: byId("chDiff"),
    chProgress: byId("chProgress"),
    chMastery: byId("chMastery"),
    chTopics: byId("chTopics"),
    chLevels: byId("chLevels"),
    chLockedMsg: byId("chLockedMsg"),
    enterBattleBtn: byId("enterBattleBtn"),
    replayBtn: byId("replayBtn"),
    chPrev: byId("chPrev"),
    battleTitle: byId("battleTitle"),
    battleSubtitle: byId("battleSubtitle"),
    qCounter: byId("qCounter"),
    qLevelLabel: byId("qLevelLabel"),
    qFill: byId("qFill"),
    qText: byId("qText"),
    qOptions: byId("qOptions"),
    qFeedback: byId("qFeedback"),
    battleError: byId("battleError"),
    battleRetryBtn: byId("battleRetryBtn"),
    nextQBtn: byId("nextQBtn"),
    quitBattleBtn: byId("quitBattleBtn"),
    victoryText: byId("victoryText"),
    confetti: byId("confetti"),
    victoryClose: byId("victoryClose"),
    victoryNext: byId("victoryNext"),
    bossBody: byId("bossBody"),
  };

  let selectedTrack = null;
  let selectedClass = null;
  let selectedSubject = null;
  let selectedSubjectKey = null;

  let chapters = [];
  let progress = null;
  let masteryMap = {};
  let activeChapter = null;
  let progressUnsub = null;

  let classTimer = null;
  let battleAbort = null;
  let battleRequestToken = 0;
  let bossRequestToken = 0;

  let battleQs = [];
  let battleIdx = 0;
  let battleScore = 0;
  let battleConcept = null;
  let battleReplay = false;

  let bossQs = [];
  let bossIdx = 0;
  let bossScore = 0;

  hydrateTopbar(root, ctx.user);
  initLanding();
  loadContinue();
  restoreFromUrl();

  lifecycle.add(() => {
    if (classTimer) clearTimeout(classTimer);
    if (battleAbort) battleAbort.abort();
    unsubscribeProgress();
  });

  bindChrome();

  return () => lifecycle.dispose();

  /* ── Chrome ────────────────────────────────────────────── */

  function bindChrome() {
    for (const el of root.querySelectorAll("[data-close]")) {
      lifecycle.on(el, "click", () => closeModal(el.dataset.close));
    }

    lifecycle.on(document, "keydown", (event) => {
      if (event.key !== "Escape") return;
      ["chapterModal", "battleModal", "victoryModal", "bossModal"].forEach(
        closeModal
      );
    });

    for (const el of root.querySelectorAll("[data-arena-back]")) {
      lifecycle.on(el, "click", () => arenaBack());
    }

    lifecycle.on(els.breadcrumb, "click", (event) => {
      const link = event.target.closest("[data-arena-nav]");
      if (!link) return;
      event.preventDefault();
      arenaNav(link.dataset.arenaNav);
    });

    if (els.mapSearch) lifecycle.on(els.mapSearch, "input", renderMap);

    lifecycle.on(els.enterBattleBtn, "click", () => {
      closeModal("chapterModal");
      startBattle(activeChapter, false);
    });

    lifecycle.on(els.replayBtn, "click", () => {
      closeModal("chapterModal");
      startBattle(activeChapter, true);
    });

    lifecycle.on(els.battleRetryBtn, "click", () => {
      if (battleConcept) startBattle(battleConcept, battleReplay);
    });

    lifecycle.on(els.nextQBtn, "click", async () => {
      if (battleIdx < battleQs.length - 1) {
        battleIdx += 1;
        renderQ();
      } else {
        await finishBattle();
      }
    });

    lifecycle.on(els.quitBattleBtn, "click", () => {
      if (battleQs.length && !window.confirm("Quit battle? Progress for this battle will be lost.")) {
        return;
      }
      closeModal("battleModal");
    });

    lifecycle.on(els.victoryClose, "click", () => {
      closeModal("victoryModal");
      renderMap();
      els.mapStage?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    lifecycle.on(els.victoryNext, "click", () => {
      closeModal("victoryModal");
      renderMap();
      if (progress?.currentChapterId) openChapter(progress.currentChapterId);
    });
  }

  /* ── Views and breadcrumb ──────────────────────────────── */

  function setView(id) {
    for (const view of ["viewLanding", "viewClass", "viewSubject", "viewMap"]) {
      byId(view)?.classList.toggle("hidden", view !== id);
    }
  }

  function arenaNav(view) {
    if (view !== "landing") return;
    unsubscribeProgress();
    selectedTrack = null;
    selectedClass = null;
    selectedSubject = null;
    selectedSubjectKey = null;
    setView("viewLanding");
    breadcrumb();
    smoothTop();
  }

  function arenaBack() {
    if (byId("viewMap") && !byId("viewMap").classList.contains("hidden")) {
      unsubscribeProgress();
      setView("viewSubject");
      breadcrumb();
      return;
    }

    if (!byId("viewSubject").classList.contains("hidden")) {
      if (selectedTrack && (selectedTrack.id === "maharashtra" || selectedTrack.id === "cbse")) {
        setView("viewClass");
      } else {
        arenaNav("landing");
      }
      breadcrumb();
      return;
    }

    if (!byId("viewClass").classList.contains("hidden")) {
      arenaNav("landing");
    }
  }

  function breadcrumb() {
    if (!els.breadcrumb) return;
    els.breadcrumb.innerHTML = "";

    const link = document.createElement("a");
    link.href = "#";
    link.dataset.arenaNav = "landing";
    link.textContent = "Arena";
    els.breadcrumb.appendChild(link);

    const addCrumb = (text, current = false) => {
      const separator = document.createElement("span");
      separator.className = "arena-crumb-sep";
      separator.textContent = "›";
      const label = document.createElement("span");
      label.className = current ? "arena-crumb-current" : "arena-crumb-track";
      label.textContent = text;
      els.breadcrumb.append(separator, label);
    };

    if (selectedTrack) addCrumb(selectedTrack.label);
    if (selectedClass) addCrumb(`Class ${selectedClass}`);
    if (selectedSubject) addCrumb(selectedSubject, true);
  }

  /* ── Landing ───────────────────────────────────────────── */

  function initLanding() {
    setView("viewLanding");
    breadcrumb();
    if (!els.battleGrid) return;
    els.battleGrid.innerHTML = "";

    for (const track of getTracks()) {
      const button = document.createElement("button");
      button.className = "battle-card";
      button.type = "button";
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", track.label);
      button.innerHTML = `
        <div class="bg-glow" style="--track-bg:${track.bg}"></div>
        <div class="head"><div class="icon" style="--track-bg:${track.bg}">${track.icon}</div><h3>${escapeHtml(
        track.label
      )}</h3></div>
        <div class="meta">${escapeHtml(track.subtitle)}</div>
        <div class="cta">Enter battlefield</div>
      `;
      lifecycle.on(button, "click", () => selectTrack(track));
      els.battleGrid.appendChild(button);
    }
  }

  function selectTrack(track) {
    selectedTrack = track;
    selectedClass = null;
    selectedSubject = null;
    breadcrumb();
    if (track.id === "maharashtra" || track.id === "cbse") {
      showClassSelect();
    } else {
      showSubjectSelect();
    }
  }

  function showClassSelect() {
    setView("viewClass");
    if (els.classTitle) {
      els.classTitle.textContent = `${selectedTrack.label} — choose class`;
    }
    if (!els.classRow) return;
    els.classRow.innerHTML = "";

    for (const classNum of [9, 10, 11, 12]) {
      const button = document.createElement("button");
      button.className = "class-pill";
      button.type = "button";
      button.textContent = `Class ${classNum}`;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        for (const pill of els.classRow.querySelectorAll(".class-pill")) {
          pill.classList.remove("active");
          pill.setAttribute("aria-pressed", "false");
        }
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
        selectedClass = classNum;
        if (classTimer) clearTimeout(classTimer);
        classTimer = setTimeout(() => {
          classTimer = null;
          showSubjectSelect();
        }, 160);
      });
      els.classRow.appendChild(button);
    }
    breadcrumb();
  }

  function showSubjectSelect() {
    setView("viewSubject");
    const subjects = getSubjectsForTrack(selectedTrack.id, selectedClass);
    if (els.subjectTitle) {
      els.subjectTitle.textContent = selectedClass
        ? `Class ${selectedClass} — choose subject`
        : `${selectedTrack.label} — choose subject`;
    }
    if (!els.subjectGrid) return;
    els.subjectGrid.innerHTML = "";

    for (const subject of subjects) {
      const card = document.createElement("button");
      card.className = "subject-card";
      card.type = "button";
      const list = getChapters(selectedTrack.id, subject, selectedClass);
      card.innerHTML = `<h4>${escapeHtml(subject)}</h4><p>${list.length} chapters · ${
        list.length ? `${escapeHtml(list[0].name)} → …` : "Curriculum"
      }</p>`;
      card.addEventListener("click", () => enterSubject(subject));
      els.subjectGrid.appendChild(card);
    }
    breadcrumb();
  }

  /* ── Map ───────────────────────────────────────────────── */

  async function enterSubject(subject) {
    selectedSubject = subject;
    selectedSubjectKey = toSubjectKey(selectedTrack.id, subject, selectedClass);
    breadcrumb();
    setView("viewMap");
    if (els.mapSubject) els.mapSubject.textContent = subject;
    if (els.mapSubtitle) {
      els.mapSubtitle.textContent = `${selectedTrack.label}${
        selectedClass ? ` · Class ${selectedClass}` : ""
      }`;
    }
    els.mapLoading?.classList.remove("hidden");
    els.mapError?.classList.add("hidden");
    els.mapEmpty?.classList.add("hidden");
    if (els.mapPath) els.mapPath.innerHTML = "";

    chapters = getChapters(selectedTrack.id, subject, selectedClass);
    if (!chapters.length) {
      els.mapLoading?.classList.add("hidden");
      els.mapEmpty?.classList.remove("hidden");
      return;
    }

    masteryMap = {};
    try {
      const snapshot = await getDocs(
        query(collection(ctx.db, "users", uid, "mastery"), limit(80))
      );
      snapshot.forEach((entry) => {
        masteryMap[entry.id] = entry.data();
      });
    } catch (err) {
      console.warn("[arena] mastery read failed", err);
    }
    if (lifecycle.disposed) return;

    try {
      const payloadChapters = chapters.map((chapter) => ({
        conceptId: chapter.conceptId,
        prerequisites: chapter.prerequisites,
      }));
      const result = await arenaRequest("init", {
        subjectKey: selectedSubjectKey,
        trackId: selectedTrack.id,
        subject,
        classNum: selectedClass,
        chapters: payloadChapters,
      });
      progress = result.progress;
    } catch (err) {
      if (lifecycle.disposed) return;
      els.mapLoading?.classList.add("hidden");
      if (els.mapError) {
        els.mapError.textContent = `Could not load progress: ${err.message || err}`;
        els.mapError.classList.remove("hidden");
      }
      toast.show("Offline — showing local map", "error");
      progress = computeProgress(
        createDefaultProgress({
          subjectKey: selectedSubjectKey,
          trackId: selectedTrack.id,
          subject,
          classNum: selectedClass,
          chapters,
        }),
        chapters
      );
    }

    if (lifecycle.disposed) return;
    els.mapLoading?.classList.add("hidden");
    renderMap();

    unsubscribeProgress();
    try {
      const ref = doc(ctx.db, "users", uid, "arenaProgress", selectedSubjectKey);
      const unsub = onSnapshot(
        ref,
        (snapshot) => {
          if (lifecycle.disposed) return;
          if (snapshot.exists()) {
            progress = snapshot.data();
            renderMap();
          }
        },
        (err) => console.warn("[arena] progress listener", err)
      );
      progressUnsub = unsub;
    } catch (err) {
      console.warn("[arena] could not subscribe to progress", err);
    }

    const search = `track=${encodeURIComponent(selectedTrack.id)}${
      selectedClass ? `&class=${selectedClass}` : ""
    }&subject=${encodeURIComponent(subject)}`;
    try {
      window.history.replaceState(null, "", `/arena?${search}`);
    } catch {}
  }

  function unsubscribeProgress() {
    if (!progressUnsub) return;
    try {
      progressUnsub();
    } catch {}
    progressUnsub = null;
  }

  function renderMap() {
    if (!progress || !chapters.length) return;
    progress = computeProgress(progress, chapters);
    if (!progress.chapters) progress.chapters = {};

    if (els.mapProgress) els.mapProgress.textContent = `${progress.progressPct}%`;
    if (els.mapDefeated) {
      els.mapDefeated.textContent = `${progress.defeated}/${progress.total}`;
    }

    const masteredCount = chapters.filter(
      (chapter) => progress.chapters[chapter.conceptId]?.state === "mastered"
    ).length;
    if (els.masteryChip) {
      els.masteryChip.classList.toggle("hidden", masteredCount === 0);
    }
    if (els.mapMastered) els.mapMastered.textContent = String(masteredCount);
    if (els.mapProgressFill) els.mapProgressFill.style.width = `${progress.progressPct}%`;

    const search = (els.mapSearch?.value || "").trim().toLowerCase();
    const filtered = search
      ? chapters.filter(
          (chapter) =>
            chapter.name.toLowerCase().includes(search) ||
            chapter.topic.toLowerCase().includes(search)
        )
      : chapters;

    if (els.mapPath) els.mapPath.innerHTML = "";

    if (els.resumeBtn) {
      if (progress.currentChapterId) {
        const current = chapters.find(
          (chapter) => chapter.conceptId === progress.currentChapterId
        );
        els.resumeBtn.classList.remove("hidden");
        els.resumeBtn.textContent = `Resume: ${current?.name || progress.currentChapterId} →`;
        els.resumeBtn.onclick = () => openChapter(progress.currentChapterId);
      } else {
        els.resumeBtn.classList.add("hidden");
      }
    }

    const startChip = document.createElement("div");
    startChip.className = "start-chip";
    startChip.textContent = "Start";
    els.mapPath?.appendChild(startChip);

    filtered.forEach((chapter, index) => {
      const entry = progress.chapters[chapter.conceptId] || {
        state: "locked",
        bestScore: 0,
        masteryScore: 0,
      };
      const mastery = masteryMap[chapter.conceptId];
      const weak =
        mastery &&
        mastery.masteryScore != null &&
        mastery.masteryScore < 0.45 &&
        (mastery.evidenceStrength || 0) >= 0.2;
      const isCurrent = progress.currentChapterId === chapter.conceptId;
      const node = document.createElement("div");
      node.className = "node";
      node.style.animationDelay = `${Math.min(index, 12) * 30}ms`;

      const state = entry.state;
      const iconClass =
        state === "locked"
          ? "locked"
          : state === "available"
          ? "available"
          : state === "in_progress"
          ? "in_progress"
          : state === "mastered"
          ? "mastered"
          : "defeated";
      const iconGlyph =
        state === "locked"
          ? "🔒"
          : state === "available"
          ? "⚔"
          : state === "in_progress"
          ? "🔥"
          : state === "mastered"
          ? "🏆"
          : "✅";
      const diffBadge = escapeHtml(chapter.difficultyLabel);

      node.innerHTML = `
        <div class="node-chip ${isCurrent ? "current" : ""}">${isCurrent ? "Current" : `Chapter ${chapters.indexOf(chapter) + 1}`}${weak ? " · Weak" : ""}</div>
        <button class="node-card ${isCurrent ? "current" : ""} ${state}" data-id="${escapeHtml(
        chapter.conceptId
      )}" aria-label="${escapeHtml(chapter.name)}, ${state}">
          <div class="node-icon ${iconClass}" aria-hidden="true">${iconGlyph}</div>
          <div class="node-main"><h4>${escapeHtml(chapter.name)}</h4><p>${escapeHtml(
        chapter.topic
      )} · ${diffBadge}</p></div>
          <div class="node-meta"><span class="diff-badge">${diffBadge}</span>${
        weak ? '<span class="weak-dot" title="Weak area — needs review"></span>' : ""
      }${
        entry.bestScore
          ? `<span class="arena-best-score">${Math.round(entry.bestScore * 100)}%</span>`
          : ""
      }</div>
        </button>
      `;
      const button = node.querySelector("button");
      if (button) button.addEventListener("click", () => openChapter(chapter.conceptId));
      els.mapPath?.appendChild(node);

      if (index < filtered.length - 1) {
        const connector = document.createElement("div");
        const chapterState = progress.chapters[chapter.conceptId]?.state;
        connector.className = `connector ${
          chapterState === "defeated" || chapterState === "mastered" ? "active" : ""
        }`;
        els.mapPath?.appendChild(connector);
      }
    });

    const bossWrap = document.createElement("div");
    bossWrap.className = "node boss-node";
    const bossUnlocked = progress.finalBossUnlocked;
    const bossDefeated = progress.finalBossDefeated;
    bossWrap.innerHTML = `
      <div class="node-chip ${bossUnlocked ? "unlocked" : ""}">${
        bossDefeated ? "Subject complete" : bossUnlocked ? "Final boss unlocked" : "Final boss locked"
      }</div>
      <button class="boss-card ${
        bossUnlocked && !bossDefeated ? "unlocked" : bossDefeated ? "unlocked locked" : "locked"
      }" id="bossCard" ${!bossUnlocked ? "disabled" : ""} aria-label="Final boss">
        <div class="boss-icon">🏆</div>
        <div class="arena-boss-main"><div class="arena-boss-title">${
          bossDefeated ? "Subject complete" : "Final boss"
        }</div><div class="arena-boss-sub">${
          bossDefeated
            ? `You conquered ${escapeHtml(selectedSubject)} — replay or revise weak areas`
            : bossUnlocked
            ? "Comprehensive challenge — defeat to complete subject"
            : `Defeat all ${chapters.length} chapters to unlock`
        }</div></div>
        <div class="arena-boss-pct">${bossDefeated ? "100%" : ""}</div>
      </button>
    `;
    els.mapPath?.appendChild(bossWrap);

    const bossButton = bossWrap.querySelector("#bossCard");
    if (bossButton) {
      bossButton.addEventListener("click", () => {
        if (bossDefeated) openSubjectComplete();
        else if (bossUnlocked) startFinalBoss();
        else toast.show("Defeat all chapters to unlock Final Boss", "error");
      });
    }

    if (search && filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = `No chapters match “${search}”`;
      els.mapPath?.appendChild(empty);
    }
  }

  /* ── Continue ──────────────────────────────────────────── */

  async function loadContinue() {
    let last = null;
    try {
      last = localStorage.getItem(LAST_SUBJECT_KEY);
    } catch {}
    if (!last) return;

    try {
      const response = await ctx.authFetch(
        `/api/arena?subjectKey=${encodeURIComponent(last)}`
      );
      if (!response.ok) return;
      const json = await response.json();
      const saved = json.progress;
      if (!saved || lifecycle.disposed) return;

      els.continueRow?.classList.remove("hidden");
      if (els.continueLabel) {
        els.continueLabel.textContent = `${saved.subject || last} · ${
          saved.progressPct || 0
        }% · ${saved.defeated || 0}/${saved.total || 0} defeated`;
      }
      if (els.continueBtn) {
        els.continueBtn.onclick = () => {
          const trackId = saved.trackId || "jee";
          selectedTrack =
            getTracks().find((track) => track.id === trackId) || {
              id: trackId,
              label: trackId.toUpperCase(),
              bg: "linear-gradient(135deg,#0ea5e9,#6366f1)",
              icon: "◈",
            };
          selectedClass = saved.classNum ?? null;
          selectedSubject = saved.subject || "";
          selectedSubjectKey = last;
          enterSubject(selectedSubject);
        };
      }
    } catch (err) {
      console.warn("[arena] continue lookup failed", err);
    }
  }

  /* ── Chapter modal ─────────────────────────────────────── */

  function openChapter(conceptId) {
    activeChapter = chapters.find((chapter) => chapter.conceptId === conceptId);
    if (!activeChapter) return;

    const entry = progress?.chapters?.[conceptId] || { state: "locked" };
    const mastery = masteryMap[conceptId];

    if (els.chTitle) els.chTitle.textContent = activeChapter.name;
    if (els.chSubtitle) {
      els.chSubtitle.textContent = `${activeChapter.topic} · ${
        activeChapter.description || ""
      }`;
    }
    if (els.chState) {
      els.chState.textContent = entry.state
        .replace("_", " ")
        .replace(/^./, (char) => char.toUpperCase());
      els.chState.style.color =
        entry.state === "defeated"
          ? "var(--pm-ok)"
          : entry.state === "mastered"
          ? "var(--pm-warn)"
          : entry.state === "available"
          ? "var(--pm-accent)"
          : entry.state === "in_progress"
          ? "var(--pm-warn)"
          : "var(--pm-text-3)";
    }
    if (els.chDiff) {
      els.chDiff.textContent = `${activeChapter.difficultyLabel} · ${
        Math.floor(activeChapter.difficulty * 100)
      }%`;
    }
    if (els.chProgress) {
      els.chProgress.textContent = entry.attempts
        ? `${entry.attempts} attempts · best ${Math.round((entry.bestScore || 0) * 100)}%`
        : "Not started";
    }
    if (els.chMastery) {
      els.chMastery.textContent = mastery
        ? `${Math.floor((mastery.masteryScore || 0) * 100)}% · ${
            mastery.masteryState || ""
          } · evidence ${Math.floor((mastery.evidenceStrength ?? 0) * 100)}%`
        : "—";
    }
    if (els.chTopics) {
      els.chTopics.innerHTML = `<strong>Concepts:</strong> ${escapeHtml(
        activeChapter.name
      )} — ${escapeHtml(activeChapter.topic)}<br><strong>Prerequisites:</strong> ${
        activeChapter.prerequisites.length
          ? activeChapter.prerequisites.map(escapeHtml).join(", ")
          : "None (start)"
      }<br><strong>Difficulty:</strong> ${escapeHtml(activeChapter.difficultyLabel)}`;
    }

    if (els.chLevels) {
      els.chLevels.innerHTML = "";
      for (const [index, level] of ["Foundation", "Application", "Challenge", "Boss"].entries()) {
        const pill = document.createElement("span");
        pill.className = "level-pill";
        if (index === 0 && entry.level !== "boss") pill.classList.add("active");
        if (entry.level === "boss" && level === "Boss") pill.classList.add("active");
        pill.textContent = level;
        els.chLevels.appendChild(pill);
      }
    }

    const allowed = canBattle(activeChapter, progress, chapters);
    if (els.chLockedMsg) {
      if (!allowed.ok) {
        els.chLockedMsg.textContent = `🔒 ${allowed.reason}`;
        els.chLockedMsg.classList.remove("hidden");
      } else {
        els.chLockedMsg.classList.add("hidden");
      }
    }
    if (els.enterBattleBtn) els.enterBattleBtn.disabled = !allowed.ok;

    const defeated = entry.state === "defeated" || entry.state === "mastered";
    els.replayBtn?.classList.toggle("hidden", !defeated);
    if (els.enterBattleBtn) {
      els.enterBattleBtn.textContent = defeated ? "Replay battle" : "Enter battle";
    }
    if (els.chPrev) {
      els.chPrev.textContent = entry.defeatedAt
        ? `Defeated ${new Date(entry.defeatedAt).toLocaleDateString()}`
        : "";
    }

    openModal("chapterModal");
  }

  /* ── Battles ───────────────────────────────────────────── */

  async function startBattle(chapter, isReplay) {
    if (!chapter) return;
    battleConcept = chapter;
    battleReplay = Boolean(isReplay);
    battleIdx = 0;
    battleScore = 0;
    battleQs = [];

    const requestToken = ++battleRequestToken;

    if (els.battleTitle) els.battleTitle.textContent = chapter.name;
    if (els.battleSubtitle) {
      els.battleSubtitle.textContent = isReplay
        ? "Replay — sharpen mastery"
        : "Understand → Practice → Challenge → Boss";
    }
    if (els.qCounter) els.qCounter.textContent = "Preparing questions…";
    if (els.qLevelLabel) els.qLevelLabel.textContent = "";
    if (els.qFill) els.qFill.style.width = "0%";
    if (els.qText) els.qText.textContent = "Generating your battle questions…";
    if (els.qOptions) els.qOptions.innerHTML = "";
    els.qFeedback?.classList.add("hidden");
    if (els.qFeedback) els.qFeedback.textContent = "";
    els.battleError?.classList.add("hidden");
    els.battleRetryBtn?.classList.add("hidden");
    if (els.nextQBtn) els.nextQBtn.disabled = true;
    openModal("battleModal");

    try {
      const prompt = `Generate ${BATTLE_SIZE} MCQs for ${chapter.subject} — ${chapter.name} (${chapter.topic}). Return a JSON array [{"q":"","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"B","explanation":"..."}]. Only JSON.`;
      const parsed = await generateQuestions(prompt, 900);
      if (lifecycle.disposed || requestToken !== battleRequestToken) return;
      battleQs = normalizeQuestions(parsed, BATTLE_SIZE);
      if (!battleQs.length) throw new Error("The AI returned no usable questions");
    } catch (err) {
      if (lifecycle.disposed || requestToken !== battleRequestToken) return;
      if (err?.name === "AbortError") return;
      console.warn("[arena] question generation failed", err);
      if (els.qCounter) els.qCounter.textContent = "Questions unavailable";
      if (els.qText) {
        els.qText.textContent =
          "Could not generate questions right now. Check your connection and retry.";
      }
      if (els.battleError) {
        els.battleError.textContent = err.message || "Question generation failed";
        els.battleError.classList.remove("hidden");
      }
      els.battleRetryBtn?.classList.remove("hidden");
      toast.show("Could not start battle — retry when online", "error");
      return;
    }

    renderQ();
    emitEvent("quiz_started", {
      conceptId: chapter.conceptId,
      subject: chapter.subject,
      topic: chapter.topic,
      payload: { arena: true, replay: Boolean(isReplay) },
    });
  }

  function renderQ() {
    const question = battleQs[battleIdx];
    if (!question) return;

    if (els.qCounter) {
      els.qCounter.textContent = `Question ${battleIdx + 1} / ${battleQs.length}`;
    }
    const levels = ["Foundation", "Foundation", "Application", "Challenge", "Boss"];
    if (els.qLevelLabel) {
      els.qLevelLabel.textContent = levels[battleIdx] || "Battle";
    }
    if (els.qFill) {
      els.qFill.style.width = `${((battleIdx + 1) / battleQs.length) * 100}%`;
    }
    if (els.qText) els.qText.textContent = question.q;
    if (els.qOptions) els.qOptions.innerHTML = "";
    els.qFeedback?.classList.add("hidden");
    els.battleError?.classList.add("hidden");
    els.battleRetryBtn?.classList.add("hidden");
    if (els.nextQBtn) {
      els.nextQBtn.disabled = true;
      els.nextQBtn.textContent =
        battleIdx === battleQs.length - 1 ? "Finish" : "Next →";
    }

    let selected = null;
    question.options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index);
      const label = String(option).replace(/^[A-D][).]\s*/, "");
      const button = document.createElement("button");
      button.className = "option";
      button.type = "button";
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = letter;
      const text = document.createElement("span");
      text.textContent = label;
      button.append(key, text);

      button.addEventListener("click", () => {
        if (selected !== null) return;
        selected = index;
        for (const sibling of els.qOptions?.children || []) {
          sibling.classList.remove("selected");
        }
        button.classList.add("selected");

        const isCorrect = letter === question.answer;
        button.classList.add(isCorrect ? "correct" : "wrong");
        if (!isCorrect) {
          const correctIndex = "ABCD".indexOf(question.answer);
          els.qOptions?.children[correctIndex]?.classList.add("correct");
        }

        if (els.qFeedback) {
          els.qFeedback.classList.remove("hidden");
          els.qFeedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
          els.qFeedback.textContent = isCorrect
            ? `Correct. ${question.explanation || ""}`
            : `Incorrect. Correct answer: ${question.answer}. ${
                question.explanation || ""
              }`;
        }

        if (isCorrect) battleScore += 1;
        if (els.nextQBtn) els.nextQBtn.disabled = false;

        const payload = {
          correct: isCorrect,
          arena: true,
          questionIndex: battleIdx,
          totalQ: battleQs.length,
          hintCount: 0,
        };
        const questionId = `arena_${battleConcept.conceptId}_${battleIdx}`;
        emitEvent(isCorrect ? "question_correct" : "question_incorrect", {
          conceptId: battleConcept.conceptId,
          subject: battleConcept.subject,
          topic: battleConcept.topic,
          questionId,
          payload,
        });
        emitEvent("question_answered", {
          conceptId: battleConcept.conceptId,
          subject: battleConcept.subject,
          topic: battleConcept.topic,
          questionId,
          payload: { correct: isCorrect, arena: true },
        });
      });

      els.qOptions?.appendChild(button);
    });
  }

  async function finishBattle() {
    closeModal("battleModal");
    if (!battleConcept) return;

    const total = battleQs.length;
    const score = total ? battleScore / total : 0;
    const pct = Math.round(score * 100);
    const passed = score >= DEFEAT_SCORE;

    try {
      if (passed) {
        let masteryScore = null;
        try {
          const snapshot = await getDoc(
            doc(ctx.db, "users", uid, "mastery", battleConcept.conceptId)
          );
          if (snapshot.exists()) masteryScore = snapshot.data().masteryScore;
        } catch {}

        const result = await arenaRequest("defeat_chapter", {
          subjectKey: selectedSubjectKey,
          conceptId: battleConcept.conceptId,
          score,
          masteryScore,
        });
        progress = result.progress;
        try {
          localStorage.setItem(LAST_SUBJECT_KEY, selectedSubjectKey);
        } catch {}
        burstVictory(pct, total, battleScore, masteryScore);
      } else {
        const result = await arenaRequest("level_complete", {
          subjectKey: selectedSubjectKey,
          conceptId: battleConcept.conceptId,
          score,
          level: "challenge",
        });
        if (result?.progress) progress = result.progress;
        toast.show(
          `Keep fighting! ${pct}% — need 60% to defeat. Review and try again.`,
          "error",
          3200
        );
        renderMap();
      }
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("[arena] battle save failed", err);
      toast.show(`Battle saved locally — sync will retry. ${err.message || err}`, "error");
      if (passed) {
        progress = defeatChapter(progress, chapters, battleConcept.conceptId, { score });
        renderMap();
        burstVictory(pct, total, battleScore, null);
      }
    }

    emitEvent("quiz_completed", {
      conceptId: battleConcept.conceptId,
      subject: battleConcept.subject,
      topic: battleConcept.topic,
      payload: { correct: battleScore, totalQ: total, score, arena: true },
    });
  }

  function burstVictory(pct, total, correct, masteryScore) {
    if (els.victoryText) {
      els.victoryText.textContent = `You scored ${pct}% (${correct}/${total})${
        masteryScore != null ? ` · Mastery ${Math.floor(masteryScore * 100)}%` : ""
      } — ${
        progress?.finalBossUnlocked
          ? "Final boss unlocked!"
          : "Next chapter unlocked!"
      }`;
    }

    if (els.confetti) {
      els.confetti.innerHTML = "";
      const colors = ["#6b9bff", "#a78bfa", "#34d399", "#f5b74a", "#f472b6"];
      for (let index = 0; index < 18; index += 1) {
        const piece = document.createElement("i");
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.top = "-6px";
        piece.style.setProperty("--c", colors[index % colors.length]);
        piece.style.animationDelay = `${Math.random() * 0.25}s`;
        els.confetti.appendChild(piece);
      }
    }

    openModal("victoryModal");
    try {
      navigator.vibrate?.(40);
    } catch {}
  }

  /* ── Final boss ────────────────────────────────────────── */

  async function startFinalBoss() {
    bossQs = [];
    bossIdx = 0;
    bossScore = 0;

    const requestToken = ++bossRequestToken;

    if (els.bossBody) {
      els.bossBody.innerHTML =
        '<div class="arena-boss-loading">Preparing the final boss…</div>';
    }
    openModal("bossModal");

    const topics = chapters
      .slice(0, 4)
      .map((chapter) => chapter.name)
      .join(", ");

    try {
      const prompt = `Generate ${BOSS_SIZE} MCQs covering ${selectedSubject} chapters: ${topics}. Mix difficulties. Return a JSON array [{"q":"","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"B","explanation":"..."}]. Only JSON.`;
      const parsed = await generateQuestions(prompt, 1200);
      if (lifecycle.disposed || requestToken !== bossRequestToken) return;
      bossQs = normalizeQuestions(parsed, BOSS_SIZE);
      if (!bossQs.length) throw new Error("The AI returned no usable questions");
    } catch (err) {
      if (lifecycle.disposed || requestToken !== bossRequestToken) return;
      if (err?.name === "AbortError") return;
      console.warn("[arena] boss generation failed", err);
      if (els.bossBody) {
        els.bossBody.innerHTML = `<div class="error">Could not generate the final boss right now. ${
          escapeHtml(err.message || "")
        }<div class="arena-boss-actions"><button class="battle-btn secondary" data-boss-action="close">Close</button><button class="battle-btn" data-boss-action="retry">Retry</button></div></div>`;
        els.bossBody
          .querySelector('[data-boss-action="close"]')
          ?.addEventListener("click", () => closeModal("bossModal"));
        els.bossBody
          .querySelector('[data-boss-action="retry"]')
          ?.addEventListener("click", () => startFinalBoss());
      }
      return;
    }

    if (!els.bossBody) return;
    els.bossBody.innerHTML = `
      <div class="q-meta"><span id="bossCounter">Question 1 / ${bossQs.length}</span><span>🏆 Final boss</span></div>
      <div class="q-progress"><div class="fill" id="bossFill"></div></div>
      <div class="q-text" id="bossQ"></div>
      <div class="options" id="bossOpts"></div>
      <div class="feedback hidden" id="bossFb"></div>
      <div class="arena-boss-actions"><button class="battle-btn secondary" id="bossQuit">Quit</button><button class="battle-btn" id="bossNext" disabled>Next →</button></div>
    `;
    renderBossQ();

    els.bossBody.querySelector("#bossQuit")?.addEventListener("click", () => {
      closeModal("bossModal");
    });
    els.bossBody.querySelector("#bossNext")?.addEventListener("click", async () => {
      if (bossIdx < bossQs.length - 1) {
        bossIdx += 1;
        renderBossQ();
        return;
      }

      const total = bossQs.length;
      const score = total ? bossScore / total : 0;
      if (score < FINAL_BOSS_DEFEAT_SCORE) {
        toast.show(
          `Final boss needs 70% — you got ${Math.round(score * 100)}%. Train more and return!`,
          "error",
          3000
        );
        closeModal("bossModal");
        return;
      }

      try {
        const result = await arenaRequest("final_boss_attempt", {
          subjectKey: selectedSubjectKey,
          score,
        });
        if (lifecycle.disposed) return;
        progress = result.progress;
        closeModal("bossModal");
        openSubjectComplete();
      } catch (err) {
        if (lifecycle.disposed) return;
        toast.show(err.message || "Boss defeat failed", "error");
      }
    });
  }

  function renderBossQ() {
    const question = bossQs[bossIdx];
    if (!question || !els.bossBody) return;

    const body = els.bossBody;
    const counter = body.querySelector("#bossCounter");
    if (counter) counter.textContent = `Question ${bossIdx + 1} / ${bossQs.length}`;
    const fill = body.querySelector("#bossFill");
    if (fill) fill.style.width = `${((bossIdx + 1) / bossQs.length) * 100}%`;
    const questionEl = body.querySelector("#bossQ");
    if (questionEl) questionEl.textContent = question.q;
    const options = body.querySelector("#bossOpts");
    if (options) options.innerHTML = "";
    body.querySelector("#bossFb")?.classList.add("hidden");
    const next = body.querySelector("#bossNext");
    if (next) {
      next.disabled = true;
      next.textContent = bossIdx === bossQs.length - 1 ? "Finish boss" : "Next →";
    }

    let picked = null;
    question.options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index);
      const label = String(option).replace(/^[A-D][).]\s*/, "");
      const button = document.createElement("button");
      button.className = "option";
      button.type = "button";
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = letter;
      const text = document.createElement("span");
      text.textContent = label;
      button.append(key, text);

      button.addEventListener("click", () => {
        if (picked !== null) return;
        picked = index;
        for (const sibling of options.children) {
          sibling.classList.remove("selected");
        }
        button.classList.add("selected");

        const isCorrect = letter === question.answer;
        button.classList.add(isCorrect ? "correct" : "wrong");
        if (!isCorrect) {
          const correctIndex = "ABCD".indexOf(question.answer);
          options.children[correctIndex]?.classList.add("correct");
        }

        const feedback = body.querySelector("#bossFb");
        if (feedback) {
          feedback.classList.remove("hidden");
          feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
          feedback.textContent = isCorrect
            ? question.explanation || "Correct!"
            : `Correct answer: ${question.answer}. ${question.explanation || ""}`;
        }

        if (isCorrect) bossScore += 1;
        if (next) {
          next.disabled = false;
          next.textContent =
            bossIdx === bossQs.length - 1 ? "Finish boss" : "Next →";
        }
      });

      options?.appendChild(button);
    });
  }

  function openSubjectComplete() {
    if (!els.bossBody || !progress) return;

    const weakList = chapters
      .filter((chapter) => {
        const mastery = masteryMap[chapter.conceptId];
        return mastery && mastery.masteryScore < 0.5;
      })
      .slice(0, 5);
    const mastered = chapters.filter(
      (chapter) => progress.chapters[chapter.conceptId]?.state === "mastered"
    ).length;

    els.bossBody.innerHTML = `
      <div class="arena-complete-head">
        <div class="arena-complete-icon">🏆</div>
        <h3 class="arena-complete-title">Subject complete</h3>
        <p class="arena-complete-sub">You conquered ${escapeHtml(
          selectedSubject
        )} — ${progress.defeated}/${progress.total} chapters defeated</p>
      </div>
      <div class="kv arena-complete-stats">
        <div><div class="k">Completion</div><div class="v">${progress.progressPct}%</div></div>
        <div><div class="k">Chapters defeated</div><div class="v">${progress.defeated}/${progress.total}</div></div>
        <div><div class="k">Mastered</div><div class="v">${mastered}</div></div>
        <div><div class="k">Final boss</div><div class="v arena-complete-boss">Defeated ✓</div></div>
      </div>
      ${
        weakList.length
          ? `<div class="error"><div class="arena-weak-title">Weak areas — revise</div><ul class="arena-weak-list">${weakList
              .map(
                (chapter) =>
                  `<li>${escapeHtml(chapter.name)} — ${Math.floor(
                    (masteryMap[chapter.conceptId].masteryScore || 0) * 100
                  )}%</li>`
              )
              .join("")}</ul></div>`
          : '<div class="arena-ok-note">No weak areas detected — stellar mastery!</div>'
      }
      <div class="arena-complete-actions">
        <button class="battle-btn secondary" id="scBack">Back to map</button>
        <button class="battle-btn" id="scHome">Home dashboard →</button>
      </div>
      <div class="arena-complete-actions replay">
        <button class="battle-btn secondary" id="scReplay">Replay weak chapters</button>
      </div>
    `;

    els.bossBody.querySelector("#scBack")?.addEventListener("click", () => {
      closeModal("bossModal");
      renderMap();
    });
    els.bossBody.querySelector("#scHome")?.addEventListener("click", () => {
      ctx.navigate("/home");
    });
    els.bossBody.querySelector("#scReplay")?.addEventListener("click", () => {
      if (!progress?.currentChapterId) return;
      closeModal("bossModal");
      openChapter(progress.currentChapterId);
    });

    openModal("bossModal");
    renderMap();
  }

  /* ── URL restore ───────────────────────────────────────── */

  function restoreFromUrl() {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const trackId = params.get("track");
    const subject = params.get("subject");
    if (!trackId || !subject) return;

    const track = getTracks().find((entry) => entry.id === trackId);
    if (!track) return;

    const classParam = params.get("class");
    selectedTrack = track;
    selectedClass = classParam ? Number.parseInt(classParam, 10) : null;
    if (Number.isNaN(selectedClass)) selectedClass = null;
    enterSubject(decodeURIComponent(subject));
  }

  /* ── Helpers ───────────────────────────────────────────── */

  async function arenaRequest(action, body = {}) {
    const response = await ctx.authFetch("/api/arena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || `Arena ${action} failed (${response.status})`);
    }
    return json;
  }

  async function generateQuestions(prompt, maxTokens) {
    if (battleAbort) battleAbort.abort();
    battleAbort = new AbortController();
    const response = await ctx.authFetch("/api/groq-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: battleAbort.signal,
    });
    if (!response.ok) throw new Error(`AI request failed (${response.status})`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return JSON.parse(String(text).replace(/```json|```/g, "").trim());
  }

  function normalizeQuestions(raw, total) {
    if (!Array.isArray(raw)) return [];
    const questions = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const question = item.q ?? item.question;
      const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option)).filter(Boolean).slice(0, 4)
        : [];
      if (typeof question !== "string" || !question.trim()) continue;
      if (options.length < 2) continue;
      const answer = String(item.answer || "A").trim().charAt(0).toUpperCase();
      if (!"ABCD".includes(answer)) continue;
      if ("ABCD".indexOf(answer) >= options.length) continue;
      questions.push({
        q: question,
        options,
        answer,
        explanation: String(item.explanation || ""),
      });
      if (questions.length >= total) break;
    }
    return questions;
  }

  function emitEvent(type, fields = {}) {
    if (!type || !ctx.user) return;
    ctx
      .authFetch("/api/learning-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          source: "quiz",
          ...fields,
        }),
      })
      .catch(() => {});
  }

  function openModal(id) {
    const modal = byId(id);
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(id) {
    const modal = byId(id);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function smoothTop() {
    try {
      els.breadcrumb?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  }
}

function hydrateTopbar(root, user) {
  const displayName =
    user.displayName || user.email?.split("@")[0] || "Student";
  const firstName = (user.displayName || displayName).split(" ")[0];

  const greeting = root.querySelector("#greetingName");
  if (greeting) greeting.textContent = firstName;

  const avatar = root.querySelector("#topbarAvatar");
  if (avatar) {
    avatar.alt = displayName;
    if (user.photoURL) avatar.src = user.photoURL;
  }
}
