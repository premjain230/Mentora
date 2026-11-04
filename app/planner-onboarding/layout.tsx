import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Plan Setup",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/planner-onboarding",
  },
};

export default function PlannerOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
