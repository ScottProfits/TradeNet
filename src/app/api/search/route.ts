import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return Response.json({ type: "users", results: [] });

  // If query looks like a ticker (all caps or prefixed with $), search trades
  const tickerQuery = q.startsWith("$") ? q.slice(1) : q;
  const looksLikeTicker = /^[A-Z]{1,5}$/.test(tickerQuery.toUpperCase()) && q.length <= 5;

  if (looksLikeTicker) {
    const { userId } = await auth();
    const ticker = tickerQuery.toUpperCase();

    const { data: trades } = await supabase
      .from("trades")
      .select(`*, profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)`)
      .eq("ticker", ticker)
      .order("created_at", { ascending: false })
      .limit(20);

    let likedIds = new Set<string>();
    if (userId && trades && trades.length > 0) {
      const { data: likes } = await supabase
        .from("likes")
        .select("trade_id")
        .eq("user_id", userId);
      if (likes) likedIds = new Set(likes.map((l) => l.trade_id));
    }

    const result = (trades ?? []).map((t) => ({ ...t, liked_by_me: likedIds.has(t.id) }));
    return Response.json({ type: "ticker", ticker, results: result });
  }

  // Otherwise search by handle
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, full_name, avatar_url, verified")
    .ilike("handle", `%${q}%`)
    .limit(8);

  return Response.json({ type: "users", results: data ?? [] });
}
