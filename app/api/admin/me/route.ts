import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  });
}
