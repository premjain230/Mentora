import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import {
  renderProgressSparkline,
  renderRetentionTimeline,
  renderScoreTrend,
  renderStockChart,
  renderSubjectBars,
  renderVolumeBars,
} from "../js/learning/graphs.js";
import { createLifecycle, escapeHtml } from "./shared/lifecycle.js";
import { checkDailyQuestion } from "./shared/daily-question.js";

const SUBJECT_EMPTY = `<div class="hub-subject-empty">No subject data yet<br><span>Quiz in any subject to build this graph</span></div>`;

function formatHoursMinutes(seconds) {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return `${hours} hr ${rest} min`;
}

function toDate(value) {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate();
    return new Date(value);
  } catch {
    return new Date(value);
  }
}

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();

  hydrateTopbar(root, ctx.user);
  wireScroll(root, lifecycle);
  checkOnboarding(ctx, lifecycle);
  checkDailyQuestion({ db: ctx.db, user: ctx.user, lifecycle });
  loadHub(root, ctx, lifecycle);

  return () => lifecycle.dispose();
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

async function checkOnboarding(ctx, lifecycle) {
  try {
    const snap = await getDoc(
      doc(ctx.db, "users", ctx.user.uid, "learning", "profile")
    );
    if (lifecycle.disposed) return;

    const data = snap.exists() ? snap.data() : null;
    const onboardingComplete = data?.onboardingComplete === true;
    const hasLegacyProfile = !!data?.academic;
    if (onboardingComplete || hasLegacyProfile) return;

    const subjects = data?.subjects;
    if (Array.isArray(subjects) && subjects.length > 0) return;

    const createdAt = data?.createdAt;
    const createdMillis =
      createdAt && typeof createdAt.toDate === "function"
        ? createdAt.toDate().getTime()
        : null;
    const isFresh =
      !snap.exists() ||
      (createdMillis !== null && Date.now() - createdMillis < 5 * 60 * 1000);

    if (isFresh) ctx.navigate("/onboarding");
  } catch {}
}

