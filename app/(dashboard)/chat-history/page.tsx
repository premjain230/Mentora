import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ChatHistoryMarkup } from "@/components/pages/chat-history/ChatHistoryMarkup";
import "@/css/pages/chat-history.css";

export const metadata: Metadata = {
  title: "Chat History",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/chat-history",
  },
};

export default function ChatHistoryPage() {
  return (
    <VanillaPage page="chat-history">
      <ChatHistoryMarkup />
    </VanillaPage>
  );
}
