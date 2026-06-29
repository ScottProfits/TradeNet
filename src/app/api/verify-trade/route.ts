import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();
  if (!tradeId) return new Response("Missing tradeId", { status: 400 });

  // Get trade + user's Alpaca keys
  const [{ data: trade }, { data: profile }] = await Promise.all([
    supabase.from("trades").select("id, user_id, ticker, pnl, entry, exit, created_at").eq("id", tradeId).single(),
    supabase.from("profiles").select("alpaca_key, alpaca_secret").eq("id", userId).single(),
  ]);

  if (!trade) return new Response("Trade not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });
  if (!profile?.alpaca_key || !profile?.alpaca_secret) return new Response("No Alpaca keys connected", { status: 400 });

  // Query Alpaca for closed positions / orders around trade date
  const tradeDate = new Date(trade.created_at);
  const after = new Date(tradeDate); after.setDate(after.getDate() - 1);
  const until = new Date(tradeDate); until.setDate(until.getDate() + 1);

  try {
    const alpacaBase = "https://paper-api.alpaca.markets"; // works for both paper & live key lookup
    const headers = {
      "APCA-API-KEY-ID": profile.alpaca_key,
      "APCA-API-SECRET-KEY": profile.alpaca_secret,
    };

    const res = await fetch(
      `${alpacaBase}/v2/account/activities?activity_type=FILL&after=${after.toISOString()}&until=${until.toISOString()}`,
      { headers }
    );

    if (!res.ok) return new Response("Alpaca API error — check your keys", { status: 400 });

    const activities: { symbol: string; price: string; qty: string; side: string }[] = await res.json();

    // Look for a fill matching the ticker
    const tickerSymbol = trade.ticker.replace("$", "").toUpperCase();
    const match = activities.find((a) => a.symbol?.toUpperCase() === tickerSymbol);

    if (!match) return new Response("No matching trade found in Alpaca for this ticker on that date", { status: 404 });

    // Mark trade as verified
    await supabase.from("trades").update({ verified_pnl: true }).eq("id", tradeId);

    return Response.json({ verified: true });
  } catch {
    return new Response("Failed to contact Alpaca", { status: 500 });
  }
}
