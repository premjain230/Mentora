"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  title: string;
  desc?: string;
  category: "Navigation" | "Action" | "Curriculum";
  badge?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleTheme = () => {
    const isLight = document.body.classList.contains("light-mode");
    if (isLight) {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    }
  };

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-home",
      title: "Home Dashboard",
      desc: "Daily overview, active streaks, and cognitive metrics",
      category: "Navigation",
      badge: "Dashboard",
      action: () => router.push("/home"),
    },
    {
      id: "nav-chat",
      title: "AI Socratic Tutor",
      desc: "First-principles tutoring, doubt clearance, and derivations",
      category: "Navigation",
      badge: "Study",
      action: () => router.push("/chat"),
    },
    {
      id: "nav-hub",
      title: "Learning Hub (Understand)",
      desc: "15-country interactive concept roadmaps & visual lessons",
      category: "Navigation",
      badge: "Curriculum",
      action: () => router.push("/learning-hub"),
    },
    {
      id: "nav-arena",
      title: "Learning Arena",
      desc: "Gamified syllabus conquest, boss battles & chapter maps",
      category: "Navigation",
      badge: "Mastery",
      action: () => router.push("/arena"),
    },
    {
      id: "nav-study-session",
      title: "Study Session (Focus Desk)",
      desc: "Pomodoro timer, goal tracking & synthesized focus audio",
      category: "Navigation",
      badge: "Timer",
      action: () => router.push("/study-session"),
    },
    {
      id: "nav-planner",
      title: "Study Planner",
      desc: "AI study calendar, exam milestones and daily task list",
      category: "Navigation",
      badge: "Schedule",
      action: () => router.push("/planner"),
    },
    {
      id: "nav-quiz",
      title: "Adaptive Practice Quiz",
      desc: "Curriculum-grounded active recall tests with AI adaptation",
      category: "Navigation",
      badge: "Quiz",
      action: () => router.push("/quiz"),
    },
    {
      id: "nav-review",
      title: "Spaced Review Queue",
      desc: "Ebbinghaus memory decay tracker & retention refreshers",
      category: "Navigation",
      badge: "Memory",
      action: () => router.push("/review"),
    },
    {
      id: "nav-profile",
      title: "Profile & Cognitive Identity",
      desc: "Your learning persona, AI personality and streak records",
      category: "Navigation",
      badge: "Account",
      action: () => router.push("/profile"),
    },
    {
      id: "nav-settings",
      title: "Settings & Preferences",
      desc: "Account details, theme, privacy and notification controls",
      category: "Navigation",
      badge: "Settings",
      action: () => router.push("/settings"),
    },
    // Quick Actions
    {
      id: "action-theme",
      title: "Toggle Light / Dark Theme",
      desc: "Switch between true black and clean Apple light theme",
      category: "Action",
      badge: "Theme",
      action: () => toggleTheme(),
    },
    {
      id: "action-start-session",
      title: "Quick 25-Minute Focus Block",
      desc: "Instantly launch a focused study sprint with ambient sound",
      category: "Action",
      badge: "Focus",
      action: () => router.push("/study-session"),
    },
    {
      id: "action-quick-quiz",
      title: "Test Active Recall (Quick Quiz)",
      desc: "Start a 5-question diagnostic to benchmark topic mastery",
      category: "Action",
      badge: "Practice",
      action: () => router.push("/quiz"),
    },
    // Curricula & Exam Tracks
    {
      id: "exam-jee",
      title: "JEE Main & Advanced Preparation",
      desc: "Rigorous physics, chemistry and advanced calculus syllabus",
      category: "Curriculum",
      badge: "India",
      action: () => router.push("/arena"),
    },
    {
      id: "exam-neet",
      title: "NEET UG Medical Preparation",
      desc: "NCERT biology, chemical equilibrium and optics practice",
      category: "Curriculum",
      badge: "Medical",
      action: () => router.push("/arena"),
    },
    {
      id: "exam-cbse",
      title: "CBSE Classes 9–12",
      desc: "Official NCERT syllabus, exemplar drills and board patterns",
      category: "Curriculum",
      badge: "National",
      action: () => router.push("/learning-hub"),
    },
    {
      id: "exam-global",
      title: "Global International Curricula",
      desc: "US AP & SAT, UK GCSE / A-Levels, IB, Canada, Australia & more",
      category: "Curriculum",
      badge: "15 Countries",
      action: () => router.push("/learning-hub"),
    },
  ];

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.desc?.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.badge?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K or / when not typing in an input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-command-palette", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Handle arrows in search
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command search palette"
    >
      <div
        className="cmd-palette-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmd-palette-header">
          <svg
            className="cmd-palette-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type a command, subject, or feature..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <span className="cmd-palette-kbd">ESC</span>
        </div>

        <div className="cmd-palette-body">
          {filtered.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text-muted)" }}>
              No commands or subjects found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`cmd-palette-item ${idx === selectedIndex ? "active" : ""}`}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-palette-item-left">
                  <div className="cmd-palette-item-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {item.category === "Navigation" && (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="12 8 8 12 12 16 12 8" />
                        </>
                      )}
                      {item.category === "Action" && (
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      )}
                      {item.category === "Curriculum" && (
                        <>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div>
                    <div className="cmd-palette-item-title">{item.title}</div>
                    {item.desc && <div className="cmd-palette-item-desc">{item.desc}</div>}
                  </div>
                </div>
                {item.badge && <span className="cmd-palette-badge">{item.badge}</span>}
              </div>
            ))
          )}
        </div>

        <div className="cmd-palette-footer">
          <div className="cmd-palette-hints">
            <span className="cmd-palette-hint-item">
              <span className="cmd-palette-kbd">↑</span>
              <span className="cmd-palette-kbd">↓</span> Navigate
            </span>
            <span className="cmd-palette-hint-item">
              <span className="cmd-palette-kbd">↵</span> Select
            </span>
          </div>
          <span>Learning Allied AI OS</span>
        </div>
      </div>
    </div>
  );
}