function wireScroll(root, lifecycle) {
  const area = root.querySelector("#homeChatArea");
  const control = root.querySelector("#scrollControl");
  const progress = root.querySelector("#scrollProgress");
  if (!area) return;

  let frame = 0;
  let ticking = false;

  function update() {
    ticking = false;
    const max = Math.max(0, area.scrollHeight - area.clientHeight);
    const top = Math.min(max, Math.max(0, area.scrollTop));

    if (progress) {
      progress.style.width = max > 0 ? `${(top / max) * 100}%` : "0%";
    }
    if (!control) return;

    const scrollable = max > 8;
    const direction = top >= max - 48 || top > max * 0.55 ? "up" : "down";
    control.classList.toggle("visible", scrollable);
    control.dataset.direction = direction;

    const label = direction === "up" ? "Scroll to top" : "Scroll to latest";
    control.setAttribute("aria-label", label);
    control.title = label;
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    frame = requestAnimationFrame(update);
  }

  lifecycle.on(area, "scroll", schedule, { passive: true });
  lifecycle.on(window, "resize", schedule, { passive: true });

  lifecycle.on(control, "click", () => {
    const max = Math.max(0, area.scrollHeight - area.clientHeight);
    const target = control.dataset.direction === "up" ? 0 : max;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    area.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(area);
    lifecycle.add(() => observer.disconnect());
  }

  if ("MutationObserver" in window) {
    const observer = new MutationObserver(schedule);
    observer.observe(area, { childList: true, subtree: true });
    lifecycle.add(() => observer.disconnect());
  }

  lifecycle.add(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  schedule();
}

async function loadHub(root, ctx, lifecycle) {
  const { db, user } = ctx;
  const elements = {
    gauge: root.querySelector("#hubMasteryGauge"),
    gaugeCaption: root.querySelector("#hubMasteryCaption"),
    subtitle: root.querySelector("#hubSubtitle"),
    studyTime: root.querySelector("#hubStudyTime"),
    studyVolume: root.querySelector("#hubStudyVolume"),
    studyCaption: root.querySelector("#hubStudyCaption"),
    sparksTitle: root.querySelector("#hubSparksTitle"),
    sparksCounts: root.querySelector("#hubSparksCounts"),
    sparksBar: root.querySelector("#hubSparksBar"),
    sparksEmpty: root.querySelector("#hubSparksEmpty"),
    subjectBars: root.querySelector("#hubSubjectBars"),
    retentionTimeline: root.querySelector("#hubRetentionTimeline"),
    retentionEmpty: root.querySelector("#hubRetentionEmpty"),
    stockCanvas: root.querySelector("#hubStockCanvas"),
    stockCaption: root.querySelector("#hubStockCaption"),
    stockTag: root.querySelector("#hubStockTag"),
    nextSteps: root.querySelector("#hubNextSteps"),
    nextEmpty: root.querySelector("#hubNextEmpty"),
  };

  if (!db || !user) {
    if (elements.gauge) {
      elements.gauge.innerHTML = `<div class="hub-gauge-empty-sub">Sign in to see mastery</div>`;
    }
    return;
  }

  await loadMastery(elements, db, user, lifecycle);
  if (lifecycle.disposed) return;

  await loadVolume(elements, db, user, lifecycle);
  if (lifecycle.disposed) return;

  await loadRetention(elements, db, user, lifecycle);
  if (lifecycle.disposed) return;

  await loadRetentionTimeline(elements, db, user, lifecycle);
  if (lifecycle.disposed) return;

  await loadScoreTrend(elements, db, user, lifecycle);
  if (lifecycle.disposed) return;

  await loadNextSteps(elements, ctx, lifecycle);
  if (lifecycle.disposed) return;

  await loadSyllabus(elements, db, user, lifecycle);
}

async function loadMastery(elements, db, user, lifecycle) {
  try {
    const snap = await getDocs(
      collection(db, "users", user.uid, "mastery")
    );
    if (lifecycle.disposed) return;

    const count = snap.size;

    if (count === 0) {
      if (elements.gauge) {
        elements.gauge.innerHTML = `<div class="hub-gauge-empty">
          <div class="hub-gauge-empty-title">No mastery yet</div>
          <div class="hub-gauge-empty-sub">Take a quiz or finish a study session</div>
          <a class="hub-gauge-empty-link" href="/quiz">Start quiz →</a>
        </div>`;
      }
      if (elements.gaugeCaption) {
        elements.gaugeCaption.textContent = "Complete your first assessment";
      }
      if (elements.subjectBars) {
        elements.subjectBars.innerHTML = SUBJECT_EMPTY;
      }
      return;
    }

    let scoreSum = 0;
    let evidenceSum = 0;
    let mastered = 0;
    const subjectMap = new Map();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const score = Number(data.masteryScore) || 0;
      const evidence = Number(data.evidenceStrength) || 0;

      scoreSum += score;
      evidenceSum += evidence;
      if (score >= 0.85) mastered++;

      const name = String(data.subject || "Unknown").trim() || "Unknown";
      const entry = subjectMap.get(name) || { name, sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      subjectMap.set(name, entry);
    });

    const average = scoreSum / count;
    const averageEvidence = evidenceSum / count;
    const percentage = Math.round(average * 100);
    const evidencePercent = Math.round(averageEvidence * 100);
    const evidenceTone =
      averageEvidence < 0.35
        ? "is-limited"
        : averageEvidence < 0.7
          ? "is-adequate"
          : "is-strong";
    const evidenceLabel =
      averageEvidence < 0.35
        ? "Limited"
        : averageEvidence < 0.7
          ? "Adequate"
          : "Strong";

    if (elements.gauge) {
      elements.gauge.innerHTML = `
        <div class="aq-radial hub-gauge-radial" style="--p:${percentage};--c:${average >= 0.75 ? "var(--accent2)" : "var(--accent)"}"><span>${percentage}%</span></div>
        <div class="hub-gauge-meta">
          <div class="hub-gauge-evidence">Evidence ${evidencePercent}%</div>
          <div class="hub-evidence-label ${evidenceTone}">${evidenceLabel}</div>
        </div>`;
    }

    if (elements.gaugeCaption) {
      elements.gaugeCaption.textContent = `${count} concepts • ${mastered} mastered`;
    }
    if (elements.subtitle) {
      elements.subtitle.textContent =
        count >= 3
          ? `Based on ${count} concepts — personalised`
          : `Based on ${count} concepts — keep learning`;
    }

    if (elements.subjectBars) {
      const stats = Array.from(subjectMap.values())
        .map((entry) => ({
          name: entry.name,
          pct: entry.count ? (entry.sum / entry.count) * 100 : 0,
        }))
        .sort((a, b) => b.pct - a.pct);

      try {
        renderSubjectBars(elements.subjectBars, stats);
      } catch {
        elements.subjectBars.innerHTML = SUBJECT_EMPTY;
      }
    }
  } catch {
    if (elements.gauge) {
      elements.gauge.innerHTML = `<div class="hub-gauge-empty-sub">Couldn't load mastery</div>`;
    }
  }
}

async function loadVolume(elements, db, user, lifecycle) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "users", user.uid, "studySessions"),
        orderBy("startedAt", "desc"),
        limit(50)
      )
    );
    if (lifecycle.disposed) return;

    const now = new Date();
    const byDay = new Map();
    let totalSeconds = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const raw =
        data.timeFocused !== undefined
          ? data.timeFocused
          : Number(data.durationMinutes) * 60;
      let seconds = Number(raw);
      if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
      if (seconds > 4 * 3600) seconds = 4 * 3600;

      totalSeconds += seconds;

      const started = toDate(data.startedAt) || now;
      const key = started.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + seconds);
    });

    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      daily.push(byDay.get(date.toISOString().slice(0, 10)) || 0);
    }

    const average = daily.reduce((total, value) => total + value, 0) / 7;

    if (elements.studyTime) {
      elements.studyTime.textContent = totalSeconds
        ? formatHoursMinutes(totalSeconds)
        : "0 min";
    }
    if (elements.studyCaption) {
      elements.studyCaption.textContent = snap.size
        ? `${snap.size} sessions • avg ${formatHoursMinutes(average)}/day`
        : "No sessions yet";
    }

    if (elements.studyVolume) {
      if (snap.size === 0) {
        elements.studyVolume.innerHTML = `<div class="hub-volume-empty">No volume yet<br><a href="/study-session">Start 25 min →</a></div>`;
      } else {
        try {
          renderVolumeBars(elements.studyVolume, daily);
        } catch {
          const maximum = Math.max(1, ...daily);
          try {
            renderProgressSparkline(
              elements.studyVolume,
              daily.map((value) => value / maximum)
            );
          } catch {}
        }
      }
    }
  } catch {
    if (elements.studyTime) elements.studyTime.textContent = "—";
  }
}

