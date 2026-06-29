"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TradeCard from "@/components/feed/TradeCard";
import { Trade, Trader } from "@/types";
import { TrendingUp } from "lucide-react";

interface RealTrade {
  id: string;
  user_id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  pnl: number;
  pnl_percent: number;
  caption: string;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  strategy: string | null;
  liked_by_me: boolean;
  created_at: string;
  profiles: { id: string; handle: string; avatar_url: string; brokerage: string; verified: boolean };
}

export default function TickerPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [trades, setTrades] = useState<RealTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/search?q=${ticker}`)
      .then((r) => r.ok ? r.json() : { results: [] })
      .then((d) => { setTrades(d.results ?? []); setLoading(false); });
  }, [ticker]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--green)]/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[var(--green)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">${ticker.toUpperCase()}</h1>
          <p className="text-gray-500 text-sm">{loading ? "Loading..." : `${trades.length} trade${trades.length !== 1 ? "s" : ""} posted`}</p>
        </div>
      </div>

      {!loading && trades.length === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <p className="text-gray-500">No trades posted for ${ticker.toUpperCase()} yet.</p>
        </div>
      )}

      {trades.map((t) => {
        const handle = t.profiles?.handle ?? "unknown";
        const trade: Trade = {
          id: t.id, traderId: t.user_id, ticker: t.ticker,
          direction: t.direction === "LONG" ? "Long" : "Short", shares: 0,
          time: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          pnl: t.pnl, pnlPct: t.pnl_percent, notes: t.caption ?? "",
          likes: t.likes_count, comments: t.comments_count,
        };
        const trader: Trader = {
          id: t.user_id, handle, displayName: handle,
          initials: handle.slice(0, 2).toUpperCase(), color: "#6366F1",
          brokerage: t.profiles?.brokerage ?? "", verified: t.profiles?.verified ?? false,
          followers: 0, following: 0, winRate: 0, pnlMonth: 0, categories: [],
        };
        return (
          <TradeCard
            key={t.id}
            trade={trade}
            trader={trader}
            imageUrl={t.image_url ?? undefined}
            avatarUrl={t.profiles?.avatar_url ?? undefined}
            strategy={t.strategy ?? undefined}
            likedByMe={t.liked_by_me}
          />
        );
      })}
    </div>
  );
}
