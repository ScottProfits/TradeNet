"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import BackButton from "@/components/ui/BackButton";

interface TrendingTicker { ticker: string; count: number; }

export default function TrendingPage() {
  const [trending, setTrending] = useState<TrendingTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.trending) setTrending(d.trending); setLoading(false); });
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <BackButton iconOnly fallbackHref="/feed?tab=explore" className="text-gray-500 hover:text-white transition-colors" />
        <Flame className="w-5 h-5 text-orange-400" />
        <h1 className="text-lg font-bold text-white">Trending This Week</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 bg-[var(--card)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : trending.length === 0 ? (
        <p className="text-gray-500 text-sm py-12 text-center">No trades posted yet this week.</p>
      ) : (
        <div className="space-y-3">
          {trending.map(({ ticker, count }, i) => (
            <Link
              key={ticker}
              href={`/ticker/${ticker}`}
              className="flex items-center gap-4 glass-card rounded-2xl p-4 hover:border-orange-400/40 transition-colors group"
            >
              <span className="text-gray-600 font-mono text-sm w-5 text-center shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-lg group-hover:text-orange-400 transition-colors">{ticker}</p>
                <p className="text-xs text-gray-500">{count} {count === 1 ? "trade" : "trades"} this week</p>
              </div>
              <Flame className="w-4 h-4 text-orange-400/60 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
