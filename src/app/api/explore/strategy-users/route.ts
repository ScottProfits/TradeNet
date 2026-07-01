import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json([]);

  const { data: trades, error } = await supabase
    .from("trades")
    .select("user_id, pnl")
    .ilike("strategy", name);

  if (error) console.error("strategy-users trades error:", error);
  if (!trades?.length) return NextResponse.json([]);

  // Aggregate per user
  const byUser: Record<string, { pnl: number; trades: number }> = {};
  for (const t of trades) {
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
