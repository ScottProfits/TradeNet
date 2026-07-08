import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json([]);

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: trades, error } = await supabase
    .from("trades")
    .select("user_id, pnl, strategy")
    .not("strategy", "is", null)
    .gte("created_at", since7d.toISOString())
    .limit(500);

  if (error) console.error("strategy-users trades error:", error);
  const matching = (trades ?? []).filter((t) => t.strategy?.trim() === name);
  if (!matching.length) return NextResponse.json([]);

  // Aggregate per user
  const byUser: Record<string, { pnl: number; trades: number }> = {};
  for (const t of matching) {
    if (!byUser[t.user_id]) byUser[t.user_id] = { pnl: 0, trades: 0 };
    byUser[t.user_id].pnl += t.pnl ?? 0;
    byUser[t.user_id].trades += 1;
  }

  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 10)
    .map(([id]) => id);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, handle, avatar_url, verified, trading_style")
    .in("id", topUserIds);

  if (profilesError) console.error("strategy-users profiles error:", profilesError);

  const result = topUserIds
    .map((id) => {
      const p = profiles?.find((x) => x.id === id);
      return p ? { ...p, ...byUser[id] } : null;
    })
    .filter(Boolean);

  return NextResponse.json(result);
}
