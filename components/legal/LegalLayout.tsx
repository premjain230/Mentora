"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export interface TocItem {
  id: string;
  num: string;
  title: string;
}

interface LegalLayoutProps {
  toc: TocItem[];
  currentDoc: "privacy" | "terms";
  children: React.ReactNode;
}

export function LegalLayout({ toc, currentDoc, children }: LegalLayoutProps) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;

      for (let i = toc.length - 1; i >= 0; i--) {
        const el = document.getElementById(toc[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(toc[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  const handleLinkClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
      setActiveId(id);
      setMobileOpen(false);
    }
  };

  const activeItem = toc.find((item) => item.id === activeId) || toc[0];

  return (
    <div className="wrap">
      {/* Mobile Table of Contents */}
      <div className="legal-mobile-toc-container">
        <details
          className="legal-mobile-toc-details"
          open={mobileOpen}
          onToggle={(e) => setMobileOpen(e.currentTarget.open)}
        >
          <summary className="legal-mobile-toc-summary">
            <span>
              On this page: <strong>{activeItem ? `${activeItem.num} ${activeItem.title}` : "Sections"}</strong>
            </span>
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
              style={{ transform: mobileOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <ul className="legal-mobile-toc-list">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleLinkClick(item.id, e)}
                  style={{
                    fontWeight: activeId === item.id ? 700 : 400,
                    color: activeId === item.id ? "var(--la-text)" : undefined,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", opacity: 0.7 }}>
                    {item.num}
                  </span>
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="legal-grid-layout">
        {/* Desktop Sticky Table of Contents */}
        <aside className="legal-toc-wrapper" aria-label="Table of contents">
          <div className="legal-toc-card">
            <div className="legal-toc-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Table of Contents</span>
            </div>

            <nav>
              <ul className="legal-toc-nav">
                {toc.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => handleLinkClick(item.id, e)}
                        className={`legal-toc-link ${isActive ? "active" : ""}`}
                        aria-current={isActive ? "location" : undefined}
                      >
                        <span className="legal-toc-num">{item.num}</span>
                        <span>{item.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="legal-toc-aside-box">
              <strong>Need guidance?</strong>
              <p style={{ margin: "4px 0 8px" }}>
                Reach out to our privacy &amp; governance team anytime.
              </p>
              <a href="mailto:hello@learningallied.com">hello@learningallied.com</a>
            </div>
          </div>
        </aside>

        {/* Legal Document Content */}
        <div className="legal-content-wrap">
          {children}

          {/* Crosslink to the other legal document */}
          <div className="legal-crosslink-card">
            <div className="legal-crosslink-copy">
              <h3>
                {currentDoc === "privacy"
                  ? "Looking for our Terms of Use?"
                  : "Looking for our Privacy Policy?"}
              </h3>
              <p>
                {currentDoc === "privacy"
                  ? "Understand your rights, account eligibility, acceptable use, and our educational service standards."
                  : "Discover how we protect student privacy, adhere to India's DPDP Act 2023, and handle your data."}
              </p>
            </div>
            <Link
              href={currentDoc === "privacy" ? "/terms-of-use" : "/privacy-policy"}
              className="legal-crosslink-btn"
            >
              <span>{currentDoc === "privacy" ? "Read Terms of Use" : "Read Privacy Policy"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
