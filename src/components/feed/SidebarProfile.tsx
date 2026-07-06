import { currentUser } from "@/lib/mock-data";
import Avatar from "@/components/ui/Avatar";
import { CheckCircle } from "lucide-react";

export default function SidebarProfile() {
  const u = currentUser;
  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar initials={u.initials} color={u.color} size="lg" />
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center">
            <span className="font-semibold text-white">@{u.handle}</span>
            <CheckCircle className="w-4 h-4 text-[var(--green)]" />
          </div>
          <p className="text-xs text-gray-500">Connected: {u.brokerage}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-bold text-white">{(u.followers / 1000).toFixed(1)}K</p>
          <p className="text-xs text-gray-500">Followers</p>
        </div>
        <div>
          <p className="font-bold text-white">{u.following}</p>
          <p className="text-xs text-gray-500">Following</p>
        </div>
        <div>
          <p className="font-bold text-[var(--green)] glow-green">+{u.pnlMonth}%</p>
          <p className="text-xs text-gray-500">This month</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Win rate: {u.winRate}%</span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--green)] rounded-full"
            style={{ width: `${u.winRate}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {[
          { emoji: "🔥", label: "Top strategies" },
          { emoji: "📈", label: "Most improved" },
          { emoji: "📉", label: "Unprofitable" },
          { emoji: "🏆", label: "Daily winners" },
          { emoji: "📋", label: "Daily losers" },
        ].map((c) => (
          <button
            key={c.label}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
