"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";

export function UpgradeModal() {
  const { isPro } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    sub: string;
    used: number;
    limit: number | string;
    name: string;
    pct: number;
  }>({
    title: "Daily chat limit reached",
    sub: "You've used all 20 free AI chats today. Upgrade to Learning Allied Pro for unlimited conversations.",
    used: 20,
    limit: 20,
    name: "AI Chats",
    pct: 100,
  });

  useEffect(() => {
    // Listen for custom trigger event
    const handleTrigger = (e: any) => {
      if (isPro) return; // Pro users never see the modal
      const detail = e.detail || {};
      const type = detail.type || "chat";
      const used = detail.used ?? 20;
      const limit = detail.limit ?? 20;
      const pct = limit === Infinity ? 100 : Math.min(100, Math.round((used / limit) * 100));

      const labels: Record<string, { name: string; title: string; sub: string }> = {
        chat: {
          name: "AI Chats",
          title: "Daily chat limit reached",
          sub: "You've used all 20 free AI chats today. Upgrade to Learning Allied Pro for unlimited conversations.",
        },
        analysis: {
          name: "AI Analyses",
          title: "Daily analysis limit reached",
          sub: "You've used all 20 free AI analyses today. Upgrade for unlimited quiz analysis.",
        },
        planner: {
          name: "Planner Time",
          title: "Daily planner limit reached",
          sub: "You've used your 30 minutes of free Study Planner time today. Upgrade for unlimited planning.",
        },
      };

      const info = labels[type] || labels.chat;
      setModalData({
        title: info.title,
        sub: info.sub,
        used,
        limit: limit === Infinity ? "∞" : limit,
        name: info.name,
        pct,
      });
      setIsOpen(true);
    };

    window.addEventListener("show-upgrade-modal", handleTrigger);
    return () => window.removeEventListener("show-upgrade-modal", handleTrigger);
  }, [isPro]);

  if (isPro || !isOpen) return null;

  return (
    <div
      id="aquilaUpgradeModal"
      className="aum-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="aum-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aumTitle"
      >
        <button
          className="aum-close"
          type="button"
          aria-label="Close upgrade dialog"
          onClick={() => setIsOpen(false)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="aum-badge">
          <span className="aum-badge-star">★</span>
          <span>Learning Allied Pro</span>
        </div>

        <h3 id="aumTitle" className="aum-title">
          {modalData.title}
        </h3>

        <p id="aumSubtitle" className="aum-subtitle">
          {modalData.sub}
        </p>

        <div id="aumLimitBar" className="aum-limit-card">
          <div className="aum-limit-header">
            <span className="aum-limit-name">{modalData.name} used today</span>
            <span className="aum-limit-count">
              {modalData.used} / {modalData.limit}
            </span>
          </div>
          <div className="aum-progress-track">
            <div
              className="aum-progress-fill"
              style={{ width: `${modalData.pct}%` }}
            />
          </div>
        </div>

        <div className="aum-features">
          <div className="aum-feature-item">
            <span className="aum-check">✓</span>
            <span>Unlimited AI Socratic tutor chats without daily caps</span>
          </div>
          <div className="aum-feature-item">
            <span className="aum-check">✓</span>
            <span>Deep adaptive analysis and step-by-step problem solver</span>
          </div>
          <div className="aum-feature-item">
            <span className="aum-check">✓</span>
            <span>Full syllabus coverage across JEE, NEET, CBSE &amp; Boards</span>
          </div>
        </div>

        <div className="aum-action-wrap">
          <Link
            href="/subscription"
            className="aum-cta-btn"
            onClick={() => setIsOpen(false)}
          >
            Upgrade to Pro — Unlimited Access
          </Link>
          <p className="aum-cancel-note">Cancel anytime. Instant activation.</p>
        </div>
      </div>

      <style jsx>{`
        .aum-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(5, 7, 12, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 20px;
          animation: aumFadeIn 0.2s ease-out;
        }

        :global(.light-mode) .aum-backdrop {
          background: rgba(15, 23, 42, 0.45);
        }

        @keyframes aumFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .aum-card {
          background: var(--bg-card, #0f1420);
          border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
          border-radius: 24px;
          padding: 36px 32px 32px;
          max-width: 460px;
          width: 100%;
          position: relative;
          box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.6);
          animation: aumSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }

        :global(.light-mode) .aum-card {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.15);
        }

        @keyframes aumSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .aum-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-elevated, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.09));
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.15s ease;
        }

        :global(.light-mode) .aum-close {
          background: #f1f5f9;
          border-color: rgba(0, 0, 0, 0.08);
          color: #64748b;
        }

        .aum-close:hover {
          color: var(--text-primary, #f8fafc);
          border-color: var(--border-hover, rgba(255, 255, 255, 0.25));
        }

        .aum-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: var(--accent, #3b82f6);
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 16px;
        }

        .aum-badge-star {
          font-size: 12px;
        }

        .aum-title {
          font-family: var(--font-display, "Space Grotesk", sans-serif);
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary, #f8fafc);
          margin: 0 0 8px 0;
          line-height: 1.25;
        }

        :global(.light-mode) .aum-title {
          color: #0f172a;
        }

        .aum-subtitle {
          font-size: 14px;
          color: var(--text-secondary, #94a3b8);
          line-height: 1.55;
          margin: 0 0 20px 0;
        }

        .aum-limit-card {
          background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }

        :global(.light-mode) .aum-limit-card {
          background: #f8fafc;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .aum-limit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .aum-limit-name {
          font-size: 13px;
          color: var(--text-primary, #f8fafc);
          font-weight: 600;
        }

        :global(.light-mode) .aum-limit-name {
          color: #0f172a;
        }

        .aum-limit-count {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent, #3b82f6);
        }

        .aum-progress-track {
          height: 6px;
          background: var(--border-strong, rgba(255, 255, 255, 0.1));
          border-radius: 999px;
          overflow: hidden;
        }

        :global(.light-mode) .aum-progress-track {
          background: rgba(0, 0, 0, 0.08);
        }

        .aum-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 0.4s ease;
        }

        .aum-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .aum-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-secondary, #94a3b8);
        }

        .aum-check {
          color: #10b981;
          font-weight: 700;
          font-size: 14px;
        }

        .aum-action-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .aum-cta-btn {
          width: 100%;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          border-radius: 12px;
          background: var(--accent, #3b82f6);
          color: #ffffff;
          box-shadow: 0 4px 18px rgba(59, 130, 246, 0.35);
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: -0.01em;
          transition: all 0.16s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .aum-cta-btn:hover {
          background: var(--accent-strong, #60a5fa);
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(59, 130, 246, 0.45);
        }

        .aum-cancel-note {
          font-size: 12px;
          color: var(--text-muted, #64748b);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
