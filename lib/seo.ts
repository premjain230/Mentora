import { Metadata } from "next";

export const SITE_URL = "https://www.learningallied.world";

export interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImage?: string;
  type?: "website" | "article";
}

export function constructMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogImage = `${SITE_URL}/learningallied-white.svg`,
  type = "website",
}: PageSeoProps): Metadata {
  const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path}`;

  return {
    title: {
      default: title,
      template: "%s | Learning Allied",
    },
    description,
    authors: [{ name: "Prem Jain", url: `${SITE_URL}/founder` }],
    creator: "Prem Jain",
    publisher: "Learning Allied",
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? {
          index: false,
          follow: true,
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@itzprem109",
    },
  };
}

export const createSEOMetadata = constructMetadata;

export const SHARED_JSONLD_GRAPH = {
  organization: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Learning Allied",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/learningallied-white.svg`,
    description: "AI study partner for JEE, NEET and Board exam students.",
    founder: { "@id": `${SITE_URL}/founder#person` },
    sameAs: [
      "https://x.com/itzprem109",
      "https://github.com/premjain230/Mentora",
      "https://discord.gg/vDvrJhUzud",
    ],
  },
  founder: {
    "@type": "Person",
    "@id": `${SITE_URL}/founder#person`,
    name: "Prem Jain",
    url: `${SITE_URL}/founder`,
    jobTitle: "Founder",
    worksFor: { "@id": `${SITE_URL}/#organization` },
    sameAs: [
      "https://x.com/itzprem109",
      "https://github.com/premjain230",
    ],
  },
  website: {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Learning Allied",
    url: `${SITE_URL}/`,
    description: "AI study partner for JEE, NEET and Board exam students.",
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#organization` },
  },
};
