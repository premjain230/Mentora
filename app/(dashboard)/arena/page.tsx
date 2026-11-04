import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ArenaMarkup } from "@/components/pages/arena/ArenaMarkup";
import "@/css/pages/arena.css";

export const metadata: Metadata = {
  title: "Arena",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/arena",
  },
};

export default function ArenaPage() {
  return (
    <VanillaPage page="arena">
      <ArenaMarkup />
    </VanillaPage>
  );
}
