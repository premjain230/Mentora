"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { initFirebase } from "../../lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export default function ChatHistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      initFirebase().then(async ({ db }) => {
        if (!db) {
          setFetching(false);
          return;
        }
        try {
          const q = query(
            collection(db, "users", user.uid, "chats"),
            orderBy("updatedAt", "desc"),
            limit(50)
          );
          const snap = await getDocs(q);
          const list: any[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setChats(list);
        } catch (err) {
          console.warn("Could not load chat history:", err);
        } finally {
          setFetching(false);
        }
      });
    }
  }, [user, loading, router]);

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Chat History</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
          Previous AI Tutor Chats
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>
          Review your previous explanations, problem solving steps, and practice sessions.
        </p>

        {fetching ? (
          <div style={{ color: "var(--text-muted)" }}>Loading chat sessions…</div>
        ) : chats.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "36px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>No saved chats found yet.</p>
            <Link href="/chat" className="btn btn-primary">
              Start your first chat
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {chats.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {c.title || "Study Session"}
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {c.topic || "Physics / Chemistry / Mathematics"}
                  </div>
                </div>
                <Link
                  href={`/chat?id=${c.id}`}
                  style={{
                    fontSize: 13,
                    color: "var(--accent)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Resume →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
