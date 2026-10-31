import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.learningallied.world"),
  title: {
    default: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
    template: "%s | Learning Allied",
  },
  description:
    "Learning Allied is an AI study partner for Indian students preparing for JEE, NEET and Board exams. AI tutor, spaced review, active recall, chapter-wise practice quizzes and personalized study plans.",
  authors: [{ name: "Prem Jain", url: "https://www.learningallied.world/founder" }],
  creator: "Prem Jain",
  publisher: "Learning Allied",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/learningallied-white.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <meta
          name="theme-color"
          content="#0a0a0b"
          media="(prefers-color-scheme: dark)"
        />
        <meta
          name="theme-color"
          content="#fafaf9"
          media="(prefers-color-scheme: light)"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('learning-allied-theme')||localStorage.getItem('aquila-theme');if(v==='dark'){document.documentElement.classList.remove('light-mode');}else{document.documentElement.classList.add('light-mode');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
