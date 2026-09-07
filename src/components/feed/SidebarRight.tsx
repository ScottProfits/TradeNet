"use client";
import Link from "next/link";
import { useCachedFetch } from "@/lib/useCachedFetch";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import SuggestedTraders from "@/components/feed/SuggestedTraders";
import { clsx } from "clsx";

interface ProfileShape {
  id: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
}
interface ExploreData {
  hotStrategies: { name: string; count: number; winRate: number; avgPnl: number }[];
  topToday: { profile: ProfileShape; pnl: number; trades: number }[];
  mostImproved: { profile: ProfileShape; delta: number }[];
}

function money(n: number) {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

export default function SidebarRight() {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const { data } = useCachedFetch<ExploreData>("explore:main", `/api/explore?tz=${encodeURIComponent(tz)}`);
  const topToday = data?.topToday?.slice(0, 4) ?? [];
  const mostImproved = data?.mostImproved?.slice(0, 3) ?? [];
  const hotStrategies = data?.hotStrategies?.slice(0, 5) ?? [];

  return (
    <div className="space-y-4">
      {/* Top today */}
      {topToday.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-400">🔥</span>
            <h3 className="font-semibold text-white text-sm">Top today</h3>
          </div>
          <div className="space-y-2">
            {topToday.map((entry, i) => (
              <Link
                key={entry.profile.id}
                href={`/profile/${entry.profile.handle}`}
                className="flex items-center gap-2 group"
              >
                <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                <SafeAvatar
                  src={entry.profile.avatar_url}
                  alt={entry.profile.handle}
                  initials={entry.profile.handle}
                  className="w-6 h-6 text-[10px]"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex-1 truncate flex items-center gap-1">
                  @{entry.profile.handle}
                  {entry.profile.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                </span>
                <span
                  className={clsx(
                    "text-sm font-semibold shrink-0",
                    entry.pnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red"
                  )}
                >
                  {money(entry.pnl)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Most improved */}
      {mostImproved.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--green)]" />
            <h3 className="font-semibold text-white text-sm">Most improved</h3>
          </div>
          <div className="space-y-2">
            {mostImproved.map((entry) => (
              <Link
                key={entry.profile.id}
                href={`/profile/${entry.profile.handle}`}
                className="flex items-center gap-2 group"
              >
                <SafeAvatar
                  src={entry.profile.avatar_url}
                  alt={entry.profile.handle}
                  initials={entry.profile.handle}
                  className="w-6 h-6 text-[10px]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors truncate flex items-center gap-1">
                    @{entry.profile.handle}
                    {entry.profile.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                  </p>
                  <p className="text-xs text-[var(--green)] glow-green">{money(entry.delta)} vs last week</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--green)] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hot strategies */}
      {hotStrategies.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold text-white text-sm mb-3">Hot strategies</h3>
          <div className="space-y-2.5">
            {hotStrategies.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.winRate}% win · {s.count} trade{s.count === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={clsx(
                    "text-xs font-semibold shrink-0",
                    s.avgPnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red"
                  )}
                >
                  {money(s.avgPnl)} avg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SuggestedTraders />
    </div>
  );
}
