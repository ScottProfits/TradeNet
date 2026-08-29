import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/rooms/:idOrSlug/preview — PUBLIC. Just enough to render a join
// wall for someone who followed an invite link and isn't signed in.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const column = UUID_RE.test(id) ? "id" : "slug";

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, name, slug, description, avatar_url, member_count, price_cents, requires_approval, owner_id")
    .eq(column, id)
    .maybeSingle();
  if (!room) return new Response("Not found", { status: 404 });

  const { data: owner } = await supabaseAdmin
    .from("profiles")
    .select("handle, avatar_url, verified")
    .eq("id", room.owner_id)
    .maybeSingle();

  return Response.json({
    room: {
      id: room.id,
      name: room.name,
      slug: room.slug,
      description: room.description,
      avatar_url: room.avatar_url,
      member_count: room.member_count,
      price_cents: room.price_cents,
      requires_approval: room.requires_approval,
      owner: owner ?? null,
    },
  });
}
