"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="nav-wrap">
        <div className="wrap nav">
          <Link href="/" className="nav-brand">
            <img
              src="/learningallied-white.svg"
              alt="Learning Allied logo"
              className="logo-for-dark"
              width={30}
              height={30}
            />
            <img
              src="/learningallied-black.svg"
              alt="Learning Allied logo"
              className="logo-for-light"
              width={30}
              height={30}
            />
            <span className="nav-brand-title">Learning Allied</span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            <Link href="/#curricula" className="nav-link">Curricula</Link>
            <Link href="/how-it-works" className="nav-link" aria-current={pathname === "/how-it-works" ? "page" : undefined}>How It Works</Link>
            <Link href="/best-ai-study-tools" className="nav-link" aria-current={pathname === "/best-ai-study-tools" ? "page" : undefined}>AI Tools</Link>
            <Link href="/for-parents" className="nav-link" aria-current={pathname === "/for-parents" ? "page" : undefined}>For Parents</Link>
            <Link href="/blog" className="nav-link" aria-current={pathname?.startsWith("/blog") ? "page" : undefined}>Blog</Link>
            <Link href="/about" className="nav-link" aria-current={pathname === "/about" ? "page" : undefined}>About</Link>
          </nav>

          <div className="nav-actions">
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
            <img src="/learningallied-white.svg" alt="" className="logo-for-dark" width={26} height={26} />
            <img src="/learningallied-black.svg" alt="" className="logo-for-light" width={26} height={26} />
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
          <div className="mnav-label">Global Curricula</div>
          <Link href="/#curricula" onClick={() => setMobileMenuOpen(false)}>All Curricula (15+ Countries)</Link>
          <Link href="/for-parents" onClick={() => setMobileMenuOpen(false)}>For Parents &amp; Guardians</Link>
          <div className="mnav-label">AI Study Guides</div>
          <Link href="/best-ai-study-tools" onClick={() => setMobileMenuOpen(false)}>Best AI Study Tools</Link>
          <Link href="/learning-allied-vs-chatgpt" onClick={() => setMobileMenuOpen(false)}>Learning Allied vs ChatGPT</Link>
          <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</Link>
          <div className="mnav-label">Company &amp; Resources</div>
          <Link href="/blog" onClick={() => setMobileMenuOpen(false)}>Educational Blog</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
          <Link href="/founder" onClick={() => setMobileMenuOpen(false)}>Founder Story</Link>
          <Link href="/signup" className="mnav-cta" onClick={() => setMobileMenuOpen(false)}>Start learning free</Link>
          <Link href="/login" className="mnav-ghost" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
        </nav>
      </aside>
    </>
  );
}
