import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { QuizMarkup } from "@/components/pages/quiz/QuizMarkup";
import "@/css/pages/quiz.css";

export const metadata: Metadata = {
  title: "Adaptive Quiz",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/quiz",
  },
};

export default function QuizPage() {
  return (
    <VanillaPage page="quiz">
      <QuizMarkup />
    </VanillaPage>
  );
}
