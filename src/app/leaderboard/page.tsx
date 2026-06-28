"use client";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

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
}

const tabs = [
  { label: "Today", period: "today" },
  { label: "This week", period: "week" },
  { label: "This month", period: "month" },
  { label: "All time", period: "all" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leaderboard?period=${period}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Leaderboard</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.period}
            onClick={() => setPeriod(t.period)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              period === t.period
                ? "bg-[var(--green)] text-black"
                : "bg-[var(--card)] border border-[var(--border)] text-gray-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-gray-400 font-medium">No trades posted yet</p>
            <p className="text-gray-600 text-sm">Be the first to post a trade and claim the #1 spot.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs text-gray-500 px-4 py-3 w-10">#</th>
                <th className="text-left text-xs text-gray-500 px-4 py-3">Trader</th>
                <th className="text-right text-xs text-gray-500 px-4 py-3">Trades</th>
                <th className="text-right text-xs text-gray-500 px-4 py-3">Win %</th>
                <th className="text-right text-xs text-gray-500 px-4 py-3">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, i) => (
                <tr
                  key={entry.profile?.id ?? i}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-400">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/profile/${entry.profile?.handle}`} className="flex items-center gap-3 group">
                      {entry.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.profile.avatar_url} alt={entry.profile.handle} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {entry.profile?.handle?.slice(0, 2).toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-white group-hover:text-[var(--green)] transition-colors">
                            @{entry.profile?.handle}
                          </span>
                          {entry.profile?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                        </div>
                        {entry.profile?.brokerage && (
                          <p className="text-xs text-gray-500">{entry.profile.brokerage}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">{entry.tradeCount}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">{entry.winRate}%</td>
                  <td className={clsx("px-4 py-3 text-right text-sm font-bold", entry.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
                    {entry.pnl >= 0 ? "+" : ""}${Math.abs(entry.pnl).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
