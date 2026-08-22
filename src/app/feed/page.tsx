"use client";
import { demoFeedItems } from "@/lib/demoData";
import TradeCard from "@/components/feed/TradeCard";
import PostCard from "@/components/feed/PostCard";
import SidebarProfile from "@/components/feed/SidebarProfile";
import SidebarRight from "@/components/feed/SidebarRight";
import PostTradeModal from "@/components/feed/PostTradeModal";
import ExploreTab from "@/components/feed/ExploreTab";
import VideoTab from "@/components/feed/VideoTab";
import LiveTicker from "@/components/feed/LiveTicker";
import MarketPulse from "@/components/feed/MarketPulse";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";
import { realTradeToCardProps, RealTrade, RealPost } from "@/lib/tradeCardProps";

type FeedItem = ({ type: "trade" } & RealTrade) | ({ type: "post" } & RealPost);

function isValidTab(t: string | null): t is "feed" | "video" | "explore" {
  return t === "feed" || t === "video" || t === "explore";
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
  const [feedLoading, setFeedLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Cursor pagination — each "page" is a real, small network fetch (max 15
  // trades + 15 posts) instead of slicing an already-fully-fetched array,
  // which is what let too many images load/paint at once and overwhelmed
  // WebKit's tile compositor. Guards live in refs, not state, so the
  // IntersectionObserver callback below always reads fresh values without
  // needing to be recreated on every append.
  const feedCursorRef = useRef<string | null>(null);
  const feedHasMoreRef = useRef(true);
  const feedLoadingMoreRef = useRef(false);
  const followingCursorRef = useRef<string | null>(null);
  const followingHasMoreRef = useRef(true);
  const followingLoadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialTab = searchParams.get("tab");
  const [tab, setTabState] = useState<"feed" | "video" | "explore">(isValidTab(initialTab) ? initialTab : "feed");
  const [followingOnly, setFollowingOnly] = useState(false);
  const { setIsExploreActive } = useNavVisibility();
  const isDemo = searchParams.get("demo") === "1";

  function setTab(t: "feed" | "video" | "explore") {
    setTabState(t);
    router.replace(t === "feed" ? "/feed" : `/feed?tab=${t}`, { scroll: false });
  }

  useEffect(() => {
    setIsExploreActive(tab === "explore");
    return () => setIsExploreActive(false);
  }, [tab, setIsExploreActive]);

  // Redirect new users to onboarding if no trading style set
  useEffect(() => {
    if (isDemo) return;
    fetch("/api/profile/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d && !d.trading_style) {
        window.location.href = "/onboarding";
      }
    });
  }, [isDemo]);

  // Page size mirrors the API's own .limit(15) — used only to infer whether
  // a source might have more (a full page back means there could be more).
  const PAGE_SIZE = 15;

  function oldestCreatedAt(items: FeedItem[]): string | null {
    if (!items.length) return null;
    return items.reduce((oldest, i) => (i.created_at < oldest ? i.created_at : oldest), items[0].created_at);
  }

  const loadFeed = useCallback(async () => {
    if (isDemo) { setFeedItems(demoFeedItems); feedHasMoreRef.current = false; setFeedLoading(false); return; }
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
      feedCursorRef.current = oldestCreatedAt(merged);
      feedHasMoreRef.current = trades.length === PAGE_SIZE || posts.length === PAGE_SIZE;
    } catch { /* silently fail */ }
    setFeedLoading(false);
  }, [isDemo]);

  const loadMoreFeed = useCallback(async () => {
    if (isDemo || feedLoadingMoreRef.current || !feedHasMoreRef.current || !feedCursorRef.current) return;
    feedLoadingMoreRef.current = true;
    try {
      const before = encodeURIComponent(feedCursorRef.current);
      const [tradesRes, postsRes] = await Promise.all([
        fetch(`/api/trades?before=${before}`),
        fetch(`/api/posts?before=${before}`),
      ]);
      const trades: RealTrade[] = tradesRes.ok ? await tradesRes.json() : [];
      const posts: RealPost[] = postsRes.ok ? await postsRes.json() : [];
      const newItems: FeedItem[] = [
        ...trades.map((t) => ({ ...t, type: "trade" as const })),
        ...posts.map((p) => ({ ...p, type: "post" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      feedHasMoreRef.current = trades.length === PAGE_SIZE || posts.length === PAGE_SIZE;
      if (newItems.length) {
        setFeedItems((prev) => {
          const merged = [...prev, ...newItems];
          feedCursorRef.current = oldestCreatedAt(merged);
          return merged;
        });
      }
    } catch { /* silently fail */ }
    feedLoadingMoreRef.current = false;
  }, [isDemo]);

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
      followingCursorRef.current = oldestCreatedAt(merged);
      followingHasMoreRef.current = trades.length === PAGE_SIZE || posts.length === PAGE_SIZE;
    } catch { /* silently fail */ }
  }, []);

  const loadMoreFollowing = useCallback(async () => {
    if (followingLoadingMoreRef.current || !followingHasMoreRef.current || !followingCursorRef.current) return;
    followingLoadingMoreRef.current = true;
    try {
      const before = encodeURIComponent(followingCursorRef.current);
      const res = await fetch(`/api/following-feed?before=${before}`);
      if (res.ok) {
        const { trades, posts } = await res.json();
        const newItems: FeedItem[] = [
          ...trades.map((t: RealTrade) => ({ ...t, type: "trade" as const })),
          ...posts.map((p: RealPost) => ({ ...p, type: "post" as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        followingHasMoreRef.current = trades.length === PAGE_SIZE || posts.length === PAGE_SIZE;
        if (newItems.length) {
          setFollowingItems((prev) => {
            const merged = [...prev, ...newItems];
            followingCursorRef.current = oldestCreatedAt(merged);
            return merged;
          });
        }
      }
    } catch { /* silently fail */ }
    followingLoadingMoreRef.current = false;
  }, []);

  useEffect(() => { loadFeed(); loadFollowing(); }, [loadFeed, loadFollowing]);

  // Single observer for the "load more" sentinel at the bottom of whichever
  // list is currently rendered — the callback always dispatches to the
  // right loader via the followingOnly ref-mirrored check below.
  //
  // The item-count deps aren't for reacting to every change — they're
  // there because the sentinel div doesn't exist in the DOM at all until
  // there's actual content to render (loading skeleton / empty state show
  // instead). Without them, the effect's first run finds sentinelRef.current
  // still null, bails out, and never gets another chance to attach once
  // real content (and the sentinel) actually renders. Re-attaching after
  // each loadMore completion is harmless — it's just a re-subscribe to the
  // same still-mounted node, not a rapid loop.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (followingOnly) loadMoreFollowing();
        else loadMoreFeed();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, followingOnly, feedItems.length, followingItems.length, loadMoreFeed, loadMoreFollowing]);

  const handleRefresh = useCallback(async () => {
    feedHasMoreRef.current = true;
    followingHasMoreRef.current = true;
    await Promise.all([loadFeed(), loadFollowing()]);
  }, [loadFeed, loadFollowing]);

  useEffect(() => {
    window.addEventListener("ryzr:feed-refresh", handleRefresh);
    return () => window.removeEventListener("ryzr:feed-refresh", handleRefresh);
  }, [handleRefresh]);

  function handleDelete(id: string) {
    setDeletedIds((s) => new Set(s).add(id));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 lg:gap-6">
      <aside className="hidden lg:block space-y-4">
        <SidebarProfile />
      </aside>

      <section className="space-y-3 min-w-0">
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3">
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
          {(["feed", "explore", "video"] as const).map((t) => (
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
                {t === "feed" ? "Feed" : t === "video" ? "Video" : "Explore"}
              </span>
            </button>
          ))}
        </div>

        {tab === "explore" && <ExploreTab />}

        {tab === "video" && <VideoTab />}

        {tab === "feed" && (
          <>
            <button
              onClick={() => setFollowingOnly((v) => !v)}
              className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border transition-colors"
              style={followingOnly
                ? { background: "rgba(0,200,150,0.15)", borderColor: "rgba(0,200,150,0.4)", color: "#00C896" }
                : { background: "transparent", borderColor: "var(--border)", color: "rgba(255,255,255,0.5)" }}
            >
              <Users className="w-2.5 h-2.5" />
              Following only
            </button>

            {followingOnly ? (
              followingItems.length === 0
                ? <div className="glass-card rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">Follow some traders to see their posts here.</p></div>
                : <>
                    {followingItems.filter((item) => !deletedIds.has(item.id)).map((item) => {
                      if (item.type === "trade") {
                        const { trade, trader } = realTradeToCardProps(item);
                        return <TradeCard key={item.id} trade={trade} trader={trader} imageUrl={item.image_url ?? undefined} avatarUrl={item.profiles?.avatar_url ?? undefined} strategy={item.strategy ?? undefined} likedByMe={item.liked_by_me} verifiedPnl={item.verified_pnl} journalNote={item.journal_note ?? undefined} entry={item.entry} exit={item.exit} rawShares={item.shares ?? 0} onDelete={handleDelete} />;
                      }
                      return <PostCard key={item.id} post={item} onDelete={handleDelete} />;
                    })}
                    <div ref={sentinelRef} />
                  </>
            ) : feedLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl h-40 animate-pulse" />
                ))}
              </>
            ) : (
              <>
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
                <div ref={sentinelRef} />
              </>
            )}
          </>
        )}
        </div>
        </PullToRefresh>
      </section>

      <aside className="hidden lg:block">
        <SidebarRight />
      </aside>

      {showModal && (
        <PostTradeModal onClose={() => setShowModal(false)} onPosted={handleRefresh} />
      )}
    </div>
  );
}
