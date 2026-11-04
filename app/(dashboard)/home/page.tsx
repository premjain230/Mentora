import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { HomeMarkup } from "@/components/pages/home/HomeMarkup";
import "@/css/pages/home.css";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/home",
  },
};

export default function HomePage() {
  return (
    <VanillaPage page="home">
      <HomeMarkup />
    </VanillaPage>
  );
}
