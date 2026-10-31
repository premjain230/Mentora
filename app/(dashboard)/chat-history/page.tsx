import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ChatHistoryMarkup } from "@/components/pages/chat-history/ChatHistoryMarkup";
import "@/css/pages/chat-history.css";

export const metadata: Metadata = {
  title: "Chat History",
  robots: { index: false, follow: false },
};

export default function ChatHistoryPage() {
  return (
    <VanillaPage page="chat-history">
      <ChatHistoryMarkup />
    </VanillaPage>
  );
}
