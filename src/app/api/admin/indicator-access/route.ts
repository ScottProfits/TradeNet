import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/admin";
import { NextRequest } from "next/server";

// GET /api/admin/indicator-access — subscribers needing a manual TradingView
// invite-only grant/revoke, newest first.
export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return new Response("Forbidden", { status: 403 });

  const { data } = await supabaseAdmin
    .from("indicator_subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return Response.json(data ?? []);
}

// PATCH /api/admin/indicator-access { id, status } — mark that you've
// actually granted/revoked the TradingView access by hand.
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return new Response("Forbidden", { status: 403 });

  const { id, status } = await req.json();
  if (!id || !["active", "canceled"].includes(status)) {
    return new Response("Invalid", { status: 400 });
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "active") patch.granted_at = new Date().toISOString();
  if (status === "canceled") patch.revoked_at = new Date().toISOString();

  await supabaseAdmin.from("indicator_subscriptions").update(patch).eq("id", id);
  return Response.json({ ok: true });
}
