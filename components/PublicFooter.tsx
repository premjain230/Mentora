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
              Board exams with Socratic cognitive scaffolding and spaced retention.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Exams &amp; boards</h4>
            <ul className="footer-links">
              <li><Link href="/jee-preparation">JEE Main &amp; Advanced</Link></li>
              <li><Link href="/neet-preparation">NEET UG Medical</Link></li>
              <li><Link href="/cbse-board">CBSE Class 9–12</Link></li>
              <li><Link href="/maharashtra-board">Maharashtra State Board</Link></li>
              <li><Link href="/study-tools-cbse">CBSE Study Tools</Link></li>
              <li><Link href="/study-tools-maharashtra-board">Maharashtra Board Tools</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">AI Study Guides</h4>
            <ul className="footer-links">
              <li><Link href="/best-ai-study-tools">Best AI Study Tools</Link></li>
              <li><Link href="/best-study-tools">Top Study Platforms</Link></li>
              <li><Link href="/learning-allied-vs-chatgpt">Learning Allied vs ChatGPT</Link></li>
              <li><Link href="/ai-study-tools-india">AI Tools for India</Link></li>
              <li><Link href="/learn-smarter-with-ai">Learn Smarter with AI</Link></li>
              <li><Link href="/ai-study-assistant">AI Study Assistant</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Company &amp; Resources</h4>
            <ul className="footer-links">
              <li><Link href="/about">About us</Link></li>
              <li><Link href="/founder">Founder story</Link></li>
              <li><Link href="/how-it-works">How it works</Link></li>
              <li><Link href="/blog">Educational blog</Link></li>
              <li><Link href="/changelog">Public changelog</Link></li>
              <li><Link href="/press">Press &amp; media kit</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Account &amp; Legal</h4>
            <ul className="footer-links">
              <li><Link href="/login">Student login</Link></li>
              <li><Link href="/signup">Create free account</Link></li>
              <li><Link href="/privacy-policy">Privacy Policy (DPDP)</Link></li>
              <li><Link href="/terms-of-use">Terms of Use</Link></li>
              <li><Link href="/llms.txt">LLMs.txt (Machine Manifest)</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© 2026 Learning Allied. Built by Prem Jain for ambitious students.</div>
          <div className="footer-legal-links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms-of-use">Terms of Use</Link>
            <span aria-hidden="true">·</span>
            <Link href="/llms.txt">llms.txt</Link>
          </div>
          <div className="footer-social">
            <a href="https://youtube.com/@learningalliedoffical?si=x677FCu-oWGE0aEY" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://discord.gg/vDvrJhUzud" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://teenfounders.in/user/learningallied" target="_blank" rel="noopener noreferrer">TeenFounders</a>
            <a href="https://www.linkedin.com/in/prem-jain-603173426/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
