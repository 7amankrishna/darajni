import type { Metadata } from "next";

import ProtectedRoute from "@/components/ProtectedRoute";
import UserDashboard from "@/components/screens/UserDashboard";

export const metadata: Metadata = {
  title: "Customer dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <UserDashboard />
    </ProtectedRoute>
  );
}
