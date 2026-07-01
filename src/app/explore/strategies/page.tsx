"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

interface HotStrategy { name: string; count: number; winRate: number; avgPnl: number; }

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<HotStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.hotStrategies) setStrategies(d.hotStrategies); setLoading(false); });
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/feed?tab=explore" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Zap className="w-5 h-5 text-yellow-400" />
        <h1 className="text-lg font-bold text-white">Hot Strategies This Week</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--card)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <p className="text-gray-500 text-sm py-12 text-center">No strategy data yet this week.</p>
      ) : (
        <div className="space-y-3">
          {strategies.map((s, i) => (
            <div
              key={s.name}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-yellow-400/30 transition-colors"
            >
              <span className="text-gray-600 font-mono text-sm w-5 text-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{s.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{s.count} {s.count === 1 ? "trade" : "trades"}</span>
                  <span>·</span>
                  <span className="text-[var(--green)]">{s.winRate}% win rate</span>
                </div>
              </div>
              <p className={`text-sm font-bold shrink-0 ${s.avgPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {s.avgPnl >= 0 ? "+" : ""}${Math.abs(s.avgPnl).toLocaleString()} avg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
