import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/onboarding",
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
