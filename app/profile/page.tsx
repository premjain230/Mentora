"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthContext";
import { initFirebase } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ProfilePage() {
  const { user, userData, isPro, refreshUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = userData?.displayName || userData?.name || user?.displayName;
    if (saved) {
      setDisplayName(saved);
      return;
    }
    // Derive a sensible initial display name from the email address.
    if (user?.email) {
      const local = user.email.split("@")[0] || "";
      const derived = local
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
      setDisplayName(derived || "Student");
    }
  }, [userData, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { db } = await initFirebase();
      if (db) {
        await setDoc(
          doc(db, "users", user.uid),
          { uid: user.uid, displayName: displayName.trim(), email: user.email || "" },
          { merge: true }
        );
        await refreshUserData();
        setEditing(false);
      }
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setSaving(false);
    }
  };

  const nameInitial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <AppShell>
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Student Profile</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "36px 32px",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: isPro ? "2px solid var(--accent)" : "1px solid var(--border)",
                display: "grid",
                placeItems: "center",
                fontSize: 24,
                fontWeight: 800,
                color: isPro ? "var(--accent)" : "var(--text-primary)",
              }}
            >
              {nameInitial}
            </div>

            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {displayName || "Student"}
              </h1>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {user?.email || "No email available"}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: isPro ? "rgba(255,138,31,0.12)" : "var(--bg-elevated)",
                    color: isPro ? "var(--accent)" : "var(--text-muted)",
                    padding: "3px 10px",
                    borderRadius: 999,
                    border: `1px solid ${isPro ? "rgba(255,138,31,0.3)" : "var(--border)"}`,
                  }}
                >
                  {isPro ? "★ Pro Member" : "Free Plan"}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted)" }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!editing}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  background: editing ? "var(--bg-input)" : "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn btn-secondary"
                  style={{ padding: "10px 20px" }}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ padding: "10px 20px" }}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn btn-secondary"
                    style={{ padding: "10px 20px" }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
