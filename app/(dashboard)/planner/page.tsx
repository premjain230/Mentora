import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { PlannerMarkup } from "@/components/pages/planner/PlannerMarkup";
import "@/css/pages/planner.css";

export const metadata: Metadata = {
  title: "Study Planner",
  robots: { index: false, follow: false },
};

export default function PlannerPage() {
  return (
    <VanillaPage page="planner">
      <PlannerMarkup />
    </VanillaPage>
  );
}
