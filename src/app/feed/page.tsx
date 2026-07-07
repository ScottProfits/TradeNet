"use client";
import { feedTrades, traders } from "@/lib/mock-data";
import TradeCard from "@/components/feed/TradeCard";
import PostCard from "@/components/feed/PostCard";
import SidebarProfile from "@/components/feed/SidebarProfile";
import SidebarRight from "@/components/feed/SidebarRight";
import PostTradeModal from "@/components/feed/PostTradeModal";
import ExploreTab from "@/components/feed/ExploreTab";
import LiveTicker from "@/components/feed/LiveTicker";
import MarketPulse from "@/components/feed/MarketPulse";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Trade, Trader } from "@/types";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";
import { timeAgo } from "@/lib/timeAgo";

interface RealTrade {
  id: string;
  user_id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  shares: number;
  pnl: number;
  pnl_percent: number;
  caption: string;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  strategy: string | null;
  liked_by_me: boolean;
  verified_pnl: boolean;
  journal_note: string | null;
  created_at: string;
  source?: string | null;
  profiles: { id: string; handle: string; avatar_url: string; brokerage: string; verified: boolean };
}

interface RealPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count?: number;
  liked_by_me?: boolean;
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
    time: timeAgo(rt.created_at),
    createdAt: rt.created_at,
    source: rt.source ?? null,
    pnl: rt.pnl, pnlPct: rt.pnl_percent, notes: rt.caption ?? "",
    likes: rt.likes_count, comments: rt.comments_count,
  };
  return { trade, trader };
}

function isValidTab(t: string | null): t is "feed" | "following" | "explore" {
  return t === "feed" || t === "following" || t === "explore";
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedPageInner />
    </Suspense>
  );
}

function FeedPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [followingItems, setFollowingItems] = useState<FeedItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const initialTab = searchParams.get("tab");
  const [tab, setTabState] = useState<"feed" | "following" | "explore">(isValidTab(initialTab) ? initialTab : "feed");
  const { setIsExploreActive } = useNavVisibility();

  function setTab(t: "feed" | "following" | "explore") {
    setTabState(t);
    router.replace(t === "feed" ? "/feed" : `/feed?tab=${t}`, { scroll: false });
  }

  useEffect(() => {
    setIsExploreActive(tab === "explore");
    return () => setIsExploreActive(false);
  }, [tab, setIsExploreActive]);

  // Redirect new users to onboarding if no trading style set
  useEffect(() => {
    fetch("/api/profile/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d && !d.trading_style) {
        window.location.href = "/onboarding";
      }
    });
  }, []);

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

  const loadFollowing = useCallback(async () => {
    try {
      const res = await fetch("/api/following-feed");
      if (!res.ok) return;
      const { trades, posts } = await res.json();
      const merged: FeedItem[] = [
        ...trades.map((t: RealTrade) => ({ ...t, type: "trade" as const })),
        ...posts.map((p: RealPost) => ({ ...p, type: "post" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFollowingItems(merged);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadFeed(); loadFollowing(); }, [loadFeed, loadFollowing]);

  function handleDelete(id: string) {
    setDeletedIds((s) => new Set(s).add(id));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 lg:gap-6">
      <aside className="hidden lg:block space-y-4">
        <SidebarProfile />
      </aside>

      <section className="space-y-3 min-w-0">
        <LiveTicker />
        <MarketPulse />
        {/* Post button — hidden on mobile since nav bar has + button */}
        <button
          onClick={() => setShowModal(true)}
          className="hidden lg:flex w-full items-center justify-center gap-2 py-3 bg-[var(--green)] text-black font-bold text-base rounded-xl hover:bg-[var(--green)]/90 transition-colors shadow-lg shadow-[var(--green)]/20"
        >
          <Plus className="w-5 h-5" />
          Post a Trade
        </button>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-2xl p-1"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(["feed", "explore", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden"
              style={tab === t ? {
                background: "linear-gradient(135deg, rgba(0,200,150,0.25) 0%, rgba(0,168,126,0.15) 100%)",
                boxShadow: "0 0 18px rgba(0,200,150,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "1px solid rgba(0,200,150,0.35)",
              } : {
                background: "transparent",
                border: "1px solid transparent",
              }}
            >
              <span
                className="text-[10px] tracking-[0.18em] font-semibold uppercase transition-all duration-300"
                style={{
                  color: tab === t ? "#00C896" : "rgba(255,255,255,0.38)",
                  fontFamily: "'SF Pro Display', -apple-system, sans-serif",
                  letterSpacing: "0.18em",
                  textShadow: tab === t ? "0 0 12px rgba(0,200,150,0.6)" : "none",
                }}
              >
                {t === "feed" ? "Feed" : t === "following" ? "Following" : "Explore"}
              </span>
            </button>
          ))}
        </div>

        {tab === "explore" && <ExploreTab />}

        {tab === "following" && (
          followingItems.length === 0
            ? <div className="glass-card rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">Follow some traders to see their posts here.</p></div>
            : followingItems.filter((item) => !deletedIds.has(item.id)).map((item) => {
                if (item.type === "trade") {
                  const { trade, trader } = realTradeToCardProps(item);
                  return <TradeCard key={item.id} trade={trade} trader={trader} imageUrl={item.image_url ?? undefined} avatarUrl={item.profiles?.avatar_url ?? undefined} strategy={item.strategy ?? undefined} likedByMe={item.liked_by_me} verifiedPnl={item.verified_pnl} journalNote={item.journal_note ?? undefined} entry={item.entry} exit={item.exit} rawShares={item.shares ?? 0} onDelete={handleDelete} />;
                }
                return <PostCard key={item.id} post={item} onDelete={handleDelete} />;
              })
        )}

        {tab === "feed" && feedItems.filter((item) => !deletedIds.has(item.id)).map((item) => {
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
                verifiedPnl={item.verified_pnl}
                journalNote={item.journal_note ?? undefined}
                entry={item.entry}
                exit={item.exit}
                rawShares={item.shares ?? 0}
                onDelete={handleDelete}
              />
            );
          }
          return <PostCard key={item.id} post={item} onDelete={handleDelete} />;
        })}

        {tab === "feed" && feedTrades.map((trade) => {
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
