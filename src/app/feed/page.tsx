"use client";
import { feedTrades, traders } from "@/lib/mock-data";
import TradeCard from "@/components/feed/TradeCard";
import PostCard from "@/components/feed/PostCard";
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
  image_url: string | null;
  strategy: string | null;
  liked_by_me: boolean;
  created_at: string;
  profiles: { id: string; handle: string; avatar_url: string; brokerage: string; verified: boolean };
}

interface RealPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  profiles: { id: string; handle: string; avatar_url: string; verified: boolean } | null;
}

type FeedItem = ({ type: "trade" } & RealTrade) | ({ type: "post" } & RealPost);

function realTradeToCardProps(rt: RealTrade): { trade: Trade; trader: Trader } {
  const handle = rt.profiles?.handle ?? "unknown";
  const trader: Trader = {
    id: rt.user_id, handle, displayName: handle, initials: handle.slice(0, 2).toUpperCase(),
    color: "#6366F1", brokerage: rt.profiles?.brokerage ?? "", verified: rt.profiles?.verified ?? false,
    followers: 0, following: 0, winRate: 0, pnlMonth: 0, categories: [],
  };
  const trade: Trade = {
    id: rt.id, traderId: rt.user_id, ticker: rt.ticker,
    direction: rt.direction === "LONG" ? "Long" : "Short", shares: 0,
    time: new Date(rt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pnl: rt.pnl, pnlPct: rt.pnl_percent, notes: rt.caption ?? "",
    likes: rt.likes_count, comments: rt.comments_count,
  };
  return { trade, trader };
}

export default function FeedPage() {
  const [showModal, setShowModal] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    try {
      const [tradesRes, postsRes] = await Promise.all([
        fetch("/api/trades"),
        fetch("/api/posts"),
      ]);
      const trades: RealTrade[] = tradesRes.ok ? await tradesRes.json() : [];
      const posts: RealPost[] = postsRes.ok ? await postsRes.json() : [];

      const merged: FeedItem[] = [
        ...trades.map((t) => ({ ...t, type: "trade" as const })),
        ...posts.map((p) => ({ ...p, type: "post" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFeedItems(merged);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function handleDelete(id: string) {
    setDeletedIds((s) => new Set(s).add(id));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
      <aside className="hidden lg:block space-y-4">
        <SidebarProfile />
      </aside>

      <section className="space-y-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--green)] text-black font-bold text-base rounded-xl hover:bg-[var(--green)]/90 transition-colors shadow-lg shadow-[var(--green)]/20"
        >
          <Plus className="w-5 h-5" />
          Post a Trade
        </button>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Live feed</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>

        {feedItems.filter((item) => !deletedIds.has(item.id)).map((item) => {
          if (item.type === "trade") {
            const { trade, trader } = realTradeToCardProps(item);
            return (
              <TradeCard
                key={item.id}
                trade={trade}
                trader={trader}
                imageUrl={item.image_url ?? undefined}
                avatarUrl={item.profiles?.avatar_url ?? undefined}
                strategy={item.strategy ?? undefined}
                likedByMe={item.liked_by_me}
                onDelete={handleDelete}
              />
            );
          }
          return <PostCard key={item.id} post={item} />;
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
        <PostTradeModal onClose={() => setShowModal(false)} onPosted={loadFeed} />
      )}
    </div>
  );
}
