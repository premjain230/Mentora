import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://www.learningallied.world/verify-email",
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
