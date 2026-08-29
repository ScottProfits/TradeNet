import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { slugify } from "@/lib/rooms";
import { NextRequest } from "next/server";

/** Ensure a profiles row exists for this user (rooms.owner_id FKs to it). */
async function ensureProfile(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (data) return;
  const user = await currentUser();
  const handle = user?.username || `user_${userId.slice(-6)}`;
  const full_name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || handle;
  await supabaseAdmin.from("profiles").insert({ id: userId, handle, full_name, avatar_url: user?.imageUrl });
}

// GET /api/rooms            — discover public rooms
// GET /api/rooms?mine=1     — rooms the caller is an active member of
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const mine = req.nextUrl.searchParams.get("mine");

  if (mine) {
    if (!userId) return Response.json([]);
    const { data: memberships } = await supabaseAdmin
      .from("room_members")
      .select("room_id, role")
      .eq("user_id", userId)
      .in("status", ["active", "past_due"]);

    const ids = (memberships ?? []).map((m) => m.room_id);
    if (!ids.length) return Response.json([]);

    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return Response.json(rooms ?? []);
  }

  const { data: rooms } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("visibility", "public")
    .order("member_count", { ascending: false })
    .limit(50);

  if (!rooms?.length) return Response.json([]);

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const { data: owners } = await supabaseAdmin
    .from("profiles")
    .select("id, handle, avatar_url, verified")
    .in("id", ownerIds);
  const ownerMap = Object.fromEntries((owners ?? []).map((o) => [o.id, o]));

  return Response.json(rooms.map((r) => ({ ...r, owner: ownerMap[r.owner_id] ?? null })));
}

// POST /api/rooms — create a room (owner becomes an active member + a
// default #general channel is created). Pricing is set later, once
// Stripe Connect onboarding is done.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { name, description, avatarUrl, visibility } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 60) {
    return new Response("Name must be 1–60 characters", { status: 400 });
  }

  await ensureProfile(userId);

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      owner_id: userId,
      name: trimmed,
      slug: slugify(trimmed),
      description: (description ?? "").trim() || null,
      avatar_url: avatarUrl ?? null,
      visibility: visibility === "unlisted" ? "unlisted" : "public",
    })
    .select()
    .single();
  if (error || !room) return new Response(error?.message ?? "Insert failed", { status: 500 });

  await supabaseAdmin.from("room_members").insert({
    room_id: room.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });
  await supabaseAdmin.from("channels").insert({
    room_id: room.id,
    name: "general",
    slug: "general",
    position: 0,
  });

  return Response.json(room, { status: 201 });
}
