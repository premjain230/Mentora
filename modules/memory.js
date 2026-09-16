/**
 * Memory System — long-term AI memory (shared with the mobile app).
 *
 * Stored in `users/{uid}/learning/memory` — an owner-only doc under the
 * `learning` profile path, so no Firestore rules changes are needed. The web
 * chat and the mobile app both read the latest entries and inject them into
 * the system prompt so Aquila "remembers" the student across conversations
 * and devices.
 */

import { db } from "../firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const MAX_ITEMS = 60;
const MAX_LEN = 2000;

function ref(uid) {
  return doc(db, "users", uid, "learning", "memory");
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Returns memory items, newest first. */
export async function loadMemory(uid) {
  if (!db || !uid) return [];
  try {
    const snap = await getDoc(ref(uid));
    const items = snap.exists() ? snap.data().items : null;
    if (!Array.isArray(items)) return [];
    return items
      .filter((m) => m && typeof m.text === "string" && m.text.trim())
      .map((m) => ({
        id: String(m.id || ""),
        text: String(m.text),
        createdAt: m.t ? new Date(m.t) : new Date(0),
      }));
  } catch (e) {
    console.warn("loadMemory:", e);
    return [];
  }
}

/** Adds a memory (newest first). Returns true on success. */
export async function addMemory(uid, text) {
  const trimmed = String(text || "").trim();
  if (!db || !uid || !trimmed) return false;
  try {
    const items = await loadMemory(uid);
    items.unshift({
      id: newId(),
      text: trimmed.slice(0, MAX_LEN),
      createdAt: new Date(),
    });
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    await setDoc(ref(uid), {
      items: items.map((m) => ({ id: m.id, text: m.text, t: m.createdAt.getTime() })),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn("addMemory:", e);
    return false;
  }
}

/** Removes a memory by its id. */
export async function removeMemory(uid, id) {
  if (!db || !uid) return;
  try {
    const items = await loadMemory(uid);
    const next = items.filter((m) => m.id !== id);
    await setDoc(ref(uid), {
      items: next.map((m) => ({ id: m.id, text: m.text, t: m.createdAt.getTime() })),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("removeMemory:", e);
  }
}
