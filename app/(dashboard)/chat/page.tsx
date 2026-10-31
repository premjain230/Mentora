import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ChatMarkup } from "@/components/pages/chat/ChatMarkup";
import "@/css/pages/chat.css";

export const metadata: Metadata = {
  title: "AI Tutor Chat",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <VanillaPage page="chat">
      <ChatMarkup />
    </VanillaPage>
  );
}
