// ── home.js ──
// Auth guard for home.html.
// - Redirects to login.html if user is not signed in.
// - Populates sidebar user card with display name / avatar initial.
// - Loads recent chat history from Firestore.
// - Wires up the "New Chat" button to reset state.
// - Exports signOut() for a settings/logout button.

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Global state ─────────────────────────────────────────────────────────────
export let currentUser = null;

// ─── Auth guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  populateUserCard(user);
  await loadRecentChats(user.uid);
});

// ─── Sidebar user card ────────────────────────────────────────────────────────
function populateUserCard(user) {
  const nameEl   = document.querySelector(".user-name");
  const planEl   = document.querySelector(".user-plan");
  const avatarEl = document.querySelector(".avatar");

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  if (nameEl)   nameEl.textContent   = name;
  if (avatarEl) {
    if (user.photoURL) {
      // Replace letter with actual profile photo
      const img = document.createElement("img");
      img.src = user.photoURL;
      img.alt = name;
      img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;";
      avatarEl.textContent = "";
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  }

  // Fetch plan from Firestore
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (snap.exists() && planEl) {
      const plan = snap.data().plan || "free";
      planEl.textContent = plan === "pro" ? "Pro Plan ✨" : "Free Plan";
    }
  });
}

// ─── Load recent chat sessions into sidebar ────────────────────────────────
async function loadRecentChats(uid) {
  const container = document.querySelector(".nav-section");
  if (!container) return;

  try {
    const q = query(
      collection(db, "users", uid, "chats"),
      orderBy("updatedAt", "desc"),
      limit(8)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = "Recent";

    // Insert before "Library" label
    const libraryLabel = [...container.querySelectorAll(".nav-label")]
      .find((el) => el.textContent.trim() === "Library");
    container.insertBefore(label, libraryLabel || null);

    snap.forEach((docSnap) => {
      const data    = docSnap.data();
      const title   = data.title || "Untitled Chat";
      const chatId  = docSnap.id;

      const item    = document.createElement("div");
      item.className = "nav-item";
      item.dataset.chatId = chatId;
      item.innerHTML = `<span class="nav-icon">💬</span>${escapeHtml(title)}`;
      item.onclick   = () => loadChat(chatId);

      container.insertBefore(item, libraryLabel || null);
    });
  } catch (e) {
    console.warn("Could not load recent chats:", e);
  }
}

// ─── Load a specific chat session into the chat area ──────────────────────────
async function loadChat(chatId) {
  if (!currentUser) return;
  const { renderMessage, clearWelcome } = await import("./chat.js");

  const snap = await getDocs(
    collection(db, "users", currentUser.uid, "chats", chatId, "messages")
  );
  clearWelcome();

  snap.docs
    .sort((a, b) => a.data().ts?.seconds - b.data().ts?.seconds)
    .forEach((d) => {
      const msg = d.data();
      renderMessage(msg.role, msg.content);
    });

  // Set active chat in chat.js
  const { setActiveChatId } = await import("./chat.js");
  setActiveChatId(chatId);
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  await fbSignOut(auth);
  window.location.href = "login.html";
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Expose signOut globally so an inline onclick can call it
window.mentora_signOut = signOut;
