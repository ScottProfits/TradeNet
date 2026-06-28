"use client";
import { feedTrades, traders } from "@/lib/mock-data";
import TradeCard from "@/components/feed/TradeCard";
import SidebarProfile from "@/components/feed/SidebarProfile";
import SidebarRight from "@/components/feed/SidebarRight";
import PostTradeModal from "@/components/feed/PostTradeModal";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Trade, Trader } from "@/types";

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
  created_at: string;
  profiles: {
    id: string;
    handle: string;
    avatar_url: string;
    brokerage: string;
    verified: boolean;
  };
}

function realTradeToCardProps(rt: RealTrade): { trade: Trade; trader: Trader } {
  const handle = rt.profiles?.handle ?? "unknown";
  const initials = handle.slice(0, 2).toUpperCase();
  const trader: Trader = {
    id: rt.user_id,
    handle,
    displayName: handle,
    initials,
    color: "#6366F1",
    brokerage: rt.profiles?.brokerage ?? "",
    verified: rt.profiles?.verified ?? false,
    followers: 0,
    following: 0,
    winRate: 0,
    pnlMonth: 0,
    categories: [],
  };
  const trade: Trade = {
    id: rt.id,
    traderId: rt.user_id,
    ticker: rt.ticker,
    direction: rt.direction === "LONG" ? "Long" : "Short",
    shares: 0,
    time: new Date(rt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pnl: rt.pnl,
    pnlPct: rt.pnl_percent,
    notes: rt.caption ?? "",
    likes: rt.likes_count,
    comments: rt.comments_count,
  };
  return { trade, trader };
}

export default function FeedPage() {
  const [showModal, setShowModal] = useState(false);
  const [realTrades, setRealTrades] = useState<RealTrade[]>([]);

  const loadTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        const data = await res.json();
        setRealTrades(data ?? []);
      }
    } catch {
      // silently fail — fall through to mock data
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
      <aside className="hidden lg:block space-y-4">
        <SidebarProfile />
      </aside>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Live feed</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-black bg-[var(--green)] px-3 py-1.5 rounded-lg hover:bg-[var(--green)]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post Trade
            </button>
          </div>
        </div>

        {realTrades.map((rt) => {
          const { trade, trader } = realTradeToCardProps(rt);
          return <TradeCard key={trade.id} trade={trade} trader={trader} />;
        })}

        {feedTrades.map((trade) => {
          const trader = traders.find((t) => t.id === trade.traderId)!;
          return <TradeCard key={trade.id} trade={trade} trader={trader} />;
        })}
      </section>

      <aside className="hidden lg:block">
        <SidebarRight />
      </aside>

      {showModal && (
        <PostTradeModal
          onClose={() => setShowModal(false)}
          onPosted={loadTrades}
        />
      )}
    </div>
  );
}
