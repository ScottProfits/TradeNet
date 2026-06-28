import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const { data: trade } = await supabaseAdmin
    .from("trades")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!trade) return new Response("Not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin.from("trades").delete().eq("id", id);
  return new Response("OK", { status: 200 });
}
