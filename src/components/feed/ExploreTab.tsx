"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Users, Flame, Zap, Star, ChevronRight, UserPlus, ArrowUpRight, Trophy } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { clsx } from "clsx";
import { demoExplore } from "@/lib/demoData";

interface Trader {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  trading_style: string | null;
}

interface TrendingTicker { ticker: string; count: number; }
interface HotStrategy { name: string; count: number; winRate: number; avgPnl: number; }
interface TopTodayEntry { profile: { id: string; handle: string; avatar_url: string; verified: boolean }; pnl: number; trades: number; }
interface ImprovedEntry { profile: { id: string; handle: string; avatar_url: string; verified: boolean }; delta: number; }

interface ExploreData {
  topTraders: Trader[];
  trending: TrendingTicker[];
  hotStrategies: HotStrategy[];
  topToday: TopTodayEntry[];
  mostImproved: ImprovedEntry[];
  suggested: Trader[];
}

function Avatar({ url, handle, size = 10 }: { url: string; handle: string; size?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={handle} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {handle.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-[var(--card)] rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function ExploreTab() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const [data, setData] = useState<ExploreData | null>(isDemo ? demoExplore : null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) { setData(demoExplore); setLoading(false); return; }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/explore?tz=${encodeURIComponent(tz)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); setLoading(false); });
  }, [isDemo]);

  return (
    <div className="space-y-8">

      {/* Leaderboard */}
      <Link href="/leaderboard" className="flex items-center gap-3 glass-card rounded-2xl p-4 hover:border-[var(--green)]/40 transition-colors group">
        <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">Leaderboard</p>
          <p className="text-xs text-gray-500">Ranked by real returns</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--green)] transition-colors" />
      </Link>

      {/* Top Today */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold text-white">Top Today</h2>
        </div>
        {loading ? <SkeletonList rows={3} /> : (data?.topToday?.length ?? 0) === 0 ? (
          <p className="text-gray-600 text-sm">No trades posted today yet.</p>
        ) : (
          <div className="space-y-2">
            {data!.topToday.map((entry, i) => (
              <Link key={entry.profile.id} href={`/profile/${entry.profile.handle}`}
                className="flex items-center gap-3 glass-card rounded-2xl p-3 hover:border-yellow-400/40 transition-colors group">
                <span className="text-gray-600 font-mono text-sm w-4 text-center">{i + 1}</span>
                <Avatar url={entry.profile.avatar_url} handle={entry.profile.handle} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-white group-hover:text-[var(--green)] transition-colors truncate">@{entry.profile.handle}</span>
                    {entry.profile.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{entry.trades} trade{entry.trades !== 1 ? "s" : ""} today</p>
                </div>
                <span className={clsx("text-sm font-bold shrink-0", entry.pnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
                  {entry.pnl >= 0 ? "+" : ""}${Math.abs(entry.pnl).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Most Improved */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-5 h-5 text-[var(--green)]" />
          <h2 className="font-semibold text-white">Most Improved</h2>
          <span className="text-xs text-gray-600">vs last week</span>
        </div>
        {loading ? <SkeletonList rows={3} /> : (data?.mostImproved?.length ?? 0) === 0 ? (
          <p className="text-gray-600 text-sm">Not enough data yet.</p>
        ) : (
          <div className="space-y-2">
            {data!.mostImproved.map((entry, i) => (
              <Link key={entry.profile.id} href={`/profile/${entry.profile.handle}`}
                className="flex items-center gap-3 glass-card rounded-2xl p-3 hover:border-[var(--green)]/40 transition-colors group">
                <span className="text-gray-600 font-mono text-sm w-4 text-center">{i + 1}</span>
                <Avatar url={entry.profile.avatar_url} handle={entry.profile.handle} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-white group-hover:text-[var(--green)] transition-colors truncate">@{entry.profile.handle}</span>
                    {entry.profile.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--green)] glow-green shrink-0">+${entry.delta.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Suggested Traders */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">Suggested Traders</h2>
        </div>
        {loading ? <SkeletonList rows={3} /> : (data?.suggested?.length ?? 0) === 0 ? (
          <p className="text-gray-600 text-sm">You&apos;re following everyone already!</p>
        ) : (
          <div className="space-y-2">
            {data!.suggested.map((trader) => (
              <Link key={trader.id} href={`/profile/${trader.handle}`}
                className="flex items-center gap-3 glass-card rounded-2xl p-3 hover:border-blue-400/40 transition-colors group">
                <Avatar url={trader.avatar_url} handle={trader.handle} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white group-hover:text-[var(--green)] transition-colors truncate">@{trader.handle}</span>
                    {trader.verified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  {trader.trading_style && <p className="text-xs text-gray-500">{trader.trading_style}</p>}
                </div>
                <span className="text-xs text-blue-400 border border-blue-400/30 rounded-full px-2 py-0.5 shrink-0">Follow</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Hot Strategies */}
      {(loading || (data?.hotStrategies?.length ?? 0) > 0) && (
        <section>
          <Link href="/explore/strategies" className="flex items-center gap-2 mb-3 group w-fit">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">Hot Strategies This Week</h2>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
          </Link>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-[var(--card)] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {data!.hotStrategies.map((s) => (
                <div key={s.name} className="glass-card rounded-2xl p-3 space-y-1 hover:border-yellow-400/30 transition-colors">
                  <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{s.count} {s.count === 1 ? "trade" : "trades"}</span>
                    <span>·</span>
                    <span className="text-[var(--green)]">{s.winRate}% win</span>
                  </div>
                  <p className={`text-xs font-semibold ${s.avgPnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red"}`}>
                    {s.avgPnl >= 0 ? "+" : ""}${Math.abs(s.avgPnl).toLocaleString()} avg
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Tickers */}
      <section>
        <Link href="/explore/trending" className="flex items-center gap-2 mb-3 group w-fit">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold text-white group-hover:text-orange-400 transition-colors">Trending This Week</h2>
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" />
        </Link>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 bg-[var(--card)] rounded-xl animate-pulse" />)}
          </div>
        ) : (data?.trending?.length ?? 0) === 0 ? (
          <p className="text-gray-600 text-sm">No trades posted yet this week.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {data!.trending.map(({ ticker, count }, i) => (
              <Link key={ticker} href={`/ticker/${ticker}`}
                className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1 hover:border-orange-400/40 transition-colors">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <span className="font-bold text-white text-lg">{ticker}</span>
                <span className="text-xs text-gray-500">{count} {count === 1 ? "trade" : "trades"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top Traders */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-[var(--green)]" />
          <h2 className="font-semibold text-white">Top Traders</h2>
        </div>
        {loading ? <SkeletonList rows={5} /> : (data?.topTraders?.length ?? 0) === 0 ? (
          <p className="text-gray-600 text-sm">No traders yet.</p>
        ) : (
          <div className="space-y-2">
            {data!.topTraders.map((trader, i) => (
              <Link key={trader.id} href={`/profile/${trader.handle}`}
                className="flex items-center gap-4 glass-card rounded-2xl p-4 hover:border-[var(--green)]/50 transition-colors group">
                <span className="text-gray-600 font-mono text-sm w-5 text-center">{i + 1}</span>
                <Avatar url={trader.avatar_url} handle={trader.handle} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white group-hover:text-[var(--green)] transition-colors text-sm">@{trader.handle}</span>
                    {trader.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                  </div>
                  {trader.full_name && <p className="text-xs text-gray-500 truncate">{trader.full_name}</p>}
                </div>
                {trader.trading_style && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg)] text-gray-400 border border-[var(--border)] shrink-0">{trader.trading_style}</span>
                )}
                <TrendingUp className="w-4 h-4 text-gray-600 group-hover:text-[var(--green)] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
