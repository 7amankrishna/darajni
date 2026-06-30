import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Maintenance cron is not configured." },
      { status: 503 },
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("run_store_maintenance");
  if (error) {
    console.error("Store maintenance failed", error.message);
    return NextResponse.json({ error: "Maintenance failed." }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    archivedOrders: Number(result?.archived_orders ?? 0),
    deletedArchives: Number(result?.deleted_archives ?? 0),
    cancelledExpiredRazorpay: Number(result?.cancelled_expired_razorpay ?? 0),
  });
}
