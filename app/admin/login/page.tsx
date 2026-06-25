import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unauthorized?: string }>;
}) {
  if (await getAdminSession()) redirect("/admin");
  const query = await searchParams;
  return <AdminLoginForm unauthorized={query.unauthorized === "1"} />;
}
