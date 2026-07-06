import { leaderboard, strategies } from "@/lib/mock-data";
import Avatar from "@/components/ui/Avatar";
import Tag from "@/components/ui/Tag";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import SuggestedTraders from "@/components/feed/SuggestedTraders";

export default function SidebarRight() {
  return (
    <div className="space-y-4">
      {/* Top today */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-orange-400">🔥</span>
          <h3 className="font-semibold text-white text-sm">Top today</h3>
        </div>
        <div className="space-y-2">
          {leaderboard.topToday.map((entry) => (
            <div key={entry.trader.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4">{entry.rank}</span>
              <Avatar initials={entry.trader.initials} color={entry.trader.color} size="sm" />
              <span className="text-sm text-gray-300 flex-1">@{entry.trader.handle}</span>
              <span className="text-sm font-semibold text-[var(--green)] glow-green">+${entry.pnl.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Most improved */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[var(--green)]" />
          <h3 className="font-semibold text-white text-sm">Most Improved</h3>
        </div>
        <div className="space-y-2">
          {leaderboard.mostImproved.map((entry) => (
            <div key={entry.trader.id} className="flex items-center gap-2">
              <Avatar initials={entry.trader.initials} color={entry.trader.color} size="sm" />
              <div className="flex-1">
                <p className="text-sm text-gray-300">@{entry.trader.handle}</p>
                <p className="text-xs text-[var(--green)] glow-green">+{entry.changePct}% vs last month</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--green)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Hot strategies */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="font-semibold text-white text-sm mb-3">Hot strategies</h3>
        <div className="space-y-2">
          {strategies.map((s) => (
            <div key={s.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">{s.name}</p>
                <p className="text-xs text-gray-500">Win rate {s.winRate}% · {s.traders.toLocaleString()} traders</p>
              </div>
              <Tag label={s.tag} />
            </div>
          ))}
        </div>
      </div>

      <SuggestedTraders />
    </div>
  );
}
