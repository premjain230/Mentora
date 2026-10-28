"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { initFirebase } from "../../lib/firebase";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, isPro, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Learning Allied AI study partner. You can ask me to explain any concept in Physics, Chemistry, or Math, solve a tricky problem step-by-step, or test your understanding with active recall questions. What are we studying today?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !user) return;

    const userMessage: Message = { role: "user", content: text, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/groq-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 429) {
        // Free plan limit reached!
        if (!isPro) {
          window.dispatchEvent(
            new CustomEvent("show-upgrade-modal", {
              detail: { type: "chat", used: 20, limit: 20 },
            })
          );
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "You have reached your daily limit of 20 free chats. Please upgrade to Learning Allied Pro for unlimited conversations.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const data = await res.json();
      if (data && data.choices && data.choices[0]?.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.choices[0].message.content,
            timestamp: Date.now(),
          },
        ]);
      } else {
        throw new Error(data.error || "Unexpected response format.");
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Tutor Chat</span>
          </div>
          <span
            style={{
              fontSize: 11,
              background: "var(--bg-elevated)",
              padding: "2px 8px",
              borderRadius: 999,
              color: "var(--text-muted)",
              marginLeft: 10,
            }}
          >
            GPT-OSS / Qwen Active
          </span>
        </div>

        <div className="topbar-right">
          {isPro && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ff8a1f" }}>
              ★ Pro Unlimited
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 64px)",
          maxWidth: 860,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Messages scroll area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "14px 18px",
                    borderRadius: 16,
                    background: isUser ? "rgba(255, 138, 31, 0.14)" : "var(--bg-card)",
                    border: `1px solid ${isUser ? "rgba(255, 138, 31, 0.3)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    borderBottomRightRadius: isUser ? 4 : 16,
                    borderBottomLeftRadius: !isUser ? 4 : 16,
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: 16,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                Thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form
          onSubmit={handleSend}
          style={{
            padding: "16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-base)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "6px 12px",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask a question or paste a problem…"
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                fontSize: 15,
                resize: "none",
                padding: "8px 0",
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn btn-primary"
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                opacity: sending || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
