import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: trade } = await supabase
    .from("trades")
    .select(`*, profiles!trades_user_id_fkey(id, handle, full_name, avatar_url, verified, brokerage)`)
    .eq("id", id)
    .single();
  if (!trade) return new Response("Not found", { status: 404 });
  return Response.json(trade);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const { data: trade } = await supabase
    .from("trades")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!trade) return new Response("Not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin.from("trades").delete().eq("id", id);
  return new Response("OK", { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { ticker, direction, entry, exit, shares, caption, strategy, image_url } = await req.json();

  const { data: trade } = await supabase.from("trades").select("user_id").eq("id", id).single();
  if (!trade) return new Response("Not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const sharesNum = parseFloat(shares) || 1;
  let pnl = 0;
  let pnl_percent = 0;
  if (!isNaN(entryNum) && !isNaN(exitNum) && entryNum > 0) {
    pnl = direction === "LONG"
      ? (exitNum - entryNum) * sharesNum
      : (entryNum - exitNum) * sharesNum;
    pnl_percent = direction === "LONG"
      ? ((exitNum - entryNum) / entryNum) * 100
      : ((entryNum - exitNum) / entryNum) * 100;
  }

  const updateFields: Record<string, unknown> = { ticker, direction, entry: entryNum, exit: exitNum, pnl, pnl_percent, caption, strategy };
  if (image_url !== undefined) updateFields.image_url = image_url;

  const { data: updated, error } = await supabaseAdmin
    .from("trades")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(updated);
}
