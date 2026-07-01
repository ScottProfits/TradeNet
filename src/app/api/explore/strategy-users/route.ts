import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json([]);

  const since = new Date();
  since.setDate(since.getDate() - 7);

  // Find trades this week using this strategy, group by user
  const { data: trades } = await supabase
    .from("trades")
    .select("user_id, pnl")
    .eq("strategy", name)
    .gte("created_at", since.toISOString());

  if (!trades?.length) return NextResponse.json([]);

  // Aggregate per user
  const byUser: Record<string, { pnl: number; trades: number }> = {};
  trades.forEach((t) => {
    if (!byUser[t.user_id]) byUser[t.user_id] = { pnl: 0, trades: 0 };
    byUser[t.user_id].pnl += t.pnl ?? 0;
    byUser[t.user_id].trades += 1;
  });

  // Sort by P&L desc, take top 10
  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 10)
    .map(([id]) => id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, avatar_url, verified, trading_style")
    .in("id", topUserIds);

  const result = topUserIds.map((id) => {
    const p = profiles?.find((x) => x.id === id);
    return { ...p, ...byUser[id] };
  }).filter((u) => u.handle);

  return NextResponse.json(result);
}
