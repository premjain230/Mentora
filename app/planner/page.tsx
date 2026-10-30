"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";

interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  duration: string;
  done: boolean;
}

export default function PlannerPage() {
  const { isPro } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [generating, setGenerating] = useState(false);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleReplan = async () => {
    setGenerating(true);
    // Simulate AI plan optimization
    setTimeout(() => {
      setGenerating(false);
      alert("AI Planner successfully recalculated your schedule based on your recent quiz outcomes!");
    }, 1200);
  };

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Study Planner</span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            disabled={generating}
            onClick={handleReplan}
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: "6px 14px", borderRadius: 999 }}
          >
            {generating ? "Recalculating…" : "⚡ Replan with AI"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              Today&apos;s Study Schedule
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Focus on uncompleted high-yield chapters. Tick off each block when done.
            </p>
          </div>
          <Link
            href="/planner-onboarding"
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            Edit exam goals ⚙
          </Link>
        </div>

        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
          {tasks.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: 14 }}>
              No study tasks yet. Complete onboarding to generate your personalized plan.
              <div style={{ marginTop: 12 }}>
                <Link href="/planner-onboarding" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                  Set up planner
                </Link>
              </div>
            </div>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                cursor: "pointer",
                opacity: task.done ? 0.6 : 1,
                transition: "opacity 0.2s, border-color 0.2s",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${task.done ? "var(--accent)" : "var(--border-strong)"}`,
                  background: task.done ? "var(--accent)" : "transparent",
                  color: "#000",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {task.done ? "✓" : ""}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: "var(--bg-elevated)",
                      padding: "2px 8px",
                      borderRadius: 999,
                      color: "var(--text-muted)",
                    }}
                  >
                    {task.subject}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    ⏱ {task.duration}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    textDecoration: task.done ? "line-through" : "none",
                  }}
                >
                  {task.topic}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Progress Bar */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Weekly Syllabus Target</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              {tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0}% Completed
            </span>
          </div>
          <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0}%`, background: "var(--accent)", borderRadius: 999 }} />
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            You are on track for your January exam deadline. Completing today&apos;s physics module will keep you ahead of schedule.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
