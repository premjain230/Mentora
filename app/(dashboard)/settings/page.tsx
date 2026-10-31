import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { SettingsMarkup } from "@/components/pages/settings/SettingsMarkup";
import "@/css/pages/settings.css";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <VanillaPage page="settings">
      <SettingsMarkup />
    </VanillaPage>
  );
}
