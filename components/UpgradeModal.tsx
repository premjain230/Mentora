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
      className="open"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5, 6, 12, 0.82)",
        backdropFilter: "blur(10px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="aum-card"
        style={{
          background: "#0f1117",
          border: "1px solid rgba(255, 138, 31, 0.25)",
          borderRadius: "20px",
          padding: "36px 32px 32px",
          maxWidth: "440px",
          width: "calc(100% - 32px)",
          position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        <button
          className="aum-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#8b8fa8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        <div
          className="aum-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(255, 138, 31, 0.12)",
            border: "1px solid rgba(255, 138, 31, 0.3)",
            color: "#ff8a1f",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          ★ Pro Plan
        </div>

        <h3
          id="aumTitle"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#f0f0f8",
            marginBottom: 8,
          }}
        >
          {modalData.title}
        </h3>

        <p
          id="aumSubtitle"
          style={{
            fontSize: 13.5,
            color: "#8b8fa8",
            lineHeight: 1.6,
            marginBottom: 22,
          }}
        >
          {modalData.sub}
        </p>

        <div
          id="aumLimitBar"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#8b8fa8",
              marginBottom: 8,
            }}
          >
            Your usage today
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 13, color: "#f0f0f8", fontWeight: 500 }}>
              {modalData.name}
            </span>
            <span style={{ fontSize: 12, color: "#ff8a1f" }}>
              {modalData.used} / {modalData.limit}
            </span>
          </div>
          <div
            style={{
              height: 5,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 10,
                background: "linear-gradient(90deg, #ff8a1f, #ffa14d)",
                width: `${modalData.pct}%`,
                transition: "width 0.4s",
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Link
            href="/subscription"
            className="btn btn-primary btn-lg"
            style={{
              width: "100%",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 20px",
              borderRadius: 12,
              background: "#ff8a1f",
              color: "#0a0a0b",
              fontWeight: 700,
            }}
            onClick={() => setIsOpen(false)}
          >
            Upgrade to Pro — Unlimited Access
          </Link>
        </div>
      </div>
    </div>
  );
}
