"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, userData, isPro, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navKey = pathname?.split("/").filter(Boolean).pop() || "home";

  const displayName =
    userData?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Student");

  const avatarInitial = (displayName.charAt(0) || "U").toUpperCase();
  const planLabel = isPro ? "Pro Member" : "Free Plan";

  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        id="sidebarOverlay"
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        id="sidebar"
        aria-label="Main navigation"
      >
        <div className="logo-area">
          <Link href="/" className="logo">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied"
              className="logo-img"
              style={{ height: 34, width: 34 }}
            />
            <span className="logo-text">Learning Allied</span>
          </Link>
          <button
            className="sidebar-close"
            id="sidebarClose"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav className="nav-section" id="navSection">
          <div className="nav-label">
            <span>Study</span>
          </div>

          <Link
            href="/home"
            data-nav="home"
            className={`nav-item ${navKey === "home" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9v10.5a1.5 1.5 0 0 0 1.5 1.5H10v-6h4v6h3.5a1.5 1.5 0 0 0 1.5-1.5V9" />
              </svg>
            </span>
            <span className="nav-text">Home</span>
            <span className="nav-badge" id="reviewBadge" />
          </Link>

          <Link
            href="/chat"
            data-nav="chat"
            className={`nav-item ${navKey === "chat" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.3A8.5 8.5 0 1 1 20.5 12z" />
                <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.4" />
              </svg>
            </span>
            <span className="nav-text">Chat</span>
          </Link>

          <Link
            href="/study-session"
            data-nav="study-session"
            className={`nav-item ${navKey === "study-session" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="13.5" r="7.5" />
                <path d="M12 9.5v4l2.6 1.6" />
                <path d="M9.5 2.5h5M12 2.5v3.5" />
              </svg>
            </span>
            <span className="nav-text">Study Session</span>
            <span className="nav-badge">New</span>
          </Link>

          <Link
            href="/planner"
            data-nav="planner"
            className={`nav-item ${navKey === "planner" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" />
                <path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" />
                <path d="m9 15 2 2 4-4" />
              </svg>
            </span>
            <span className="nav-text">Study Planner</span>
          </Link>

          <Link
            href="/learning-hub"
            data-nav="learning-hub"
            className={`nav-item ${navKey === "learning-hub" ? "active" : ""}`}
            aria-label="AI Learning Hub — learn a topic and explain it back"
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 9.5 12 5l10 4.5L12 14 2 9.5z" />
                <path d="M6 11.7V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.3" />
                <path d="M22 9.5V15" />
              </svg>
            </span>
            <span className="nav-text">Learning Hub</span>
            <span className="nav-badge">New</span>
          </Link>

          <Link
            href="/arena"
            data-nav="arena"
            className={`nav-item ${navKey === "arena" ? "active" : ""}`}
            aria-label="Arena — Conquer your syllabus"
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4l11 11M12.5 17.5l5-5M16 16l3.5 3.5" />
                <path d="M20 4 9 15M11.5 17.5l-5-5M8 16l-3.5 3.5" />
              </svg>
            </span>
            <span className="nav-text">Arena</span>
          </Link>

          <div className="nav-label">
            <span>Account</span>
          </div>

          <Link
            href="/profile"
            data-nav="profile"
            className={`nav-item ${navKey === "profile" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
              </svg>
            </span>
            <span className="nav-text">Profile</span>
          </Link>

          <Link
            href="/settings"
            data-nav="settings"
            className={`nav-item ${navKey === "settings" ? "active" : ""}`}
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
                <circle cx="15" cy="7" r="2.5" />
                <circle cx="9" cy="17" r="2.5" />
              </svg>
            </span>
            <span className="nav-text">Settings</span>
          </Link>

          <Link
            href="/subscription"
            data-nav="subscription"
            className="upgrade-nav-btn"
          >
            <span className="nav-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8.5 7.6 12 12 5l4.4 7L21 8.5 19.2 19H4.8L3 8.5z" />
              </svg>
            </span>
            <span className="upgrade-text">
              <span className="upgrade-title">Subscription</span>
              <span className="upgrade-sub">
                {isPro ? "Manage plan" : "Unlock everything"}
              </span>
            </span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div
              className={`avatar ${isPro ? "pro-avatar" : ""}`}
              id="userAvatar"
              style={
                isPro
                  ? {
                      boxShadow: "0 0 0 2px #ff8a1f, 0 0 12px rgba(255,138,31,0.4)",
                    }
                  : undefined
              }
            >
              {avatarInitial}
            </div>
            <div className="user-info">
              <div className="user-name" id="userName">
                {displayName}
              </div>
              <div
                className="user-plan"
                id="userPlan"
                style={isPro ? { color: "#ff8a1f", fontWeight: 600 } : undefined}
              >
                {planLabel}
              </div>
            </div>
            <button
              className="sign-out-btn"
              id="signOutBtn"
              type="button"
              aria-label="Sign out"
              onClick={signOut}
              title="Sign out"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
