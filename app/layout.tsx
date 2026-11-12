import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/lib/dom-guard";
import "./globals.css";
import { SHARED_JSONLD_GRAPH, SITE_URL } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
    template: "%s | Learning Allied",
  },
  description:
    "Learning Allied is an AI study partner for Indian students preparing for JEE, NEET and Board exams. Socratic tutoring, active recall, prerequisite mapping, chapter-wise practice quizzes and personalized study plans.",
  keywords: [
    "best study tools",
    "best ai study tools",
    "top 10 study websites",
    "best learning platforms for students",
    "best ai tools for students in india",
    "ai study assistant",
    "chatgpt alternatives for studying",
    "jee preparation ai",
    "neet preparation ai",
    "cbse study tools",
    "maharashtra board study tools",
    "how to study smarter using ai",
    "learning allied",
  ],
  authors: [{ name: "Prem Jain", url: `${SITE_URL}/founder` }],
  creator: "Prem Jain",
  publisher: "Learning Allied",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/learningallied-white.svg",
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-IN": SITE_URL,
      "en": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
    description:
      "Socratic tutoring, active recall, prerequisite mapping and chapter-wise practice quizzes for JEE Main/Advanced, NEET UG, CBSE, and Maharashtra State Board.",
    url: SITE_URL,
    siteName: "Learning Allied",
    images: [
      {
        url: `${SITE_URL}/learningallied-white.svg`,
        width: 1200,
        height: 630,
        alt: "Learning Allied AI Study Platform",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
    description:
      "Socratic tutoring, active recall, prerequisite mapping and chapter-wise practice quizzes for JEE, NEET, and Board exams.",
    images: [`${SITE_URL}/learningallied-white.svg`],
    creator: "@itzprem109",
    site: "@itzprem109",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || "googlea0922a137d66d3af",
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
    },
  },
};

const ROOT_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    SHARED_JSONLD_GRAPH.website,
    SHARED_JSONLD_GRAPH.softwareApplication,
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ROOT_JSON_LD) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('learning-allied-theme')||localStorage.getItem('aquila-theme');if(v==='dark'){document.documentElement.classList.remove('light-mode');}else{document.documentElement.classList.add('light-mode');}}catch(e){}})();(function(){try{if(typeof window!=='undefined'&&window.Node){var p=Node.prototype;if(!p.__react_dom_guard__){p.__react_dom_guard__=true;var rc=p.removeChild;p.removeChild=function(c){if(c&&c.parentNode!==this){return c.parentNode?c.parentNode.removeChild(c):c;}return rc.apply(this,arguments);};var ib=p.insertBefore;p.insertBefore=function(n,r){if(r&&r.parentNode!==this){return r.parentNode?r.parentNode.insertBefore(n,r):this.appendChild(n);}return ib.apply(this,arguments);};var rep=p.replaceChild;p.replaceChild=function(n,o){if(o&&o.parentNode!==this){return o.parentNode?o.parentNode.replaceChild(n,o):this.appendChild(n);}return rep.apply(this,arguments);};}}}catch(e){}})();`,
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
