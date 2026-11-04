import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ReviewMarkup } from "@/components/pages/review/ReviewMarkup";
import "@/css/pages/review.css";

export const metadata: Metadata = {
  title: "Today's Review",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/review",
  },
};

export default function ReviewPage() {
  return (
    <VanillaPage page="review">
      <ReviewMarkup />
    </VanillaPage>
  );
}
