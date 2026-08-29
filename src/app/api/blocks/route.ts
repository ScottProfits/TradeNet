import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// GET /api/blocks — ids the caller has blocked.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json([]);
  const { data } = await supabaseAdmin.from("user_blocks").select("blocked_id").eq("blocker_id", userId);
  return Response.json((data ?? []).map((b) => b.blocked_id));
}

// POST /api/blocks { userId }  — block a user.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { userId: target } = await req.json();
  if (!target || target === userId) return new Response("Invalid target", { status: 400 });

  await supabaseAdmin
    .from("user_blocks")
    .upsert({ blocker_id: userId, blocked_id: target }, { onConflict: "blocker_id,blocked_id" });
  return Response.json({ ok: true });
}

// DELETE /api/blocks { userId } — unblock.
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { userId: target } = await req.json();
  if (!target) return new Response("Missing userId", { status: 400 });

  await supabaseAdmin.from("user_blocks").delete().match({ blocker_id: userId, blocked_id: target });
  return Response.json({ ok: true });
}
