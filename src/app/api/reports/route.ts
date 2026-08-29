import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { ADMIN_ID } from "@/lib/admin";
import { NextRequest } from "next/server";

const TARGETS = ["channel_message", "room", "user", "dm"] as const;

// POST /api/reports { targetType, targetId, reason } — file a report.
// Reviewed from the admin area; Apple requires action within ~24h.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { targetType, targetId, reason } = await req.json();
  if (!TARGETS.includes(targetType) || !targetId) {
    return new Response("Invalid target", { status: 400 });
  }

  const { error } = await supabaseAdmin.from("content_reports").insert({
    reporter_id: userId,
    target_type: targetType,
    target_id: String(targetId),
    reason: (reason ?? "").toString().slice(0, 1000) || null,
  });
  if (error) return new Response(error.message, { status: 500 });

  // Ping the admin so reports don't sit unseen (Apple wants action ~24h).
  void sendPushToUser(ADMIN_ID, {
    title: "🚩 New content report",
    body: `${targetType} reported`,
    url: "/admin/reports",
  });

  return Response.json({ ok: true }, { status: 201 });
}
