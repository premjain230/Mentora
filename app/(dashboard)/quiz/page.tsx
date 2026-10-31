import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { QuizMarkup } from "@/components/pages/quiz/QuizMarkup";
import "@/css/pages/quiz.css";

export const metadata: Metadata = {
  title: "Adaptive Quiz",
  robots: { index: false, follow: false },
};

export default function QuizPage() {
  return (
    <VanillaPage page="quiz">
      <QuizMarkup />
    </VanillaPage>
  );
}
