"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("learning-allied-theme");
      if (stored === "light") {
        setTheme("light");
        document.documentElement.classList.add("light-mode");
      } else {
        setTheme("dark");
        document.documentElement.classList.remove("light-mode");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("learning-allied-theme", nextTheme);
      if (nextTheme === "light") {
        document.documentElement.classList.add("light-mode");
      } else {
        document.documentElement.classList.remove("light-mode");
      }
    } catch {}
  };

  return (
    <header className="nav-wrap" style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <div className="wrap nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        <Link href="/" className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img
            src="/learningallied-white.svg"
            alt="Learning Allied logo"
            width={34}
            height={34}
            style={{ borderRadius: 8 }}
          />
          <span className="nav-brand-title" style={{ fontWeight: 700, fontSize: 18, color: "var(--la-text)" }}>
            Learning Allied
          </span>
        </Link>

        <nav className="nav-links" style={{ display: "flex", gap: 20 }}>
          <Link href="/jee-preparation" className="nav-link">JEE</Link>
          <Link href="/neet-preparation" className="nav-link">NEET</Link>
          <Link href="/cbse-board" className="nav-link">CBSE</Link>
          <Link href="/maharashtra-board" className="nav-link">Maharashtra</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/founder" className="nav-link">Founder</Link>
          <Link href="/blog/how-to-make-a-jee-study-plan" className="nav-link">Blog</Link>
        </nav>

        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
            type="button"
            style={{
              background: "transparent",
              border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
              borderRadius: 8,
              padding: "8px 10px",
              cursor: "pointer",
              color: "var(--la-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>
          <Link href="/login" className="btn btn-secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
