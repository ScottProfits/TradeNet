import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// GET /api/rooms/:id/members — roster (owner/mod only).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!canModerate(await getMembership(id, userId))) return new Response("Forbidden", { status: 403 });

  const { data: members } = await supabaseAdmin
    .from("room_members")
    .select("user_id, role, status, joined_at")
    .eq("room_id", id)
    .order("joined_at", { ascending: true });

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, handle, avatar_url, verified").in("id", ids)
    : { data: [] };
  const map = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return Response.json((members ?? []).map((m) => ({ ...m, profile: map[m.user_id] ?? null })));
}

// PATCH /api/rooms/:id/members — owner/mod changes a member's role or
// status. Body: { userId, role?, status? }. Only the owner can grant/
// revoke "mod"; the owner's own row is immutable here.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const me = await getMembership(id, userId);
  if (!canModerate(me)) return new Response("Forbidden", { status: 403 });

  const { userId: targetId, role, status } = await req.json();
  if (!targetId) return new Response("Missing userId", { status: 400 });
  if (targetId === userId) return new Response("You cannot change your own membership", { status: 400 });

  const target = await getMembership(id, targetId);
  if (!target) return new Response("Not a member", { status: 404 });
  if (target.role === "owner") return new Response("Cannot modify the owner", { status: 400 });

  const patch: Record<string, unknown> = {};
  if (role === "mod" || role === "member") {
    if (me!.role !== "owner") return new Response("Only the owner can assign mods", { status: 403 });
    patch.role = role;
  }
  if (status === "active" || status === "banned") patch.status = status;
  if (!Object.keys(patch).length) return new Response("Nothing to update", { status: 400 });

  await supabaseAdmin.from("room_members").update(patch).match({ room_id: id, user_id: targetId });

  // Approving a pending request bumps the count; banning drops it.
  const bumpBy =
    patch.status === "banned"
      ? -1
      : patch.status === "active" && target.status !== "active"
      ? 1
      : 0;
  if (bumpBy) {
    const { data } = await supabaseAdmin.from("rooms").select("member_count").eq("id", id).single();
    await supabaseAdmin
      .from("rooms")
      .update({ member_count: Math.max(0, (data?.member_count ?? 0) + bumpBy) })
      .eq("id", id);
  }
  return Response.json({ ok: true });
}

// DELETE /api/rooms/:id/members?userId=... — kick a member or reject a
// pending request (owner/mod). Unlike a ban, they can re-request later.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!canModerate(await getMembership(id, userId))) return new Response("Forbidden", { status: 403 });

  const targetId = req.nextUrl.searchParams.get("userId");
  if (!targetId || targetId === userId) return new Response("Bad target", { status: 400 });

  const target = await getMembership(id, targetId);
  if (!target || target.role === "owner") return new Response("Cannot remove", { status: 400 });

  await supabaseAdmin.from("room_members").delete().match({ room_id: id, user_id: targetId });

  if (target.status === "active") {
    const { data } = await supabaseAdmin.from("rooms").select("member_count").eq("id", id).single();
    await supabaseAdmin
      .from("rooms")
      .update({ member_count: Math.max(0, (data?.member_count ?? 1) - 1) })
      .eq("id", id);
  }
  return Response.json({ ok: true });
}
