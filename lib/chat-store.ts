import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
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
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: unknown;
  messageCount: number;
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

export async function loadChatSession(
  db: Firestore,
  uid: string,
  chatId: string
): Promise<ChatSession | null> {
  const chatRef = chatDocument(db, uid, chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return null;

  const data = chatSnap.data();
  const messagesSnap = await getDocs(
    query(collection(chatRef, "messages"), orderBy("ts", "asc"))
  );

  const messages: StoredChatMessage[] = [];
  messagesSnap.forEach((messageDoc) => {
    const message = messageDoc.data();
    if (message.role !== "user" && message.role !== "assistant") return;
    const content = typeof message.content === "string" ? message.content : "";
    if (!content.trim()) return;
    messages.push({
      id: messageDoc.id,
      role: message.role,
      content,
      reply: (message.reply as TeachingReply) || null,
      meta: (message.meta as TutorMeta) || null,
    });
  });

  return {
    id: chatSnap.id,
    title: typeof data.title === "string" ? data.title : "Untitled chat",
    messages,
  };
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
    });
  });
  return sessions;
}
