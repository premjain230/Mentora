import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ChatMarkup } from "@/components/pages/chat/ChatMarkup";
import { constructMetadata, SITE_URL } from "@/lib/seo";
import "@/css/pages/chat.css";

export const metadata: Metadata = constructMetadata({
  title: "AI Tutor Chat — 24/7 Socratic Learning Assistant | Learning Allied",
  description:
    "Ask doubts, solve multi-concept problems, and receive step-by-step Socratic guidance tailored to JEE, NEET, and Board curricula.",
  path: "/chat",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "AI Tutor Chat — Learning Allied",
      description:
        "Instant Socratic AI tutor for Indian secondary and senior secondary students.",
      url: `${SITE_URL}/chat`,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Chat", "item": `${SITE_URL}/chat` },
        ],
      },
    },
  ],
};

export default function ChatPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <VanillaPage page="chat" fill>
        <ChatMarkup />
      </VanillaPage>
    </>
  );
}
