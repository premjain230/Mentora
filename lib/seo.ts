import { Metadata } from "next";

export const SITE_URL = "https://www.learningallied.world";

export interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImage?: string;
  type?: "website" | "article";
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
}

export function constructMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogImage = `${SITE_URL}/learningallied-white.svg`,
  type = "website",
  keywords,
  publishedTime,
  modifiedTime,
}: PageSeoProps): Metadata {
  const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`}`;

  const defaultKeywords = [
    "best study tools",
    "best ai study tools",
    "top study websites",
    "ai study assistant",
    "best learning platforms for students",
    "ai tools for students in india",
    "cbse study tools",
    "maharashtra board study tools",
    "jee preparation ai",
    "neet preparation ai",
    "learning allied",
    "chatgpt alternatives for studying",
  ];

  return {
    title: {
      default: title,
      template: "%s | Learning Allied",
    },
    description,
    keywords: keywords || defaultKeywords,
    authors: [{ name: "Prem Jain", url: `${SITE_URL}/founder` }],
    creator: "Prem Jain",
    publisher: "Learning Allied",
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-IN": canonicalUrl,
        "en": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Learning Allied",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} - Learning Allied`,
        },
      ],
      locale: "en_IN",
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@itzprem109",
      site: "@itzprem109",
    },
  };
}

export const createSEOMetadata = constructMetadata;

export const SHARED_JSONLD_GRAPH = {
  organization: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Learning Allied",
    legalName: "Learning Allied Technologies",
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE_URL}/#logo`,
      url: `${SITE_URL}/learningallied-white.svg`,
      contentUrl: `${SITE_URL}/learningallied-white.svg`,
      caption: "Learning Allied Logo",
    },
    description:
      "Learning Allied is an AI study partner and adaptive learning platform for students preparing for JEE Main & Advanced, NEET UG, CBSE, and Maharashtra State Board exams.",
    founder: { "@id": `${SITE_URL}/founder#person` },
    foundingDate: "2024",
    areaServed: ["IN", "Worldwide"],
    sameAs: [
      "https://youtube.com/@learningalliedoffical?si=x677FCu-oWGE0aEY",
      "https://discord.gg/vDvrJhUzud",
      "https://teenfounders.in/user/learningallied",
      "https://www.linkedin.com/in/prem-jain-603173426/",
      "https://github.com/premjain230/Mentora",
    ],
  },
  founder: {
    "@type": "Person",
    "@id": `${SITE_URL}/founder#person`,
    name: "Prem Jain",
    url: `${SITE_URL}/founder`,
    jobTitle: "Founder & Lead Architect",
    worksFor: { "@id": `${SITE_URL}/#organization` },
    sameAs: [
      "https://youtube.com/@learningalliedoffical?si=x677FCu-oWGE0aEY",
      "https://www.linkedin.com/in/prem-jain-603173426/",
      "https://github.com/premjain230",
    ],
  },
  website: {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Learning Allied",
    url: `${SITE_URL}/`,
    description:
      "AI study partner for JEE, NEET, CBSE, and Maharashtra Board students featuring Socratic tutoring, active recall, and spaced revision.",
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/learning-hub?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
  softwareApplication: {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#application`,
    name: "Learning Allied AI Study Assistant",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android",
    url: `${SITE_URL}/`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      category: "Free / Freemium",
    },
    featureList: [
      "Socratic AI Tutoring (Guided derivations rather than answer dumps)",
      "Prerequisite Knowledge Graph for diagnosing underlying conceptual gaps",
      "Active Recall practice quizzes mapped to NCERT and State Board syllabus",
      "Spaced Repetition retention engine calibrated to Ebbinghaus neural decay",
      "JEE Main & Advanced, NEET UG, CBSE Class 9-12, Maharashtra SSC & HSC coverage",
    ],
  },
};

/**
 * Generate BreadcrumbList Schema JSON-LD
 */
export function createBreadcrumbsJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http") ? item.path : `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Generate FAQPage Schema JSON-LD
 */
export function createFaqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/**
 * Generate Article Schema JSON-LD
 */
export function createArticleJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  ogImage = `${SITE_URL}/learningallied-white.svg`,
  authorName = "Prem Jain",
  authorUrl = `${SITE_URL}/founder`,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  ogImage?: string;
  authorName?: string;
  authorUrl?: string;
}) {
  const url = `${SITE_URL}${path}`;
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    inLanguage: "en-IN",
    datePublished,
    dateModified: dateModified || datePublished,
    image: ogImage,
    author: {
      "@type": "Person",
      name: authorName,
      url: authorUrl,
    },
    publisher: SHARED_JSONLD_GRAPH.organization,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}
