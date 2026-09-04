import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

type TargetType = "trade" | "post";

function parseBody(body: unknown): { targetType: TargetType; targetId: string } | null {
  const b = body as { targetType?: string; targetId?: string };
  if ((b.targetType !== "trade" && b.targetType !== "post") || !b.targetId) return null;
  return { targetType: b.targetType, targetId: b.targetId };
}

// GET /api/repost?mine=1 — the set of things the current user has reposted,
// so cards can render the repost button in its active state.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json([]);
  if (req.nextUrl.searchParams.get("mine") !== "1") return Response.json([]);

  const { data } = await supabaseAdmin
    .from("reposts")
    .select("target_type, target_id")
    .eq("user_id", userId);

  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = parseBody(await req.json().catch(() => ({})));
  if (!parsed) return new Response("Bad request", { status: 400 });

  const table = parsed.targetType === "trade" ? "trades" : "posts";
  const { data: target } = await supabaseAdmin
    .from(table)
    .select("id, user_id")
    .eq("id", parsed.targetId)
    .maybeSingle();

  if (!target) return new Response("Not found", { status: 404 });
  if (target.user_id === userId) return new Response("You can't repost your own post", { status: 400 });

  const { data: inserted, error } = await supabaseAdmin
    .from("reposts")
    .upsert(
      { user_id: userId, target_type: parsed.targetType, target_id: parsed.targetId },
      { onConflict: "user_id,target_type,target_id", ignoreDuplicates: true }
    )
    .select("target_id");

  if (error) return new Response(error.message, { status: 500 });
  if (inserted && inserted.length) await bumpRepostCount(table, parsed.targetId, 1);
  return Response.json({ reposted: true });
}

async function bumpRepostCount(table: "trades" | "posts", id: string, delta: number) {
  const { data } = await supabaseAdmin.from(table).select("reposts_count").eq("id", id).maybeSingle();
  const current = (data as { reposts_count?: number } | null)?.reposts_count ?? 0;
  await supabaseAdmin.from(table).update({ reposts_count: Math.max(0, current + delta) }).eq("id", id);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const parsed = parseBody(await req.json().catch(() => ({})));
  if (!parsed) return new Response("Bad request", { status: 400 });

  const { data: removed } = await supabaseAdmin
    .from("reposts")
    .delete()
    .match({ user_id: userId, target_type: parsed.targetType, target_id: parsed.targetId })
    .select("target_id");

  if (removed && removed.length) {
    await bumpRepostCount(parsed.targetType === "trade" ? "trades" : "posts", parsed.targetId, -1);
  }
  return Response.json({ reposted: false });
}
