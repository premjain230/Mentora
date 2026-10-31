import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { HomeMarkup } from "@/components/pages/home/HomeMarkup";
import "@/css/pages/home.css";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <AppShell>
      <AuthGate>
        <VanillaPage page="home">
          <HomeMarkup />
        </VanillaPage>
      </AuthGate>
    </AppShell>
  );
}
