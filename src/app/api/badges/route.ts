import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return Response.json([]);

  const { data: profile } = await supabase.from("profiles").select("id").eq("handle", handle).single();
  if (!profile) return Response.json([]);

  const now = new Date();
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const { data: trades } = await supabase
    .from("trades")
    .select("pnl, created_at, verified_pnl")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true });

  if (!trades || trades.length === 0) return Response.json([]);

  const badges: { id: string; emoji: string; label: string; description: string }[] = [];

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = trades.length > 0 ? wins / trades.length : 0;
  const monthPnl = trades.filter((t) => new Date(t.created_at) >= monthStart).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const hasVerified = trades.some((t) => t.verified_pnl);

  // Win streak — count consecutive winning days
  const dayPnl: Record<string, number> = {};
  for (const t of trades) {
    const day = t.created_at.slice(0, 10);
    dayPnl[day] = (dayPnl[day] ?? 0) + (t.pnl ?? 0);
  }
  const days = Object.entries(dayPnl).sort((a, b) => a[0].localeCompare(b[0]));
  let streak = 0; let maxStreak = 0; let cur = 0;
  for (const [, pnl] of days) {
    if (pnl > 0) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }
  // Current streak
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i][1] > 0) streak++; else break;
  }

  if (streak >= 3) badges.push({ id: "streak", emoji: "🔥", label: `${streak}-Day Streak`, description: `${streak} consecutive winning days` });
  if (maxStreak >= 10) badges.push({ id: "hot", emoji: "⚡", label: "On Fire", description: "10+ day win streak achieved" });
  if (monthPnl >= 10000) badges.push({ id: "bigmonth", emoji: "💰", label: "Big Month", description: "$10k+ P&L this month" });
  if (monthPnl >= 50000) badges.push({ id: "whale", emoji: "🐋", label: "Whale", description: "$50k+ P&L this month" });
  if (winRate >= 0.8 && trades.length >= 10) badges.push({ id: "sharp", emoji: "🎯", label: "Sharpshooter", description: "80%+ win rate over 10+ trades" });
  if (trades.length >= 50) badges.push({ id: "consistent", emoji: "📈", label: "Consistent", description: "50+ trades posted" });
  if (totalPnl >= 100000) badges.push({ id: "sixfig", emoji: "💎", label: "Six Figures", description: "$100k+ all-time P&L" });
  if (hasVerified) badges.push({ id: "verified_trader", emoji: "✅", label: "Verified Trader", description: "P&L verified via brokerage" });

  return Response.json(badges);
}
