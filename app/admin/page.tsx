import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminDashboardData } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [session, data] = await Promise.all([
    requireAdminPage(),
    getAdminDashboardData(),
  ]);
  return <AdminDashboard data={data} email={session.user.email || "Administrator"} />;
}
