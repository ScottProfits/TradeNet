import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId, note } = await req.json();
  if (!tradeId) return new Response("Missing tradeId", { status: 400 });

  const { data: trade } = await supabase.from("trades").select("user_id").eq("id", tradeId).single();
  if (!trade || trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  await supabase.from("trades").update({ journal_note: note ?? null }).eq("id", tradeId);
  return new Response("OK", { status: 200 });
}
