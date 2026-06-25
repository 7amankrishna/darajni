import type { Metadata } from "next";

import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboard from "@/components/screens/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
