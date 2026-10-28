import React from "react";
import { Metadata } from "next";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin & Growth Dashboard | Learning Allied",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
