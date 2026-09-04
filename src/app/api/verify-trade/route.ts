import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { renewTradovateToken, fetchTradovateFillsWithSession } from "@/lib/tradovate/client";
import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();
  if (!tradeId) return new Response("Missing tradeId", { status: 400 });

  const [{ data: trade }, { data: conn }] = await Promise.all([
    supabase.from("trades").select("id, user_id, ticker, source, created_at, trade_date").eq("id", tradeId).single(),
    supabaseAdmin
      .from("broker_connections")
      .select("access_token, token_expiry, account_id, needs_reconnect")
      .eq("user_id", userId)
      .eq("broker", "tradovate")
      .maybeSingle(),
  ]);

  if (!trade) return new Response("Trade not found", { status: 404 });
  if (trade.user_id !== userId) return new Response("Forbidden", { status: 403 });

  // Trades pulled straight from Tradovate are already broker-confirmed.
  if (trade.source === "tradovate") {
    await supabaseAdmin.from("trades").update({ verified_pnl: true }).eq("id", tradeId);
    return Response.json({ verified: true });
  }

  if (!conn || !conn.access_token || !conn.account_id || conn.needs_reconnect) {
    return new Response("No Tradovate account connected — connect Tradovate in Settings to verify trades.", { status: 400 });
  }

  try {
    let token = conn.access_token as string;
    const expiresAt = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0;
    if (expiresAt < Date.now() + 60 * 60 * 1000) {
      const renewed = await renewTradovateToken(token, "live");
      token = renewed.accessToken;
      await supabaseAdmin
        .from("broker_connections")
        .update({ access_token: renewed.accessToken, token_expiry: renewed.expirationTime })
        .eq("user_id", userId)
        .eq("broker", "tradovate");
    }

    const fills = await fetchTradovateFillsWithSession(token, conn.account_id, "live");

    const tickerSymbol = trade.ticker.replace("$", "").toUpperCase();
    const tradeDay = (trade.trade_date ?? trade.created_at ?? "").slice(0, 10);
    const match = fills.find((f) => {
      const symMatch = f.symbol?.toUpperCase().startsWith(tickerSymbol);
      const dayMatch = !tradeDay || f.fillDate === tradeDay;
      return symMatch && dayMatch;
    });

    if (!match) {
      return new Response("No matching fill found in Tradovate for this ticker on that date.", { status: 404 });
    }

    await supabaseAdmin.from("trades").update({ verified_pnl: true }).eq("id", tradeId);
    return Response.json({ verified: true });
  } catch (err) {
    console.error("Tradovate verify failed:", err);
    return new Response("Couldn't reach Tradovate — try reconnecting in Settings.", { status: 502 });
  }
}
