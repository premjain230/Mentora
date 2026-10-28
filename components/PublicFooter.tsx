import React from "react";
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="footer-wrap" style={{ borderTop: "1px solid var(--la-line, rgba(255,255,255,0.09))", padding: "64px 0 32px", marginTop: 80, background: "var(--la-surface, #111113)" }}>
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, marginBottom: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <img src="/learningallied-white.svg" alt="Learning Allied" width={28} height={28} />
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--la-text)" }}>Learning Allied</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6, maxWidth: 280 }}>
            AI study partner for Indian students preparing for JEE, NEET and Board exams.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>Exams & Boards</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <li><Link href="/jee-preparation" style={{ color: "var(--la-muted, #a1a1aa)" }}>JEE Main & Advanced</Link></li>
            <li><Link href="/neet-preparation" style={{ color: "var(--la-muted, #a1a1aa)" }}>NEET UG Medical</Link></li>
            <li><Link href="/cbse-board" style={{ color: "var(--la-muted, #a1a1aa)" }}>CBSE Class 9–12</Link></li>
            <li><Link href="/maharashtra-board" style={{ color: "var(--la-muted, #a1a1aa)" }}>Maharashtra State Board</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>Company & Resources</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <li><Link href="/about" style={{ color: "var(--la-muted, #a1a1aa)" }}>About Us</Link></li>
            <li><Link href="/founder" style={{ color: "var(--la-muted, #a1a1aa)" }}>Founder Story</Link></li>
            <li><Link href="/blog/how-to-make-a-jee-study-plan" style={{ color: "var(--la-muted, #a1a1aa)" }}>JEE Study Plan Guide</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>Account & App</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <li><Link href="/login" style={{ color: "var(--la-muted, #a1a1aa)" }}>Student Login</Link></li>
            <li><Link href="/signup" style={{ color: "var(--la-muted, #a1a1aa)" }}>Create Free Account</Link></li>
            <li><Link href="/home" style={{ color: "var(--la-muted, #a1a1aa)" }}>Learning Dashboard</Link></li>
            <li><Link href="/subscription" style={{ color: "var(--la-muted, #a1a1aa)" }}>Pro Membership</Link></li>
          </ul>
        </div>
      </div>

      <div className="wrap" style={{ borderTop: "1px solid var(--la-line, rgba(255,255,255,0.09))", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--la-faint, #71717a)" }}>
        <div>© 2026 Learning Allied. Built by Prem Jain for ambitious students.</div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="https://x.com/itzprem109" target="_blank" rel="noopener noreferrer" style={{ color: "var(--la-muted)" }}>X (Twitter)</a>
          <a href="https://github.com/premjain230/Mentora" target="_blank" rel="noopener noreferrer" style={{ color: "var(--la-muted)" }}>GitHub</a>
          <a href="https://discord.gg/vDvrJhUzud" target="_blank" rel="noopener noreferrer" style={{ color: "var(--la-muted)" }}>Discord</a>
        </div>
      </div>
    </footer>
  );
}
