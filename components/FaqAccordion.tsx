"use client";

import React, { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="faq-list" style={{ maxWidth: 760, borderTop: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`faq-item ${isOpen ? "open" : ""}`}
            style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}
          >
            <button
              className="faq-q"
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(idx)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                padding: "22px 0",
                background: "none",
                border: 0,
                color: "var(--la-text)",
                font: "600 16px/1.4 var(--la-font, sans-serif)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span>{item.q}</span>
              <svg
                className="faq-chev"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  color: "var(--la-faint, #71717a)",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform .3s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isOpen && (
              <div
                className="faq-body"
                style={{
                  color: "var(--la-muted, #a1a1aa)",
                  fontSize: 15,
                  paddingBottom: 22,
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
