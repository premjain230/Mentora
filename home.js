// ── home.js ──
// Auth guard for home.html.
// - Redirects to login.html if user is not signed in.
// - Populates sidebar user card with display name / avatar initial.
// - Loads recent chat history from Firestore into the sidebar.
// - Wires up the "New Chat" button to reset state.
// - Exports signOut() for the sign-out button.

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
  setDoc,
  serverTimestamp,
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
  wireNewChatBtn();
  wireSignOutBtn();
  // Daily question popup (non-blocking, shown once per day)
  import("./dailyQuestion.js").then(({ checkDailyQuestion }) => {
    checkDailyQuestion(user);
  }).catch(() => {});
});

// ─── Sidebar user card ────────────────────────────────────────────────────────
function populateUserCard(user) {
  const nameEl   = document.getElementById("userName")   || document.querySelector(".user-name");
  const planEl   = document.getElementById("userPlan")   || document.querySelector(".user-plan");
  const avatarEl = document.getElementById("userAvatar") || document.querySelector(".avatar");

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  if (nameEl) nameEl.textContent = name;

  if (avatarEl) {
    if (user.photoURL) {
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

  // Fetch plan from Firestore; create user doc if missing
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (!snap.exists()) {
      setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        exam: "",
        createdAt: serverTimestamp(),
        plan: "free",
      }).catch(() => {});
    }
    if (planEl) {
      const plan = snap.exists() ? (snap.data().plan || "free") : "free";
      planEl.textContent = plan === "pro" ? "Pro Plan ✨" : "Free Plan";
    }
  }).catch(() => {});
}

// ─── Load recent chat sessions into sidebar ───────────────────────────────────
export async function loadRecentChats(uid) {
  const navSection = document.getElementById("navSection") || document.querySelector(".nav-section");
  if (!navSection) return;

  // Remove any previous recent section so re-renders stay clean
  const existing = navSection.querySelector(".recent-section");
  if (existing) existing.remove();

  try {
    const q = query(
      collection(db, "users", uid, "chats"),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const section = document.createElement("div");
    section.className = "recent-section";

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = "Recent";
    section.appendChild(label);

    snap.forEach((docSnap) => {
      const data   = docSnap.data();
      const title  = data.title || "Untitled Chat";
      const chatId = docSnap.id;

      const item = document.createElement("div");
      item.className = "nav-item chat-history-item";
      item.dataset.chatId = chatId;
      item.title = title;
      item.textContent = title;
      item.addEventListener("click", () => loadChat(chatId, item));
      section.appendChild(item);
    });

    // Insert before the Account nav-label
    const accountLabel = [...navSection.querySelectorAll(".nav-label")]
      .find((el) => el.textContent.trim() === "Account");
    navSection.insertBefore(section, accountLabel || null);

  } catch (e) {
    console.warn("Could not load recent chats:", e);
  }
}

// ─── Load a specific chat session into the chat area ──────────────────────────
async function loadChat(chatId, itemEl) {
  if (!currentUser) return;

  // Highlight active item
  document.querySelectorAll(".chat-history-item").forEach((el) => el.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const { renderMessage, clearWelcome, setActiveChatId } = await import("./chat.js");

  // Clear UI and show loading dots
  const chatArea = document.getElementById("chatArea");
  const welcome  = document.getElementById("welcomeScreen");
  if (welcome) welcome.remove();
  chatArea.innerHTML = `
    <div class="chat-loading">
      <span class="chat-loading-dot"></span>
      <span class="chat-loading-dot"></span>
      <span class="chat-loading-dot"></span>
    </div>`;

  try {
    const msgsSnap = await getDocs(
      query(
        collection(db, "users", currentUser.uid, "chats", chatId, "messages"),
        orderBy("ts", "asc")
      )
    );

    chatArea.innerHTML = "";

    msgsSnap.forEach((d) => {
      const msg = d.data();
      if (msg.role === "user" || msg.role === "assistant") {
        renderMessage(msg.role, msg.content);
      }
    });

    chatArea.scrollTop = chatArea.scrollHeight;

  } catch (e) {
    chatArea.innerHTML = `<div class="chat-loading" style="color:#ff6b6b;">Failed to load chat.</div>`;
    console.error(e);
  }

  setActiveChatId(chatId);

  // Close sidebar on mobile
  if (window.innerWidth <= 880) {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("open");
  }
}

// ─── Wire up New Chat button ──────────────────────────────────────────────────
function wireNewChatBtn() {
  const btn = document.getElementById("newChatBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const { resetChat } = await import("./chat.js");
    resetChat();
    document.querySelectorAll(".chat-history-item").forEach((el) => el.classList.remove("active"));
  });
}

// ─── Wire up Sign Out button ──────────────────────────────────────────────────
function wireSignOutBtn() {
  const btn = document.getElementById("signOutBtn");
  if (!btn) return;
  btn.addEventListener("click", () => signOut());
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  await fbSignOut(auth);
  window.location.href = "login.html";
}

// Expose globally for any inline onclick fallbacks
window.mentora_signOut = signOut;
