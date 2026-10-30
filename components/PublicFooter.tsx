import React from "react";
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-row">
              <img src="/learningallied-white.svg" alt="" width={26} height={26} />
              <span>Learning Allied</span>
            </div>
            <p className="footer-blurb">
              AI study partner for Indian students preparing for JEE, NEET and
              Board exams.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Exams &amp; boards</h4>
            <ul className="footer-links">
              <li><Link href="/jee-preparation">JEE Main &amp; Advanced</Link></li>
              <li><Link href="/neet-preparation">NEET UG Medical</Link></li>
              <li><Link href="/cbse-board">CBSE Class 9–12</Link></li>
              <li><Link href="/maharashtra-board">Maharashtra State Board</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links">
              <li><Link href="/about">About us</Link></li>
              <li><Link href="/founder">Founder story</Link></li>
              <li><Link href="/blog/how-to-make-a-jee-study-plan">JEE study plan guide</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Account</h4>
            <ul className="footer-links">
              <li><Link href="/login">Student login</Link></li>
              <li><Link href="/signup">Create free account</Link></li>
              <li><Link href="/home">Learning dashboard</Link></li>
              <li><Link href="/subscription">Pro membership</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 Learning Allied. Built by Prem Jain for ambitious students.</div>
          <div className="footer-social">
            <a href="https://x.com/itzprem109" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
            <a href="https://github.com/premjain230/Mentora" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://discord.gg/vDvrJhUzud" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
