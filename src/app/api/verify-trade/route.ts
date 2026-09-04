import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// Verify a trade's P&L. Broker-imported trades are confirmed on sight;
// manually-posted trades verify when the poster has a live broker
// connection (Tradovate or Rithmic) — the "Verified" badge means "this
// trader trades a real, connected account", not a per-fill audit.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();
  if (!tradeId) return new Response("Missing tradeId", { status: 400 });

  const [{ data: trade }, { data: connections }] = await Promise.all([
    supabaseAdmin.from("trades").select("id, user_id, source").eq("id", tradeId).maybeSingle(),
    supabaseAdmin
      .from("broker_connections")
      .select("broker, needs_reconnect")
      .eq("user_id", userId),
  ]);

  if (!trade) return new Response("Trade not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  const brokerImported = trade.source === "tradovate" || trade.source === "rithmic";
  const hasLiveBroker = (connections ?? []).some((c) => !c.needs_reconnect);

  if (!brokerImported && !hasLiveBroker) {
    return new Response("Connect a broker in Settings to verify your trades.", { status: 400 });
  }

  await supabaseAdmin.from("trades").update({ verified_pnl: true }).eq("id", tradeId);
  return Response.json({ verified: true });
}
