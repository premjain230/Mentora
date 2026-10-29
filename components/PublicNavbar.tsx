"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicNavbar() {
  const pathname = usePathname();
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <>
      <header className="nav-wrap">
        <div className="wrap nav">
          <Link href="/" className="nav-brand">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied logo"
              width={32}
              height={32}
            />
            <span className="nav-brand-title">Learning Allied</span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            <Link href="/jee-preparation" className="nav-link" aria-current={pathname === "/jee-preparation" ? "page" : undefined}>JEE</Link>
            <Link href="/neet-preparation" className="nav-link" aria-current={pathname === "/neet-preparation" ? "page" : undefined}>NEET</Link>
            <Link href="/cbse-board" className="nav-link" aria-current={pathname === "/cbse-board" ? "page" : undefined}>CBSE</Link>
            <Link href="/maharashtra-board" className="nav-link" aria-current={pathname === "/maharashtra-board" ? "page" : undefined}>Maharashtra</Link>
            <Link href="/about" className="nav-link" aria-current={pathname === "/about" ? "page" : undefined}>About</Link>
            <Link href="/founder" className="nav-link" aria-current={pathname === "/founder" ? "page" : undefined}>Founder</Link>
            <Link href="/blog/how-to-make-a-jee-study-plan" className="nav-link" aria-current={pathname?.startsWith("/blog") ? "page" : undefined}>Blog</Link>
          </nav>

          <div className="nav-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <Link href="/login" className="btn btn-secondary">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Start free
            </Link>
            <button
              type="button"
              className="mnav-btn"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mnav-overlay ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside className={`mnav-panel ${mobileMenuOpen ? "open" : ""}`} aria-label="Mobile navigation">
        <div className="mnav-head">
          <Link href="/" className="mnav-brand" onClick={() => setMobileMenuOpen(false)}>
            <img src="/learningallied-white.svg" alt="" width={26} height={26} />
            <span>Learning Allied</span>
          </Link>
          <button
            type="button"
            className="mnav-close"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="mnav-links">
          <div className="mnav-label">Exams &amp; Boards</div>
          <Link href="/jee-preparation" onClick={() => setMobileMenuOpen(false)}>JEE Main &amp; Advanced</Link>
          <Link href="/neet-preparation" onClick={() => setMobileMenuOpen(false)}>NEET UG Medical</Link>
          <Link href="/cbse-board" onClick={() => setMobileMenuOpen(false)}>CBSE Class 9–12</Link>
          <Link href="/maharashtra-board" onClick={() => setMobileMenuOpen(false)}>Maharashtra Board</Link>
          <div className="mnav-label">Company &amp; Resources</div>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
          <Link href="/founder" onClick={() => setMobileMenuOpen(false)}>Founder</Link>
          <Link href="/blog/how-to-make-a-jee-study-plan" onClick={() => setMobileMenuOpen(false)}>JEE Study Plan Guide</Link>
          <Link href="/signup" className="mnav-cta" onClick={() => setMobileMenuOpen(false)}>Start learning free</Link>
          <Link href="/login" className="mnav-ghost" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
        </nav>
      </aside>
    </>
  );
}