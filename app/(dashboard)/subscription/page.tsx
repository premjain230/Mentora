import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { SubscriptionMarkup } from "@/components/pages/subscription/SubscriptionMarkup";
import "@/css/pages/subscription.css";

export const metadata: Metadata = {
  title: "Subscription & Plans",
  robots: { index: false, follow: false },
};

export default function SubscriptionPage() {
  return (
    <VanillaPage page="subscription">
      <SubscriptionMarkup />
    </VanillaPage>
  );
}