async function loadRetention(elements, db, user, lifecycle) {
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "reviews"));
    if (lifecycle.disposed) return;

    const now = Date.now();
    let due = 0;
    let overdue = 0;
    let upcoming = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const next = toDate(data.nextReviewAt);
      if (!next) return;
      const time = next.getTime();
      if (time <= now) overdue++;
      else if (time <= now + 24 * 3600 * 1000) due++;
      else upcoming++;
    });

    if (snap.size === 0) {
      if (elements.sparksTitle) elements.sparksTitle.textContent = "No reviews yet";
      if (elements.sparksCounts) {
        elements.sparksCounts.innerHTML = `<span class="hub-muted">Complete a quiz to generate retention schedule</span>`;
      }
      if (elements.sparksBar) {
        elements.sparksBar.innerHTML = `<div class="hub-bar-empty"></div>`;
      }
      if (elements.sparksEmpty) {
        elements.sparksEmpty.style.display = "block";
        elements.sparksEmpty.innerHTML = `<a href="/quiz">Take quiz →</a> • <a class="hub-muted" href="/review">How reviews work</a>`;
      }
      return;
    }

    if (elements.sparksTitle) {
      elements.sparksTitle.textContent = overdue
        ? `${overdue} overdue`
        : due
          ? `${due} due today`
          : `${upcoming} scheduled`;
    }
    if (elements.sparksCounts) {
      elements.sparksCounts.innerHTML = `<span>Due <b>${due}</b></span><span class="hub-count-overdue">Overdue <b>${overdue}</b></span><span>Up <b>${upcoming}</b></span>`;
    }
    if (elements.sparksBar) {
      const total = Math.max(1, due + overdue + upcoming);
      elements.sparksBar.innerHTML = `
        <div style="flex:${due / total};background:var(--accent);"></div>
        <div style="flex:${overdue / total};background:var(--accent3,#f87171);"></div>
        <div style="flex:${upcoming / total};background:var(--border-strong,var(--border));"></div>`;
    }
  } catch {
    if (elements.sparksTitle) elements.sparksTitle.textContent = "Retention";
  }
}

async function loadRetentionTimeline(elements, db, user, lifecycle) {
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "reviews"));
    if (lifecycle.disposed || !elements.retentionTimeline) return;

    const reviews = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      reviews.push({
        conceptId: data.conceptId || docSnap.id,
        nextReviewAt: toDate(data.nextReviewAt),
        reviewState: data.reviewState || "not_ready",
        subject: data.subject || "",
      });
    });

    if (!reviews.length) {
      elements.retentionTimeline.innerHTML = "";
      if (elements.retentionEmpty) elements.retentionEmpty.style.display = "block";
      return;
    }

    if (elements.retentionEmpty) elements.retentionEmpty.style.display = "none";

    try {
      renderRetentionTimeline(elements.retentionTimeline, reviews.slice(0, 5));
    } catch {
      elements.retentionTimeline.innerHTML = reviews
        .slice(0, 5)
        .map(
          (review) => `<div class="hub-timeline-row">
            <span>${escapeHtml(review.conceptId)}</span>
            <span class="hub-muted">${escapeHtml(review.reviewState)} • ${
              review.nextReviewAt ? review.nextReviewAt.toLocaleDateString() : ""
            }</span>
          </div>`
        )
        .join("");
    }
  } catch {}
}

