import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canManageChannel, uniqueChannelSlug } from "@/lib/rooms";
import { NextRequest } from "next/server";

// PATCH /api/rooms/:id/channels — reorder topics. Body: { orderedIds: string[] }.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!canManageChannel(await getMembership(id, userId))) return new Response("Forbidden", { status: 403 });

  const { orderedIds } = await req.json();
  if (!Array.isArray(orderedIds) || !orderedIds.length) return new Response("orderedIds required", { status: 400 });

  const { data: owned } = await supabaseAdmin.from("channels").select("id").eq("room_id", id);
  const valid = new Set((owned ?? []).map((c) => c.id));
  const clean = orderedIds.filter((x: unknown) => typeof x === "string" && valid.has(x));

  await Promise.all(
    clean.map((cid, i) => supabaseAdmin.from("channels").update({ position: i }).eq("id", cid))
  );
  return Response.json({ ok: true });
}

// POST /api/rooms/:id/channels — owner/mod adds a topic channel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const membership = await getMembership(id, userId);
  if (!canManageChannel(membership)) return new Response("Forbidden", { status: 403 });

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 32) return new Response("Name must be 1–32 characters", { status: 400 });

  const slug = await uniqueChannelSlug(id, trimmed);

  const { data: last } = await supabaseAdmin
    .from("channels")
    .select("position")
    .eq("room_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("channels")
    .insert({ room_id: id, name: trimmed, slug, position: (last?.position ?? -1) + 1 })
    .select("id, name, slug, position, mods_only_posts")
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
