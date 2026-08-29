import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// POST /api/rooms/:id/channels — owner/mod adds a topic channel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const membership = await getMembership(id, userId);
  if (!canModerate(membership)) return new Response("Forbidden", { status: 403 });

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 32) return new Response("Name must be 1–32 characters", { status: 400 });

  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "channel";

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
    .select("id, name, slug, position")
    .single();
  if (error) {
    if (error.code === "23505") return new Response("A channel with that name already exists", { status: 409 });
    return new Response(error.message, { status: 500 });
  }
  return Response.json(data, { status: 201 });
}
