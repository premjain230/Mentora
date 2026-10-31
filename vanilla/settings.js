import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { createLifecycle } from "./shared/lifecycle.js";
import { mountToast } from "./shared/toast.js";

const THEME_KEY = "learning-allied-theme";
const LEGACY_THEME_KEY = "aquila-theme";
const MAX_MEMORIES = 60;
const MAX_MEMORY_LENGTH = 2000;
const SUPPORT_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const toast = mountToast(root, lifecycle);
  const uid = ctx.user?.uid;
  if (!uid) return () => lifecycle.dispose();

  const els = {
    displayName: root.querySelector("#displayName"),
    displayEmail: root.querySelector("#displayEmail"),
    emailBadge: root.querySelector("#emailBadge"),
    displayPlan: root.querySelector("#displayPlan"),
    themeSwitch: root.querySelector("#settingsThemeSwitch"),
    themeLabel: root.querySelector("#settingsThemeLabel"),
    memoryInput: root.querySelector("#memoryInput"),
    addMemoryBtn: root.querySelector("#addMemoryBtn"),
    memoryList: root.querySelector("#memoryList"),
    resetEmail: root.querySelector("#resetEmail"),
    resetPasswordBtn: root.querySelector("#resetPasswordBtn"),
    supportFrom: root.querySelector("#supportFrom"),
    supportSubject: root.querySelector("#supportSubject"),
    supportMessage: root.querySelector("#supportMessage"),
    subjectCount: root.querySelector("#subjectCount"),
    messageCount: root.querySelector("#messageCount"),
    sendSupportBtn: root.querySelector("#sendSupportBtn"),
    logoutBtn: root.querySelector("#logoutBtn"),
    logoutModal: root.querySelector("#logoutModal"),
    cancelLogout: root.querySelector("#cancelLogout"),
    confirmLogout: root.querySelector("#confirmLogout"),
  };

  const user = ctx.user;
  const email = user.email || "";
  const displayName = user.displayName || email.split("@")[0] || "Student";
  const memoryRef = doc(ctx.db, "users", uid, "learning", "memory");

  let memories = [];
  let memoryBusy = false;
  let supportBusy = false;
  let logoutBusy = false;

  hydrateTopbar(root, user);
  populateAccount();
  initTheme();
  initMemory();
  initPasswordReset();
  initSupport();
  initLogoutModal();

  return () => lifecycle.dispose();

  function setText(node, value) {
    if (node) node.textContent = value == null ? "" : String(value);
  }

  function populateAccount() {
    setText(els.displayName, displayName);
    setText(els.displayEmail, email || "—");
    setText(
      els.displayPlan,
      ctx.isPro ? "✨ Learning Allied Pro" : "Free Plan"
    );
    if (els.emailBadge) {
      els.emailBadge.textContent = user.emailVerified ? "Verified" : "Unverified";
    }
    if (els.supportFrom) {
      els.supportFrom.value = email;
      els.supportFrom.placeholder = email || "Signed-in email";
    }
    setText(els.resetEmail, email || "your registered email");
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

  function initMemory() {
    if (!els.memoryList) return;

    lifecycle.on(els.memoryList, "click", (event) => {
      const button = event.target.closest("[data-mem-id]");
      if (!button) return;
      removeMemory(button.getAttribute("data-mem-id"));
    });

    lifecycle.on(els.addMemoryBtn, "click", () => {
      addMemory();
    });

    lifecycle.on(els.memoryInput, "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addMemory();
      }
    });

    loadMemories();
  }

  async function loadMemories() {
    try {
      const snap = await getDoc(memoryRef);
      const items = snap.exists() ? snap.data().items : null;
      memories = Array.isArray(items)
        ? items
            .filter((item) => item && typeof item.text === "string" && item.text.trim())
            .map((item, index) => ({
              id: String(item.id || `memory-${index}-${item.t || 0}`),
              text: String(item.text),
              t: Number(item.t) || 0,
            }))
        : [];
    } catch (err) {
      console.warn("[settings] memory load failed", err);
      memories = [];
    }

    if (lifecycle.disposed) return;
    renderMemories();
  }

  function renderMemories() {
    if (!els.memoryList) return;
    els.memoryList.textContent = "";

    if (!memories.length) {
      const empty = document.createElement("p");
      empty.className = "memory-empty";
      empty.textContent =
        'No memories yet. Tap "Remember" under any Learning Allied answer in Chat, or add one above.';
      els.memoryList.appendChild(empty);
      return;
    }

    for (const memory of memories) {
      const row = document.createElement("div");
      row.className = "memory-item";

      const icon = document.createElement("span");
      icon.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent, #ff8a1f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      if (icon.firstElementChild) icon.firstElementChild.style.display = "block";

      const text = document.createElement("div");
      text.className = "memory-text";
      text.textContent = memory.text;

      const forget = document.createElement("button");
      forget.type = "button";
      forget.className = "memory-forget";
      forget.setAttribute("data-mem-id", memory.id);
      forget.textContent = "Forget";

      row.append(icon, text, forget);
      els.memoryList.appendChild(row);
    }
  }

  function persistMemories() {
    return setDoc(memoryRef, {
      items: memories.map((item) => ({
        id: item.id,
        text: item.text,
        t: item.t,
      })),
      updatedAt: serverTimestamp(),
    });
  }

  async function addMemory() {
    if (!els.memoryInput || memoryBusy) return;
    const value = els.memoryInput.value.trim();
    if (!value) {
      toast.show("Type something to remember first.", "error");
      return;
    }

    memoryBusy = true;
    if (els.addMemoryBtn) els.addMemoryBtn.disabled = true;

    const added = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      text: value.slice(0, MAX_MEMORY_LENGTH),
      t: Date.now(),
    };

    const previous = memories;
    memories = [added, ...memories].slice(0, MAX_MEMORIES);
    renderMemories();
    els.memoryInput.value = "";

    try {
      await persistMemories();
      if (lifecycle.disposed) return;
      toast.show("Saved to memory.", "success");
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("[settings] memory add failed", err);
      memories = previous;
      els.memoryInput.value = value;
      renderMemories();
      toast.show("Couldn't save that memory. Try again.", "error");
    } finally {
      memoryBusy = false;
      if (els.addMemoryBtn) els.addMemoryBtn.disabled = false;
    }
  }

  async function removeMemory(id) {
    if (!id || memoryBusy) return;
    const previous = memories;
    const next = memories.filter((memory) => memory.id !== id);
    if (next.length === previous.length) return;

    memoryBusy = true;
    memories = next;
    renderMemories();

    try {
      await persistMemories();
      if (lifecycle.disposed) return;
      toast.show("Memory forgotten.", "success");
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("[settings] memory remove failed", err);
      memories = previous;
      renderMemories();
      toast.show("Couldn't remove that memory. Try again.", "error");
    } finally {
      memoryBusy = false;
    }
  }

  function initPasswordReset() {
    if (!els.resetPasswordBtn) return;

    lifecycle.on(els.resetPasswordBtn, "click", async () => {
      if (!email) {
        toast.show("No email address is attached to this account.", "error");
        return;
      }

      els.resetPasswordBtn.disabled = true;
      try {
        await sendPasswordResetEmail(ctx.auth, email);
        if (lifecycle.disposed) return;
        els.resetPasswordBtn.textContent = "✓ Reset email sent";
        toast.show("Password reset email sent. Check your inbox.", "success");
      } catch (err) {
        if (lifecycle.disposed) return;
        console.warn("[settings] password reset failed", err);
        els.resetPasswordBtn.disabled = false;
        toast.show("Couldn't send the reset email. Try again.", "error");
      }
    });
  }

  function initSupport() {
    const bindCounter = (input, counter, max) => {
      if (!input || !counter) return;
      const update = () => {
        counter.textContent = `${input.value.length} / ${max}`;
      };
      lifecycle.on(input, "input", update);
      update();
    };

    bindCounter(els.supportSubject, els.subjectCount, 100);
    bindCounter(els.supportMessage, els.messageCount, 1000);

    lifecycle.on(els.sendSupportBtn, "click", () => {
      sendSupport();
    });
  }

  async function sendSupport() {
    if (supportBusy || !els.sendSupportBtn) return;

    const subject = els.supportSubject?.value.trim() || "";
    const message = els.supportMessage?.value.trim() || "";

    if (!subject) {
      toast.show("Please enter a subject.", "error");
      return;
    }
    if (!message) {
      toast.show("Please enter a message.", "error");
      return;
    }

    supportBusy = true;
    const button = els.sendSupportBtn;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Sending…';

    try {
      await addDoc(collection(ctx.db, "support_requests"), {
        uid,
        email,
        displayName: user.displayName || "",
        subject,
        message,
        createdAt: serverTimestamp(),
        status: "open",
      });
      if (lifecycle.disposed) return;

      if (els.supportSubject) els.supportSubject.value = "";
      if (els.supportMessage) els.supportMessage.value = "";
      if (els.subjectCount) els.subjectCount.textContent = "0 / 100";
      if (els.messageCount) els.messageCount.textContent = "0 / 1000";

      toast.show("Your message has been sent successfully!", "success");
    } catch (err) {
      if (lifecycle.disposed) return;
      console.warn("[settings] support send failed", err);
      toast.show("Failed to send message. Please try again.", "error");
    } finally {
      supportBusy = false;
      if (lifecycle.disposed) return;
      button.disabled = false;
      button.innerHTML = `${SUPPORT_ICON} Send message`;
    }
  }

  function initLogoutModal() {
    const modal = els.logoutModal;
    if (!modal) return;

    const open = () => {
      modal.hidden = false;
      els.cancelLogout?.focus();
    };
    const close = () => {
      modal.hidden = true;
    };

    lifecycle.on(els.logoutBtn, "click", open);
    lifecycle.on(els.cancelLogout, "click", close);
    lifecycle.on(modal, "click", (event) => {
      if (event.target === modal) close();
    });
    lifecycle.on(document, "keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) close();
    });
    lifecycle.on(els.confirmLogout, "click", async () => {
      if (logoutBusy) return;
      logoutBusy = true;
      if (els.confirmLogout) els.confirmLogout.disabled = true;
      try {
        await ctx.signOut();
      } catch (err) {
        console.error("[settings] sign out failed", err);
        if (!lifecycle.disposed) {
          toast.show("Sign out failed. Please try again.", "error");
          if (els.confirmLogout) els.confirmLogout.disabled = false;
        }
      } finally {
        logoutBusy = false;
      }
    });
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
