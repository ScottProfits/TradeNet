"use client";
import Link from "next/link";
import { useCachedFetch } from "@/lib/useCachedFetch";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Me {
  handle: string;
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  brokerage: string | null;
}
interface ProfileDetail {
  followersCount: number;
  followingCount: number;
  trades: { pnl: number; created_at: string }[];
}

const CATEGORIES = [
  { emoji: "🔥", label: "Top strategies", href: "/feed?tab=explore" },
  { emoji: "📈", label: "Most improved", href: "/feed?tab=explore" },
  { emoji: "🏆", label: "Leaderboard", href: "/leaderboard" },
  { emoji: "📊", label: "Today's winners", href: "/leaderboard?period=today" },
];

export default function SidebarProfile() {
  const { data: me } = useCachedFetch<Me>("profile:me", "/api/profile/me");
  const { data: detail } = useCachedFetch<ProfileDetail>(
    me ? `profile:detail:${me.handle}` : "profile:detail",
    me ? `/api/profile/${me.handle}` : null
  );

  if (!me) {
    return <div className="glass-card rounded-2xl h-64 animate-pulse" />;
  }

  const trades = detail?.trades ?? [];
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthPnl = trades
    .filter((t) => t.created_at >= monthStart)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const followers = detail?.followersCount ?? 0;
  const following = detail?.followingCount ?? 0;
  const showBroker = me.brokerage && me.brokerage !== "Other";

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex flex-col items-center gap-2">
        <Link href={`/profile/${me.handle}`}>
          <SafeAvatar
            src={me.avatar_url}
            alt={me.handle}
            initials={me.handle}
            className="w-16 h-16 text-xl"
          />
        </Link>
        <div className="text-center">
          <Link href={`/profile/${me.handle}`} className="flex items-center gap-1 justify-center">
            <span className="font-semibold text-white">@{me.handle}</span>
            {me.verified && <VerifiedBadge className="w-4 h-4" />}
          </Link>
          {showBroker && <p className="text-xs text-gray-500">Connected: {me.brokerage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-bold text-white">
            {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}
          </p>
          <p className="text-xs text-gray-500">Followers</p>
        </div>
        <div>
          <p className="font-bold text-white">{following}</p>
          <p className="text-xs text-gray-500">Following</p>
        </div>
        <div>
          <p
            className={`font-bold ${monthPnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red"}`}
          >
            {monthPnl >= 0 ? "+" : "-"}${Math.abs(Math.round(monthPnl)).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">This month</p>
        </div>
      </div>

      {trades.length > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Win rate: {winRate}%</span>
            <span className="text-gray-600">last {trades.length}</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--green)] rounded-full" style={{ width: `${winRate}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span>{c.emoji}</span>
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
