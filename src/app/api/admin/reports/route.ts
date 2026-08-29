import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";

// GET /api/admin/reports — open reports, newest first, with a snapshot of
// the reported content where we can resolve it.
export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return new Response("Forbidden", { status: 403 });

  const { data: reports } = await supabaseAdmin
    .from("content_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const msgIds = (reports ?? []).filter((r) => r.target_type === "channel_message").map((r) => r.target_id);
  const { data: msgs } = msgIds.length
    ? await supabaseAdmin.from("channel_messages").select("id, content, sender_id, channel_id, deleted_at").in("id", msgIds)
    : { data: [] };
  const msgMap = Object.fromEntries((msgs ?? []).map((m) => [m.id, m]));

  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: profiles } = reporterIds.length
    ? await supabaseAdmin.from("profiles").select("id, handle").in("id", reporterIds)
    : { data: [] };
  const profMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.handle]));

  return Response.json(
    (reports ?? []).map((r) => ({
      ...r,
      reporter_handle: profMap[r.reporter_id] ?? r.reporter_id,
      content_snapshot: r.target_type === "channel_message" ? msgMap[r.target_id] ?? null : null,
    }))
  );
}

// PATCH /api/admin/reports { id, status, deleteMessage? } — resolve a
// report, optionally soft-deleting the offending message.
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return new Response("Forbidden", { status: 403 });

  const { id, status, deleteMessage } = await req.json();
  if (!id || !["reviewed", "actioned", "dismissed"].includes(status)) {
    return new Response("Invalid", { status: 400 });
  }

  const { data: report } = await supabaseAdmin.from("content_reports").select("*").eq("id", id).single();
  if (!report) return new Response("Not found", { status: 404 });

  if (deleteMessage && report.target_type === "channel_message") {
    await supabaseAdmin
      .from("channel_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", report.target_id);
  }

  await supabaseAdmin.from("content_reports").update({ status }).eq("id", id);
  return Response.json({ ok: true });
}
