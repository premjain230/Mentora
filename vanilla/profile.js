import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createLifecycle } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";
import {
  COUNTRY_OPTIONS,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  getTracksForCountry,
  getGradesForTrack,
  getSubjectsForTrack,
  getCountryOption,
  getTrackInfo,
} from "../lib/learning/curriculum-options";

const PERSONALITY_NAMES = {
  mentor: "Mentor",
  friendly: "Friendly Companion",
  motivator: "Motivator",
  "deep-thinker": "Deep Thinker",
  coach: "Coach",
  "calm-guide": "Calm Guide",
  inspirational: "Inspirational",
};

const THEME_KEY = "learning-allied-theme";
const LEGACY_THEME_KEY = "aquila-theme";
const PERSONALITY_KEY = "learning-allied-personality";

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);
  const uid = ctx.user?.uid;
  if (!uid) return () => lifecycle.dispose();

  const els = {
    avatar: root.querySelector("#profileAvatar"),
    name: root.querySelector("#profileName"),
    email: root.querySelector("#profileEmail"),
    plan: root.querySelector("#profilePlan"),
    themeSwitch: root.querySelector("#themeSwitch"),
    themeLabel: root.querySelector("#themeLabel"),
    personalityGrid: root.querySelector("#personalityGrid"),
    letterPlaceholder: root.querySelector("#letterPlaceholder"),
    letterContent: root.querySelector("#letterContent"),
    letterDate: root.querySelector("#letterDate"),
    letterBtn: root.querySelector("#generateLetterBtn"),
    letterBtnText: root.querySelector("#letterBtnText"),

    // Academic Profile Elements
    countryFlag: root.querySelector("#profileCountryFlag"),
    countryName: root.querySelector("#profileCountryName"),
    boardName: root.querySelector("#profileBoardName"),
    boardBadge: root.querySelector("#profileBoardBadge"),
    gradeVal: root.querySelector("#profileGradeVal"),
    dailyHoursVal: root.querySelector("#profileDailyHoursVal"),
    goalBadge: root.querySelector("#profileGoalBadge"),
    goalName: root.querySelector("#profileGoalName"),
    languageVal: root.querySelector("#profileLanguageVal"),
    subjectsContainer: root.querySelector("#profileSubjectsContainer"),
    editAcademicBtn: root.querySelector("#editAcademicBtn"),

    // Academic Modal Elements
    academicModal: root.querySelector("#academicModal"),
    closeModalBtn: root.querySelector("#closeAcademicModalBtn"),
    cancelModalBtn: root.querySelector("#cancelAcademicBtn"),
    saveModalBtn: root.querySelector("#saveAcademicBtn"),
    editCountrySelect: root.querySelector("#editCountrySelect"),
    editTrackSelect: root.querySelector("#editTrackSelect"),
    editGradeSelect: root.querySelector("#editGradeSelect"),
    editSubjectsList: root.querySelector("#editSubjectsList"),
    editGoalSelect: root.querySelector("#editGoalSelect"),
    editDailyHours: root.querySelector("#editDailyHours"),
    editDailyHoursVal: root.querySelector("#editDailyHoursVal"),
    editLanguageSelect: root.querySelector("#editLanguageSelect"),
  };

  const userRef = doc(ctx.db, "users", uid);
  const learningProfileRef = doc(ctx.db, "users", uid, "learning", "profile");

  let storedCountry = "US";
  try {
    storedCountry = localStorage.getItem("learning_allied_country") || "US";
  } catch {}
  const initialTracks = getTracksForCountry(storedCountry);
  const initialTrackId = initialTracks[0]?.id || "us_ap";
  const initialGrade = initialTracks[0]?.defaultGrade || "Grade 12";

  const defaultProfile = {
    displayName: ctx.user.displayName || "",
    email: ctx.user.email || "",
    photoURL: ctx.user.photoURL || "",
    plan: "free",
    streak: 0,
    topics: [],
    country: storedCountry,
    board: initialTrackId,
    trackId: initialTrackId,
    grade: initialGrade,
    subjects: ["Physics", "Chemistry", "Mathematics"],
    academicGoal: "concept_mastery",
    dailyHours: 4,
    preferredLanguage: "en",
    personality: "mentor",
  };

  let profileData = defaultProfile;
  let personalityBusy = false;
  let letterRequest = null;
  let modalSubjects = ["Physics", "Chemistry", "Mathematics"];

  hydrateTopbar(root, ctx.user);
  initTheme();
  loadProfile();
  initAcademicModal();

  return () => lifecycle.dispose();

  function setText(node, value) {
    if (node) node.textContent = value == null ? "" : String(value);
  }

  function setStat(id, value) {
    const node = root.querySelector(`#${id} .stat-v`);
    if (node) node.textContent = String(value ?? "–");
  }

  function initTheme() {
    if (!els.themeSwitch) return;

    let saved = null;
    try {
      saved =
        localStorage.getItem(THEME_KEY) ||
        localStorage.getItem(LEGACY_THEME_KEY);
    } catch {}
    applyTheme(saved !== "dark");

    lifecycle.on(els.themeSwitch, "click", () => {
      const light = els.themeSwitch.getAttribute("aria-checked") !== "true";
      applyTheme(light);
      try {
        localStorage.setItem(THEME_KEY, light ? "light" : "dark");
        localStorage.setItem(LEGACY_THEME_KEY, light ? "light" : "dark");
      } catch {}
    });
  }

  function applyTheme(light) {
    document.documentElement.classList.toggle("light-mode", Boolean(light));
    els.themeSwitch?.setAttribute("aria-checked", String(Boolean(light)));
    setText(els.themeLabel, light ? "Light theme" : "Dark theme");
  }

  async function loadProfile() {
    try {
      // 1. Load root user document
      const snap = await getDoc(userRef).catch(() => null);
      if (snap?.exists()) {
        profileData = { ...defaultProfile, ...snap.data() };
      } else {
        profileData = { ...defaultProfile };
        await setDoc(userRef, {
          uid,
          displayName: ctx.user.displayName || "",
          email: ctx.user.email || "",
          photoURL: ctx.user.photoURL || "",
          exam: initialTracks[0]?.shortName || "General Curriculum",
          createdAt: serverTimestamp(),
          plan: "free",
        }).catch(() => {});
      }

      // 2. Load dedicated learning profile
      try {
        const learnSnap = await getDoc(learningProfileRef);
        if (learnSnap.exists()) {
          const lData = learnSnap.data();
          profileData = {
            ...profileData,
            country: lData.country || profileData.country || storedCountry,
            board: lData.board || lData.trackId || profileData.board || initialTrackId,
            trackId: lData.trackId || lData.board || profileData.trackId || initialTrackId,
            grade: lData.grade || profileData.grade || initialGrade,
            subjects: Array.isArray(lData.subjects) && lData.subjects.length > 0 ? lData.subjects : profileData.subjects,
            academicGoal: lData.academicGoal || profileData.academicGoal || "concept_mastery",
            dailyHours: lData.dailyHours ? Number(lData.dailyHours) : (profileData.dailyHours || 4),
            preferredLanguage: lData.preferredLanguage || profileData.preferredLanguage || "en",
            personality: lData.personality || profileData.personality || "mentor",
          };
        }
      } catch (err) {
        console.warn("[profile] learning profile load error:", err);
      }

      // 3. Count user chats
      try {
        const chats = await getDocs(collection(ctx.db, "users", uid, "chats"));
        profileData._chatCount = chats.size;
      } catch {
        profileData._chatCount = 0;
      }
    } catch (err) {
      console.warn("[profile] load failed", err);
      profileData = { ...defaultProfile, _chatCount: 0 };
    }

    if (lifecycle.disposed) return;

    renderProfile();
    initPersonality();
    initLetter();
  }

  function renderProfile() {
    const name =
      profileData.displayName ||
      ctx.user.displayName ||
      ctx.user.email?.split("@")[0] ||
      "Student";
    const email = profileData.email || ctx.user.email || "–";
    const avatarUrl = profileData.photoURL || ctx.user.photoURL || "";
    const topics = Array.isArray(profileData.topics) ? profileData.topics : [];
    const pro = Boolean(ctx.isPro);

    if (els.avatar) {
      els.avatar.textContent = "";
      if (avatarUrl) {
        const img = document.createElement("img");
        img.src = avatarUrl;
        img.alt = "";
        els.avatar.appendChild(img);
      } else {
        els.avatar.textContent = String(name).charAt(0).toUpperCase();
      }
    }

    setText(els.name, name);
    setText(els.email, email);
    setText(els.plan, pro ? "Pro plan" : "Free plan");
    setStat("statChats", profileData._chatCount ?? 0);
    setStat("statStreak", profileData.streak ?? 0);
    setStat("statTopics", topics.length);

    // Render Academic Details
    const countryCode = profileData.country || storedCountry;
    const countryObj = getCountryOption(countryCode);
    setText(els.countryFlag, countryObj.flag);
    setText(els.countryName, countryObj.name);

    const countryTracks = getTracksForCountry(countryCode);
    const trackId = profileData.board || profileData.trackId || countryTracks[0]?.id || "";
    const trackObj = getTrackInfo(trackId);
    setText(els.boardName, trackObj?.name || profileData.exam || "General Curriculum");
    setText(els.boardBadge, trackObj?.shortName || "Standard");

    setText(els.gradeVal, profileData.grade || trackObj?.defaultGrade || "—");
    setText(els.dailyHoursVal, `${profileData.dailyHours || 4} hours / day`);

    const goalObj = GOAL_OPTIONS.find((g) => g.id === profileData.academicGoal) || GOAL_OPTIONS[0];
    setText(els.goalBadge, goalObj.badge);
    setText(els.goalName, goalObj.title);

    const langObj = LANGUAGE_OPTIONS.find((l) => l.code === profileData.preferredLanguage) || LANGUAGE_OPTIONS[0];
    setText(els.languageVal, `${langObj.name} (${langObj.nativeName})`);

    // Priority Subjects Chips
    if (els.subjectsContainer) {
      els.subjectsContainer.innerHTML = "";
      const subs = Array.isArray(profileData.subjects) && profileData.subjects.length > 0
        ? profileData.subjects
        : ["Physics", "Chemistry", "Mathematics"];
      for (const s of subs) {
        const chip = document.createElement("span");
        chip.className = "academic-chip";
        chip.textContent = s;
        els.subjectsContainer.appendChild(chip);
      }
    }
  }

  function initAcademicModal() {
    if (!els.academicModal || !els.editAcademicBtn) return;

    // Open Modal
    lifecycle.on(els.editAcademicBtn, "click", () => {
      openModal();
    });

    // Close Modal buttons
    if (els.closeModalBtn) {
      lifecycle.on(els.closeModalBtn, "click", closeModal);
    }
    if (els.cancelModalBtn) {
      lifecycle.on(els.cancelModalBtn, "click", closeModal);
    }

    // Close on backdrop click
    lifecycle.on(els.academicModal, "click", (e) => {
      if (e.target === els.academicModal) closeModal();
    });

    // Populate Country dropdown
    if (els.editCountrySelect) {
      els.editCountrySelect.innerHTML = "";
      for (const c of COUNTRY_OPTIONS) {
        const opt = document.createElement("option");
        opt.value = c.code;
        opt.textContent = `${c.flag} ${c.name} (${c.region})`;
        els.editCountrySelect.appendChild(opt);
      }

      lifecycle.on(els.editCountrySelect, "change", () => {
        const newCountry = els.editCountrySelect.value;
        populateTracks(newCountry);
      });
    }

    // Track dropdown listener
    if (els.editTrackSelect) {
      lifecycle.on(els.editTrackSelect, "change", () => {
        const newTrack = els.editTrackSelect.value;
        populateGrades(newTrack);
        populateSubjects(newTrack);
      });
    }

    // Populate Goals dropdown
    if (els.editGoalSelect) {
      els.editGoalSelect.innerHTML = "";
      for (const g of GOAL_OPTIONS) {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = `${g.badge} — ${g.title}`;
        els.editGoalSelect.appendChild(opt);
      }
    }

    // Populate Languages dropdown
    if (els.editLanguageSelect) {
      els.editLanguageSelect.innerHTML = "";
      for (const l of LANGUAGE_OPTIONS) {
        const opt = document.createElement("option");
        opt.value = l.code;
        opt.textContent = `${l.nativeName} (${l.name})`;
        els.editLanguageSelect.appendChild(opt);
      }
    }

    // Daily hours slider listener
    if (els.editDailyHours) {
      lifecycle.on(els.editDailyHours, "input", () => {
        if (els.editDailyHoursVal) {
          els.editDailyHoursVal.textContent = els.editDailyHours.value;
        }
      });
    }

    // Save button
    if (els.saveModalBtn) {
      lifecycle.on(els.saveModalBtn, "click", saveAcademicProfile);
    }
  }

  function openModal() {
    const curCountry = profileData.country || "IN";
    const curTrack = profileData.board || profileData.trackId || "in_cbse";
    const curGrade = profileData.grade || "Class 12";
    modalSubjects = Array.isArray(profileData.subjects) && profileData.subjects.length > 0
      ? [...profileData.subjects]
      : ["Physics", "Chemistry", "Mathematics"];

    if (els.editCountrySelect) els.editCountrySelect.value = curCountry;
    populateTracks(curCountry, curTrack);
    populateGrades(curTrack, curGrade);
    populateSubjects(curTrack, modalSubjects);

    if (els.editGoalSelect) els.editGoalSelect.value = profileData.academicGoal || "top_percentile";
    if (els.editDailyHours) {
      els.editDailyHours.value = profileData.dailyHours || 4;
      if (els.editDailyHoursVal) els.editDailyHoursVal.textContent = String(profileData.dailyHours || 4);
    }
    if (els.editLanguageSelect) els.editLanguageSelect.value = profileData.preferredLanguage || "en";

    els.academicModal.classList.add("open");
  }

  function closeModal() {
    if (els.academicModal) els.academicModal.classList.remove("open");
  }

  function populateTracks(countryCode, selectTrackId) {
    if (!els.editTrackSelect) return;
    const tracks = getTracksForCountry(countryCode);
    els.editTrackSelect.innerHTML = "";
    for (const t of tracks) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.shortName} — ${t.name}`;
      els.editTrackSelect.appendChild(opt);
    }
    const chosenTrack = selectTrackId && tracks.some((t) => t.id === selectTrackId)
      ? selectTrackId
      : (tracks[0]?.id || "in_cbse");
    els.editTrackSelect.value = chosenTrack;

    populateGrades(chosenTrack);
    populateSubjects(chosenTrack);
  }

  function populateGrades(trackId, selectGrade) {
    if (!els.editGradeSelect) return;
    const grades = getGradesForTrack(trackId);
    els.editGradeSelect.innerHTML = "";
    for (const g of grades) {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.label;
      els.editGradeSelect.appendChild(opt);
    }
    if (selectGrade && grades.some((g) => g.id === selectGrade)) {
      els.editGradeSelect.value = selectGrade;
    } else {
      els.editGradeSelect.value = grades[grades.length - 1]?.id || grades[0]?.id || "Class 12";
    }
  }

  function populateSubjects(trackId, selectedList) {
    if (!els.editSubjectsList) return;
    const available = getSubjectsForTrack(trackId);
    if (!selectedList) {
      modalSubjects = available.slice(0, 3);
    }
    renderModalSubjectChips(available);
  }

  function renderModalSubjectChips(available) {
    if (!els.editSubjectsList) return;
    els.editSubjectsList.innerHTML = "";
    for (const sub of available) {
      const isSel = modalSubjects.includes(sub);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `academic-chip-btn ${isSel ? "selected" : ""}`;
      btn.innerHTML = `<span>${isSel ? "✓" : "+"}</span><span>${sub}</span>`;
      btn.addEventListener("click", () => {
        if (modalSubjects.includes(sub)) {
          if (modalSubjects.length === 1) return; // Keep at least one
          modalSubjects = modalSubjects.filter((s) => s !== sub);
        } else {
          modalSubjects.push(sub);
        }
        renderModalSubjectChips(available);
      });
      els.editSubjectsList.appendChild(btn);
    }
  }

  async function saveAcademicProfile() {
    if (!els.saveModalBtn || els.saveModalBtn.disabled) return;

    const newCountry = els.editCountrySelect?.value || storedCountry;
    const fallbackTrack = getTracksForCountry(newCountry)[0]?.id || "";
    const newTrack = els.editTrackSelect?.value || fallbackTrack;
    const newGrade = els.editGradeSelect?.value || "";
    const newGoal = els.editGoalSelect?.value || "concept_mastery";
    const newDailyHours = Number(els.editDailyHours?.value || 4);
    const newLanguage = els.editLanguageSelect?.value || "en";
    const newSubjects = [...modalSubjects];

    const trackObj = getTrackInfo(newTrack);

    els.saveModalBtn.disabled = true;
    setText(els.saveModalBtn, "Saving…");

    try {
      // 1. Save to users/{uid}/learning/profile
      await setDoc(
        learningProfileRef,
        {
          country: newCountry,
          board: newTrack,
          trackId: newTrack,
          trackName: trackObj?.name || newTrack,
          grade: newGrade,
          subjects: newSubjects,
          academicGoal: newGoal,
          dailyHours: newDailyHours,
          preferredLanguage: newLanguage,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Mirror to root user document
      await setDoc(
        userRef,
        {
          country: newCountry,
          board: newTrack,
          trackId: newTrack,
          grade: newGrade,
          exam: trackObj?.name || newTrack,
          subjects: newSubjects,
          academicGoal: newGoal,
          dailyHours: newDailyHours,
          preferredLanguage: newLanguage,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Update localStorage for immediate cross-page sync
      try {
        localStorage.setItem("learning_allied_country", newCountry);
        localStorage.setItem(
          "learning_allied_education_profile",
          JSON.stringify({
            country: newCountry,
            track: newTrack,
            classNum: newGrade,
            subjects: newSubjects,
            academicGoal: newGoal,
            dailyHours: newDailyHours,
            preferredLanguage: newLanguage,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (_) {}

      // 4. Update local state and UI
      profileData.country = newCountry;
      profileData.board = newTrack;
      profileData.trackId = newTrack;
      profileData.exam = trackObj?.name || newTrack;
      profileData.grade = newGrade;
      profileData.subjects = newSubjects;
      profileData.academicGoal = newGoal;
      profileData.dailyHours = newDailyHours;
      profileData.preferredLanguage = newLanguage;

      renderProfile();
      closeModal();
      toast.show("Academic profile updated successfully!", "success");
    } catch (err) {
      console.error("[profile] save failed", err);
      toast.show("Could not save profile changes. Please try again.", "error");
    } finally {
      els.saveModalBtn.disabled = false;
      setText(els.saveModalBtn, "Save Academic Profile");
    }
  }

  function initPersonality() {
    if (!els.personalityGrid) return;

    let saved = profileData.personality || null;
    if (!saved) {
      try {
        saved = localStorage.getItem(PERSONALITY_KEY);
      } catch {}
    }

    const cards = Array.from(
      els.personalityGrid.querySelectorAll(".pcard")
    );
    if (!cards.length) return;

    const mark = (id) => {
      for (const card of cards) {
        card.setAttribute(
          "aria-checked",
          String(card.dataset.id === id)
        );
      }
    };

    mark(saved);

    for (const card of cards) {
      lifecycle.on(card, "pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });

      lifecycle.on(card, "click", async () => {
        if (personalityBusy) return;
        const id = card.dataset.id;
        const previous =
          els.personalityGrid.querySelector('.pcard[aria-checked="true"]')
            ?.dataset.id || null;
        if (id === previous) return;

        personalityBusy = true;
        mark(id);
        try {
          localStorage.setItem(PERSONALITY_KEY, id);
        } catch {}

        try {
          await setDoc(
            userRef,
            { personality: id, updatedAt: serverTimestamp() },
            { merge: true }
          );
          await setDoc(
            learningProfileRef,
            { personality: id, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});

          if (lifecycle.disposed) return;
          profileData.personality = id;
          toast.show(
            `Personality saved: ${PERSONALITY_NAMES[id] || id}`,
            "success"
          );
        } catch (err) {
          if (lifecycle.disposed) return;
          console.warn("[profile] personality save failed", err);
          mark(previous);
          toast.show("Couldn't save personality. Try again.", "error");
        } finally {
          personalityBusy = false;
        }
      });
    }
  }

  function initLetter() {
    if (profileData.futureMeLetter) {
      showLetter(
        profileData.futureMeLetter,
        profileData.futureMeLetterDate || ""
      );
      setText(els.letterBtnText, "Generate new letter");
    }

    if (!els.letterBtn) return;

    lifecycle.add(() => {
      letterRequest?.abort();
      letterRequest = null;
    });

    lifecycle.on(els.letterBtn, "click", () => {
      generateLetter();
    });
  }

  function showLetter(content, date) {
    if (els.letterPlaceholder) els.letterPlaceholder.style.display = "none";
    if (els.letterContent) {
      els.letterContent.textContent = content;
      els.letterContent.style.display = "block";
    }
    if (els.letterDate) {
      els.letterDate.textContent = date || "";
      els.letterDate.style.display = date ? "block" : "none";
    }
  }

  async function generateLetter() {
    if (!els.letterBtn || els.letterBtn.disabled) return;

    const name =
      profileData.displayName ||
      ctx.user.displayName ||
      ctx.user.email?.split("@")[0] ||
      "Student";
    const streak = profileData.streak ?? 0;
    const topics = Array.isArray(profileData.topics) ? profileData.topics : [];
    const exam = profileData.exam || "";

    const prompt = `You are writing a heartfelt, motivational letter from "${name}"'s future self — the version of them who has already achieved their academic dreams and is looking back with pride and gratitude.

