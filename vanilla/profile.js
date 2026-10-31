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
  };

  const userRef = doc(ctx.db, "users", uid);
  const defaultProfile = {
    displayName: ctx.user.displayName || "",
    email: ctx.user.email || "",
    photoURL: ctx.user.photoURL || "",
    plan: "free",
    streak: 0,
    topics: [],
  };

  let profileData = defaultProfile;
  let personalityBusy = false;
  let letterRequest = null;

  hydrateTopbar(root, ctx.user);
  initTheme();
  loadProfile();

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
          exam: "",
          createdAt: serverTimestamp(),
          plan: "free",
        }).catch(() => {});
      }

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
