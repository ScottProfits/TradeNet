import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { NextRequest } from "next/server";

const ADMIN_ID = "user_3FjHwLbvzd59NATWEJDb6dwguxh";

// One-off broadcast route — not linked from any UI. Protected by the same
// ADMIN_ID gate used elsewhere in src/app/api/admin/. Pass ?dryRun=1 to
// preview the recipient count without sending anything.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (userId !== ADMIN_ID) return new Response("Forbidden", { status: 403 });

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
  const ids = (profiles ?? []).map((p) => p.id as string);

  if (dryRun) {
    return Response.json({ dryRun: true, recipientCount: ids.length });
  }

  if (ids.length === 0) return Response.json({ recipientCount: 0, notified: 0 });

  const { error } = await supabaseAdmin
    .from("notifications")
    .insert(ids.map((id) => ({ user_id: id, type: "announcement", actor_id: null })));

  if (error) return new Response(error.message, { status: 500 });

  const pushPayload = {
    title: "🎉 New broker: Tradovate",
    body: "Connect Tradovate in Settings to verify your P&L. Read/fill-only — we never place trades.",
    url: "/settings",
  };

  const results = await Promise.allSettled(ids.map((id) => sendPushToUser(id, pushPayload)));
  const pushSent = results.filter((r) => r.status === "fulfilled").length;

  return Response.json({ recipientCount: ids.length, notified: ids.length, pushAttempted: ids.length, pushSent });
}
