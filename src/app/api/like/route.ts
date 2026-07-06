import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  const { error } = await supabaseAdmin.from("likes").insert({
    user_id: userId,
    trade_id: tradeId,
  });

  if (error && error.code !== "23505" && error.code !== "23503") {
    return new Response(error.message, { status: 500 });
  }

  if (!error) {
    await supabaseAdmin.rpc("increment_likes", { trade_id_input: tradeId });

    const [{ data: trade }, { data: actor }] = await Promise.all([
      supabase.from("trades").select("user_id, ticker, pnl").eq("id", tradeId).single(),
      supabase.from("profiles").select("handle").eq("id", userId).single(),
    ]);

    if (trade && trade.user_id !== userId) {
      const pnlStr = trade.pnl >= 0 ? `+$${trade.pnl.toLocaleString()}` : `-$${Math.abs(trade.pnl).toLocaleString()}`;
      await supabaseAdmin.from("notifications").insert({
        user_id: trade.user_id,
        type: "like",
        actor_id: userId,
        trade_id: tradeId,
      });
      if (actor) {
        void sendPushToUser(trade.user_id, {
          title: "❤️ New like",
          body: `@${actor.handle} liked your ${trade.ticker} trade (${pnlStr})`,
          url: `/trade/${tradeId}`,
        });
      }
    }
  }

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  await supabaseAdmin.from("likes").delete().match({ user_id: userId, trade_id: tradeId });
  await supabaseAdmin.rpc("decrement_likes", { trade_id_input: tradeId });

  return new Response("OK", { status: 200 });
}
