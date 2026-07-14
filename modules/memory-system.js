/**
 * Memory System Module
 * Manages long-term storage and retrieval of learning data.
 * Bridges the student model with persistent Firebase Firestore storage.
 */

import { auth, db } from '../firebase-config.js';
import {
  doc, setDoc, getDoc, collection, addDoc, query,
  orderBy, limit, getDocs, serverTimestamp, where, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function getProfileRef(uid) {
  if (!db) return null;
  return doc(db, 'users', uid, 'learning', 'profile');
}

export function getCardsRef(uid) {
  if (!db) return null;
  return collection(db, 'users', uid, 'cards');
}

export async function loadProfile(uid) {
  try {
    const ref = getProfileRef(uid);
    if (!ref) return null;
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function saveProfile(uid, profile) {
  try {
    const ref = getProfileRef(uid);
    if (!ref) return false;
    const summaryFields = {
      conceptMastery: profile.conceptMastery,
      confidence: profile.confidence,
      memoryStrength: profile.memoryStrength,
      learningVelocity: profile.learningVelocity,
      preferredStyle: profile.preferredStyle,
      motivationIndicators: profile.motivationIndicators,
      learningGoals: profile.learningGoals,
      sessionCount: profile.sessionCount,
      totalInteractions: profile.totalInteractions,
      createdAt: profile.createdAt,
      updatedAt: serverTimestamp()
    };
    await setDoc(ref, summaryFields, { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function loadCards(uid) {
  try {
    const ref = getCardsRef(uid);
    if (!ref) return [];
    const q = query(ref, orderBy('createdAt', 'desc'), limit(1000));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function saveCard(uid, card) {
  try {
    const ref = getCardsRef(uid);
    if (!ref) return null;
    return await addDoc(ref, { ...card, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch {
    return null;
  }
}

export async function updateCard(uid, cardId, updates) {
  try {
    if (!db) return false;
    const ref = doc(db, 'users', uid, 'cards', cardId);
    await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCard(uid, cardId) {
  try {
    if (!db) return false;
    await deleteDoc(doc(db, 'users', uid, 'cards', cardId));
    return true;
  } catch {
    return false;
  }
}

export async function saveInteraction(uid, interaction) {
  try {
    if (!db) return false;
    await addDoc(collection(db, 'users', uid, 'interactions'), {
      ...interaction,
      timestamp: serverTimestamp()
    });
    return true;
  } catch {
    return false;
  }
}

export async function saveMisconception(uid, misconception) {
  try {
    if (!db) return false;
    await addDoc(collection(db, 'users', uid, 'misconceptions'), {
      ...misconception,
      detectedAt: serverTimestamp()
    });
    return true;
  } catch {
    return false;
  }
}

export async function getReviewHistory(uid, limitCount = 50) {
  try {
    if (!db) return [];
    const q = query(
      collection(db, 'users', uid, 'interactions'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch {
    return [];
  }
}

export async function saveAnalyticsEvent(uid, event) {
  try {
    if (!db) return false;
    await addDoc(collection(db, 'users', uid, 'analytics'), {
      ...event,
      timestamp: serverTimestamp()
    });
    return true;
  } catch {
    return false;
  }
}
