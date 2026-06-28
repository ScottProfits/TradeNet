import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  const { error } = await supabase.from("likes").insert({
    user_id: userId,
    trade_id: tradeId,
  });

  if (error && error.code !== "23505" && error.code !== "23503") {
    return new Response(error.message, { status: 500 });
  }

  // Notify trade owner
  if (!error) {
    const { data: trade } = await supabase
      .from("trades")
      .select("user_id")
      .eq("id", tradeId)
      .single();

    if (trade && trade.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: trade.user_id,
        type: "like",
        actor_id: userId,
        trade_id: tradeId,
      });
    }
  }

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  await supabase.from("likes").delete().match({
    user_id: userId,
    trade_id: tradeId,
  });

  return new Response("OK", { status: 200 });
}
