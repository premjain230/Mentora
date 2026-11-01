import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { LearningHubMarkup } from "@/components/pages/learning-hub/LearningHubMarkup";
import "@/css/learning-hub.css";

export const metadata: Metadata = {
  title: "AI Learning Hub",
  robots: { index: false, follow: false },
};

export default function LearningHubPage() {
  return (
    <VanillaPage page="learning-hub">
      <LearningHubMarkup />
    </VanillaPage>
  );
}