async function loadScoreTrend(elements, db, user, lifecycle) {
  try {
    if (!elements.stockCanvas) return;

    const snap = await getDocs(
      query(
        collection(db, "users", user.uid, "quizAttempts"),
        orderBy("takenAt", "desc"),
        limit(15)
      )
    );
    if (lifecycle.disposed) return;

    const values = snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        const total = Number(data.totalQ) || 1;
        const correct = Number(data.correct) || 0;
        return Math.round((correct / total) * 100);
      })
      .reverse();

    const labels = snap.docs
      .map((docSnap) => {
        const data = docSnap.data();
        const date = toDate(data.takenAt);
        return date
          ? `${date.getMonth() + 1}/${date.getDate()}`
          : `#${docSnap.id.slice(0, 3)}`;
      })
      .reverse();

    if (values.length) {
      try {
        renderStockChart(elements.stockCanvas, values, { labels });
      } catch {
        try {
          renderScoreTrend(elements.stockCanvas, values);
        } catch {}
      }
      if (elements.stockCaption) {
        const average = Math.round(
          values.reduce((total, value) => total + value, 0) / values.length
        );
        elements.stockCaption.textContent = `${values.length} quizzes • avg ${average}% • hi ${Math.max(...values)}%`;
      }
      if (elements.stockTag) {
        elements.stockTag.textContent = `Real • ${values.length}`;
      }
      return;
    }

    if (elements.stockCaption) {
      elements.stockCaption.textContent =
        "No quizzes yet — take one to seed your chart";
    }
    try {
      renderStockChart(elements.stockCanvas, []);
    } catch {
      try {
        renderScoreTrend(elements.stockCanvas, []);
      } catch {}
    }
    if (elements.stockTag) elements.stockTag.textContent = "Real • 0";
  } catch {}
}

async function loadNextSteps(elements, ctx, lifecycle) {
  try {
    const token = await ctx.user.getIdToken();
    if (lifecycle.disposed) return;

    const response = await ctx.api("/api/recommendations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (lifecycle.disposed) return;

    if (!response.ok) {
      if (elements.nextEmpty) {
        elements.nextEmpty.style.display = "block";
        elements.nextEmpty.textContent = "Couldn't load recommendations.";
      }
      return;
    }

    const data = await response.json();
    if (lifecycle.disposed) return;

    const recommendations = (
      Array.isArray(data.recommendations) ? data.recommendations : []
    ).slice(0, 3);

    if (!recommendations.length) {
      if (elements.nextSteps) elements.nextSteps.innerHTML = "";
      if (elements.nextEmpty) {
        elements.nextEmpty.style.display = "block";
        elements.nextEmpty.innerHTML = `No recommendations yet — <a href="/quiz">practice a topic</a> to get personalised next steps.`;
      }
      return;
    }

    if (elements.nextEmpty) elements.nextEmpty.style.display = "none";

    if (elements.nextSteps) {
      elements.nextSteps.innerHTML = recommendations
        .map((recommendation) => {
          const action = String(recommendation.action || "").toLowerCase();
          const href =
            action === "review"
              ? "/review"
              : action === "practice"
                ? "/quiz"
                : "/study-session";
          const subject = escapeHtml(recommendation.subject || "");
          const topic = escapeHtml(
            recommendation.topic || recommendation.conceptId || ""
          );
          const reason = escapeHtml(
            recommendation.reason || recommendation.explanation || ""
          );
          return `<a class="hub-next-card" href="${href}">
            <div class="hub-next-subject">${subject} • ${topic}</div>
            <div class="hub-next-reason">${reason}</div>
            <div class="hub-next-action">${escapeHtml(recommendation.action || "study")} →</div>
          </a>`;
        })
        .join("");
    }
  } catch {
    if (elements.nextEmpty) {
      elements.nextEmpty.style.display = "block";
      elements.nextEmpty.textContent = "Recommendations unavailable offline.";
    }
  }
}

async function loadSyllabus(elements, db, user, lifecycle) {
  try {
    const snap = await getDocs(collection(db, "users", user.uid, "syllabus"));
    if (lifecycle.disposed || !snap.size || !elements.subtitle) return;

    const last = snap.docs[0]?.data();
    if (last?.fileName) {
      elements.subtitle.textContent = `Syllabus: ${last.fileName} • personalising`;
    }
  } catch {}
}
