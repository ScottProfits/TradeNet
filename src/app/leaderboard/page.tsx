"use client";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";
import BackButton from "@/components/ui/BackButton";

interface LeaderEntry {
  profile: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    brokerage: string;
  };
  pnl: number;
  tradeCount: number;
  winRate: number;
  rankChange: number | null;
}

const tabs = [
  { label: "Today", period: "today" },
  { label: "This week", period: "week" },
  { label: "This month", period: "month" },
  { label: "All time", period: "all" },
];

function RankChange({ delta }: { delta: number | null }) {
  if (delta === null) return <Minus className="w-3 h-3 text-gray-600" />;
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-[var(--green)] text-xs font-semibold">
      <TrendingUp className="w-3 h-3" />{delta}
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-0.5 text-[var(--red)] text-xs font-semibold">
      <TrendingDown className="w-3 h-3" />{Math.abs(delta)}
    </span>
  );
  return <Minus className="w-3 h-3 text-gray-600" />;
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`/api/leaderboard?period=${period}&tz=${encodeURIComponent(tz)}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <BackButton iconOnly className="text-gray-500 hover:text-white transition-colors" />
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h1 className="text-lg font-bold text-white">Leaderboard</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.period}
            onClick={() => setPeriod(t.period)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              period === t.period
                ? "bg-[var(--green)] text-black"
                : "glass-card text-gray-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-gray-400 font-medium">No trades posted yet</p>
            <p className="text-gray-600 text-sm">Be the first to post a trade and claim the #1 spot.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs text-gray-500 px-3 py-3 w-8">#</th>
                <th className="text-xs text-gray-500 px-1 py-3 w-6"></th>
                <th className="text-left text-xs text-gray-500 px-3 py-3">Trader</th>
                <th className="text-right text-xs text-gray-500 px-3 py-3">Trades</th>
                <th className="text-right text-xs text-gray-500 px-3 py-3">Win %</th>
                <th className="text-right text-xs text-gray-500 px-3 py-3 pr-4">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, i) => (
                <tr
                  key={entry.profile?.id ?? i}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-3 py-3 text-sm font-mono text-gray-400">
                    {entry.pnl > 0 && i === 0 ? "🥇" : entry.pnl > 0 && i === 1 ? "🥈" : entry.pnl > 0 && i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-1 py-3">
                    <RankChange delta={entry.rankChange} />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/profile/${entry.profile?.handle}`} className="flex items-center gap-2 group">
                      <SafeAvatar src={entry.profile?.avatar_url} alt={entry.profile?.handle ?? ""} initials={entry.profile?.handle ?? "?"} className="w-8 h-8 text-xs" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-white group-hover:text-[var(--green)] transition-colors truncate">
                            @{entry.profile?.handle}
                          </span>
                          {entry.profile?.verified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        {entry.profile?.brokerage && (
                          <p className="text-xs text-gray-500 truncate">{entry.profile.brokerage}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-gray-400">{entry.tradeCount}</td>
                  <td className="px-3 py-3 text-right text-sm text-gray-300">{entry.winRate}%</td>
                  <td className={clsx("px-3 py-3 pr-4 text-right text-sm font-bold whitespace-nowrap", entry.pnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
                    {entry.pnl >= 0 ? "+" : ""}${Math.abs(entry.pnl).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
