"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Users, Flame } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Trader {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  trading_style: string | null;
}

interface TrendingTicker {
  ticker: string;
  count: number;
}

export default function ExploreTab() {
  const [topTraders, setTopTraders] = useState<Trader[]>([]);
  const [trending, setTrending] = useState<TrendingTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.ok ? r.json() : { topTraders: [], trending: [] })
      .then((d) => { setTopTraders(d.topTraders); setTrending(d.trending); setLoading(false); });
  }, []);

  return (
    <div className="space-y-8">
      {/* Trending Tickers */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold text-white">Trending This Week</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--card)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <p className="text-gray-600 text-sm">No trades posted yet this week.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {trending.map(({ ticker, count }, i) => (
              <div
                key={ticker}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex flex-col items-center gap-1 hover:border-[var(--green)]/50 transition-colors"
              >
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <span className="font-bold text-white text-lg">{ticker}</span>
                <span className="text-xs text-gray-500">{count} {count === 1 ? "trade" : "trades"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top Traders */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--green)]" />
          <h2 className="font-semibold text-white">Top Traders</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--card)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : topTraders.length === 0 ? (
          <p className="text-gray-600 text-sm">No traders yet.</p>
        ) : (
          <div className="space-y-2">
            {topTraders.map((trader, i) => (
              <Link
                key={trader.id}
                href={`/profile/${trader.handle}`}
                className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--green)]/50 transition-colors group"
              >
                <span className="text-gray-600 font-mono text-sm w-5 text-center">{i + 1}</span>
                {trader.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trader.avatar_url} alt={trader.handle} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {trader.handle.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white group-hover:text-[var(--green)] transition-colors text-sm">
                      @{trader.handle}
                    </span>
                    {trader.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                  </div>
                  {trader.full_name && (
                    <p className="text-xs text-gray-500 truncate">{trader.full_name}</p>
                  )}
                </div>
                {trader.trading_style && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg)] text-gray-400 border border-[var(--border)] shrink-0">
                    {trader.trading_style}
                  </span>
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
