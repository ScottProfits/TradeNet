"use client";
import { useState } from "react";
import { traders, currentUser } from "@/lib/mock-data";
import { Trader } from "@/types";
import Avatar from "@/components/ui/Avatar";
import { CheckCircle, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

const tabs = ["Top today", "This week", "This month", "All time", "Most improved"];

const allTraders: (Trader & { rank: number; pnl: number; changePct?: number })[] = [
  { ...traders[0], rank: 1, pnl: 4800 },
  { ...traders[1], rank: 2, pnl: 1200 },
  { ...currentUser, rank: 3, pnl: 880 },
  { ...traders[4], rank: 4, pnl: 620 },
  { ...traders[3], rank: 5, pnl: 340 },
  { ...traders[2], rank: 6, pnl: -310 },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("Top today");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Leaderboard</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab
                ? "bg-[var(--green)] text-black"
                : "bg-[var(--card)] border border-[var(--border)] text-gray-400 hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs text-gray-500 px-4 py-3 w-12">#</th>
              <th className="text-left text-xs text-gray-500 px-4 py-3">Trader</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">Win rate</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">Followers</th>
              <th className="text-right text-xs text-gray-500 px-4 py-3">P&L</th>
            </tr>
          </thead>
          <tbody>
            {allTraders.map((t, i) => (
              <tr
                key={t.id}
                className={clsx(
                  "border-b border-[var(--border)] last:border-0 hover:bg-white/2 transition-colors",
                  i < 3 && "bg-[var(--green)]/2"
                )}
              >
                <td className="px-4 py-3 text-gray-500 text-sm font-mono">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : t.rank}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={t.initials} color={t.color} size="sm" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-white">@{t.handle}</span>
                        {t.verified && <CheckCircle className="w-3 h-3 text-[var(--green)]" />}
                      </div>
                      <p className="text-xs text-gray-500">{t.brokerage}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-300">{t.winRate}%</td>
                <td className="px-4 py-3 text-right text-sm text-gray-300">
                  {t.followers >= 1000 ? `${(t.followers / 1000).toFixed(1)}K` : t.followers}
                </td>
                <td className={clsx("px-4 py-3 text-right text-sm font-semibold", t.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
                  {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
