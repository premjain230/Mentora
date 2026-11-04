import React from "react";
import { Metadata } from "next";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin & Growth Dashboard",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://www.learningallied.world/admin",
  },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
