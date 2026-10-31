import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { StudySessionMarkup } from "@/components/pages/study-session/StudySessionMarkup";
import "@/css/pages/study-session.css";

export const metadata: Metadata = {
  title: "Study Session",
  robots: { index: false, follow: false },
};

export default function StudySessionPage() {
  return (
    <VanillaPage page="study-session">
      <StudySessionMarkup />
    </VanillaPage>
  );
}
