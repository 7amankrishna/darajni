import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/security/admin-api";
import { RATE_LIMITS } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const authorization = await authorizeAdminRequest(request, RATE_LIMITS.adminRead, {
    requireSameOrigin: false,
  });
  if (authorization.response) return authorization.response;
  const { session } = authorization;
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  });
}
