import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ProfileMarkup } from "@/components/pages/profile/ProfileMarkup";
import "@/css/pages/profile.css";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <VanillaPage page="profile">
      <ProfileMarkup />
    </VanillaPage>
  );
}
