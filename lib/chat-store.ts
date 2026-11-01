import {
  addDoc,
  collection,
  doc,
  endBefore,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { Firestore, QueryDocumentSnapshot } from "firebase/firestore";
import type { TeachingReply, TutorMeta } from "@/lib/learning/types";

export type ChatRole = "user" | "assistant";

export interface StoredChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  reply: TeachingReply | null;
  meta: TutorMeta | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  /** True when older messages exist before `nextCursor`. */
  hasMore: boolean;
  nextCursor: QueryDocumentSnapshot | null;
}

export interface ChatMessagePage {
  messages: StoredChatMessage[];
  hasMore: boolean;
  nextCursor: QueryDocumentSnapshot | null;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: unknown;
  messageCount: number;
  pinned: boolean;
}

function chatCollection(db: Firestore, uid: string) {
  return collection(db, "users", uid, "chats");
}

function chatDocument(db: Firestore, uid: string, chatId: string) {
  return doc(db, "users", uid, "chats", chatId);
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function chatTitleFrom(text: string): string {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "New chat";
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean;
}

export async function createChatSession(
  db: Firestore,
  uid: string,
  firstMessage: string
) {
  return addDoc(chatCollection(db, uid), {
    title: chatTitleFrom(firstMessage),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
  });
}

export async function saveChatMessage(
  db: Firestore,
  uid: string,
  chatId: string,
  message: {
    role: ChatRole;
    content: string;
    reply?: TeachingReply | null;
    meta?: TutorMeta | null;
  }
) {
  const content = String(message.content || "").slice(0, 32000);
  if (!content.trim()) return;

  const chatRef = chatDocument(db, uid, chatId);
  const payload: Record<string, unknown> = {
    role: message.role,
    content,
    ts: serverTimestamp(),
  };
  if (message.reply) payload.reply = jsonSafe(message.reply);
  if (message.meta) payload.meta = jsonSafe(message.meta);

  await addDoc(collection(chatRef, "messages"), payload);
  await updateDoc(chatRef, {
    updatedAt: serverTimestamp(),
    messageCount: increment(1),
  });
}

const MESSAGE_PAGE = 40;

function toStoredMessage(
  messageDoc: QueryDocumentSnapshot
): StoredChatMessage | null {
  const message = messageDoc.data();
  if (message.role !== "user" && message.role !== "assistant") return null;
  const content = typeof message.content === "string" ? message.content : "";
  if (!content.trim()) return null;
  return {
    id: messageDoc.id,
    role: message.role,
    content,
    reply: (message.reply as TeachingReply) || null,
    meta: (message.meta as TutorMeta) || null,
  };
}

/** Newest-first document window, returned in chronological order. */
function readWindow(
  docs: QueryDocumentSnapshot[],
  size: number
): ChatMessagePage {
  const hasMore = docs.length > size;
  const pageDocs = docs.slice(0, size);
  const messages: StoredChatMessage[] = [];
  for (const messageDoc of pageDocs.slice().reverse()) {
    const message = toStoredMessage(messageDoc);
    if (message) messages.push(message);
  }
  return {
    messages,
    hasMore,
    nextCursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
  };
}

function pageSize(value: unknown): number {
  const size = Number(value);
  if (!Number.isFinite(size)) return MESSAGE_PAGE;
  return Math.min(100, Math.max(1, Math.floor(size)));
}

/**
 * Loads the most recent page of a conversation. Older turns are fetched on
 * demand with `loadEarlierChatMessages`, so opening a long conversation never
 * reads every message up front.
 */
export async function loadChatSession(
  db: Firestore,
  uid: string,
  chatId: string,
  options: { limit?: number } = {}
): Promise<ChatSession | null> {
  const chatRef = chatDocument(db, uid, chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return null;

  const size = pageSize(options.limit);
  const messagesSnap = await getDocs(
    query(
      collection(chatRef, "messages"),
      orderBy("ts", "desc"),
      limit(size + 1)
    )
  );
  const page = readWindow(messagesSnap.docs, size);

  const data = chatSnap.data();
  return {
    id: chatSnap.id,
    title: typeof data.title === "string" ? data.title : "Untitled chat",
    messages: page.messages,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}

export async function loadEarlierChatMessages(
  db: Firestore,
  uid: string,
  chatId: string,
  cursor: QueryDocumentSnapshot,
  pageLimit = MESSAGE_PAGE
): Promise<ChatMessagePage> {
  const size = pageSize(pageLimit);
  const messagesSnap = await getDocs(
    query(
      collection(chatDocument(db, uid, chatId), "messages"),
      orderBy("ts", "desc"),
      endBefore(cursor),
      limit(size + 1)
    )
  );
  return readWindow(messagesSnap.docs, size);
}

export async function renameChatSession(
  db: Firestore,
  uid: string,
  chatId: string,
  title: string
): Promise<string> {
  const clean = String(title || "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (!clean) throw new Error("A conversation title is required.");
  await updateDoc(chatDocument(db, uid, chatId), { title: clean });
  return clean;
}

export async function setChatPinned(
  db: Firestore,
  uid: string,
  chatId: string,
  pinned: boolean
): Promise<void> {
  // `pinnedAt` keeps the recency ordering in `updatedAt` untouched.
  await updateDoc(chatDocument(db, uid, chatId), {
    pinned: Boolean(pinned),
    pinnedAt: pinned ? serverTimestamp() : null,
  });
}

export async function listChatSessions(
  db: Firestore,
  uid: string,
  max = 50
): Promise<ChatSessionSummary[]> {
  const snap = await getDocs(
    query(
      chatCollection(db, uid),
      orderBy("updatedAt", "desc"),
      limit(max)
    )
  );

  const sessions: ChatSessionSummary[] = [];
  snap.forEach((sessionDoc) => {
    const data = sessionDoc.data();
    sessions.push({
      id: sessionDoc.id,
      title:
        typeof data.title === "string" && data.title.trim()
          ? data.title
          : "Untitled chat",
      updatedAt: data.updatedAt ?? null,
      messageCount:
        typeof data.messageCount === "number" ? data.messageCount : 0,
      pinned: data.pinned === true,
    });
  });
  return sessions;
}
