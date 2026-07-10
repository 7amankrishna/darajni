import "server-only";

import { requireAdminApi, type AdminSession } from "@/lib/auth/admin";
import { apiError, rateLimitError } from "@/lib/security/api-response";
import {
  rateLimitRequest,
  type RateLimitPolicy,
} from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/request";

export async function authorizeAdminRequest(
  request: Request,
  policy: RateLimitPolicy,
  options: { requireSameOrigin?: boolean } = {},
): Promise<
  | { session: AdminSession; response: null }
  | { session: null; response: ReturnType<typeof apiError> }
> {
  if (options.requireSameOrigin !== false && !isSameOrigin(request)) {
    return { session: null, response: apiError("Forbidden.", 403) };
  }

  const limit = await rateLimitRequest(request, policy);
  if (!limit.success) {
    return { session: null, response: rateLimitError(limit) };
  }

  const session = await requireAdminApi();
  if (!session) {
    return { session: null, response: apiError("Forbidden.", 403) };
  }

  return { session, response: null };
}