Write a warm, personal letter (200-300 words) that:
- Celebrates their current efforts and progress
- Acknowledges the challenges they're facing now in studying ${exam || "their subjects"}${topics.length ? `, especially ${topics.slice(0, 4).join(", ")}` : ""}
- Reminds them why they started and how far they've come (${streak} day streak so far!)
- Offers specific, encouraging wisdom from the future
- Ends with a loving sign-off

Format it as a real handwritten letter, with a date line at the top and a closing signature. Make it deeply personal, not generic. Use natural, warm language.`;

    letterRequest?.abort();
    const controller = new AbortController();
    letterRequest = controller;

    els.letterBtn.disabled = true;
    els.letterBtn.classList.add("loading");
    setText(els.letterBtnText, "Writing…");

    try {
      const res = await ctx.authFetch("/api/groq-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are a compassionate, wise letter writer. You write beautiful, personalized letters from a person's future self.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.8,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message || "Generation failed");
      }

      const data = await res.json();
      const letter = String(
        data?.choices?.[0]?.message?.content ||
          data?.reply ||
          data?.content ||
          ""
      ).trim();
      if (!letter) throw new Error("Empty response");

      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (lifecycle.disposed) return;
      profileData.futureMeLetter = letter;
      profileData.futureMeLetterDate = today;
      showLetter(letter, today);
      setText(els.letterBtnText, "Generate new letter");
      toast.show("Your letter is ready", "success");

      setDoc(
        userRef,
        {
          futureMeLetter: letter,
          futureMeLetterDate: today,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((err) => console.warn("[profile] letter save failed", err));
    } catch (err) {
      if (controller.signal.aborted || lifecycle.disposed) return;
      console.warn("[profile] letter generation failed", err);
      toast.show(`Couldn't generate letter: ${err.message}`, "error");
    } finally {
      if (letterRequest === controller) letterRequest = null;
      if (lifecycle.disposed) return;
      els.letterBtn.disabled = false;
      els.letterBtn.classList.remove("loading");
      if (!profileData.futureMeLetter) {
        setText(els.letterBtnText, "Generate letter");
      } else {
        setText(els.letterBtnText, "Generate new letter");
      }
    }
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
