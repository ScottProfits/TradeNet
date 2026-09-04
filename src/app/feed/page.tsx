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
import Link from "next/link";
import { Plus, Users, Hash } from "lucide-react";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";
import { realTradeToCardProps, RealTrade, RealPost } from "@/lib/tradeCardProps";
import type { Reposter } from "@/components/feed/Repost";

type RepostMeta = { repostedBy?: Reposter; repostId?: string; sortAt?: string };
type FeedItem = (({ type: "trade" } & RealTrade) | ({ type: "post" } & RealPost)) & RepostMeta;

const sortKey = (i: FeedItem) => i.sortAt ?? i.created_at;

// A repost from /api/reposts keeps the original trade/post fields (incl. its
// real created_at, shown on the card) but is ordered in the feed by when it
// was reposted.
function repostToFeedItem(r: {
  type: "trade" | "post";
  repostId: string;
  repostedBy: Reposter;
  repostedAt: string;
} & Record<string, unknown>): FeedItem {
  return { ...r, sortAt: r.repostedAt } as unknown as FeedItem;
}

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
  const [myReposts, setMyReposts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/repost?mine=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { target_type: string; target_id: string }[]) => {
        setMyReposts(new Set(rows.map((r) => `${r.target_type}:${r.target_id}`)));
      })
      .catch(() => {});
  }, []);

  // Cursor pagination — each "page" is a real, small network fetch (max 15
  // trades + 15 posts) instead of slicing an already-fully-fetched array,
  // which is what let too many images load/paint at once and overwhelmed
  // WebKit's tile compositor. Guards live in refs, not state, so the
  // IntersectionObserver callback below always reads fresh values without
  // needing to be recreated on every append.
  //
  // Trades and posts get their OWN cursors, not one shared "oldest overall"
  // cursor — trades and posts can have very different age distributions
  // (e.g. trades skew newer than posts), so a single shared cursor can
  // silently skip items that fall between the two tables' real boundaries:
  // an item newer than the shared cursor but older than what's already
  // shown of its own type would never get fetched at all.
  const feedTradesCursorRef = useRef<string | null>(null);
  const feedPostsCursorRef = useRef<string | null>(null);
  const feedTradesHasMoreRef = useRef(true);
  const feedPostsHasMoreRef = useRef(true);
  const feedLoadingMoreRef = useRef(false);
  const followingTradesCursorRef = useRef<string | null>(null);
  const followingPostsCursorRef = useRef<string | null>(null);
  const followingTradesHasMoreRef = useRef(true);
  const followingPostsHasMoreRef = useRef(true);
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

  function oldestOf(items: { created_at: string }[]): string | null {
    if (!items.length) return null;
    return items.reduce((oldest, i) => (i.created_at < oldest ? i.created_at : oldest), items[0].created_at);
  }

  const loadFeed = useCallback(async () => {
    if (isDemo) {
      setFeedItems(demoFeedItems);
      feedTradesHasMoreRef.current = false;
      feedPostsHasMoreRef.current = false;
      setFeedLoading(false);
      return;
    }
    try {
      const [tradesRes, postsRes, repostsRes] = await Promise.all([
        fetch("/api/trades"),
        fetch("/api/posts"),
        fetch("/api/reposts"),
      ]);
      const trades: RealTrade[] = tradesRes.ok ? await tradesRes.json() : [];
      const posts: RealPost[] = postsRes.ok ? await postsRes.json() : [];
      const reposts: FeedItem[] = repostsRes.ok ? (await repostsRes.json()).map(repostToFeedItem) : [];

      const merged: FeedItem[] = [
        ...trades.map((t) => ({ ...t, type: "trade" as const })),
        ...posts.map((p) => ({ ...p, type: "post" as const })),
        ...reposts,
      ].sort((a, b) => new Date(sortKey(b)).getTime() - new Date(sortKey(a)).getTime());

      setFeedItems(merged);
      feedTradesCursorRef.current = oldestOf(trades);
      feedPostsCursorRef.current = oldestOf(posts);
      feedTradesHasMoreRef.current = trades.length === PAGE_SIZE;
      feedPostsHasMoreRef.current = posts.length === PAGE_SIZE;
    } catch { /* silently fail */ }
    setFeedLoading(false);
  }, [isDemo]);

  const loadMoreFeed = useCallback(async () => {
    if (isDemo || feedLoadingMoreRef.current) return;
    if (!feedTradesHasMoreRef.current && !feedPostsHasMoreRef.current) return;
    feedLoadingMoreRef.current = true;
    try {
      const [tradesRes, postsRes] = await Promise.all([
        feedTradesHasMoreRef.current && feedTradesCursorRef.current
          ? fetch(`/api/trades?before=${encodeURIComponent(feedTradesCursorRef.current)}`)
          : Promise.resolve(null),
        feedPostsHasMoreRef.current && feedPostsCursorRef.current
          ? fetch(`/api/posts?before=${encodeURIComponent(feedPostsCursorRef.current)}`)
          : Promise.resolve(null),
      ]);
      const trades: RealTrade[] = tradesRes?.ok ? await tradesRes.json() : [];
      const posts: RealPost[] = postsRes?.ok ? await postsRes.json() : [];
      const newItems: FeedItem[] = [
        ...trades.map((t) => ({ ...t, type: "trade" as const })),
        ...posts.map((p) => ({ ...p, type: "post" as const })),
      ].sort((a, b) => new Date(sortKey(b)).getTime() - new Date(sortKey(a)).getTime());

      if (tradesRes) {
        feedTradesHasMoreRef.current = trades.length === PAGE_SIZE;
        if (trades.length) feedTradesCursorRef.current = oldestOf(trades);
      }
      if (postsRes) {
        feedPostsHasMoreRef.current = posts.length === PAGE_SIZE;
        if (posts.length) feedPostsCursorRef.current = oldestOf(posts);
      }
      if (newItems.length) {
        setFeedItems((prev) => [...prev, ...newItems]);
      }
    } catch { /* silently fail */ }
    feedLoadingMoreRef.current = false;
  }, [isDemo]);

  const loadFollowing = useCallback(async () => {
    try {
      const [res, repostsRes] = await Promise.all([
        fetch("/api/following-feed"),
        fetch("/api/reposts?following=1"),
      ]);
      if (!res.ok) return;
      const { trades, posts } = await res.json();
      const reposts: FeedItem[] = repostsRes.ok ? (await repostsRes.json()).map(repostToFeedItem) : [];
      const merged: FeedItem[] = [
        ...trades.map((t: RealTrade) => ({ ...t, type: "trade" as const })),
        ...posts.map((p: RealPost) => ({ ...p, type: "post" as const })),
        ...reposts,
      ].sort((a, b) => new Date(sortKey(b)).getTime() - new Date(sortKey(a)).getTime());
      setFollowingItems(merged);
      followingTradesCursorRef.current = oldestOf(trades);
      followingPostsCursorRef.current = oldestOf(posts);
      followingTradesHasMoreRef.current = trades.length === PAGE_SIZE;
      followingPostsHasMoreRef.current = posts.length === PAGE_SIZE;
    } catch { /* silently fail */ }
  }, []);

  const loadMoreFollowing = useCallback(async () => {
    if (followingLoadingMoreRef.current) return;
    if (!followingTradesHasMoreRef.current && !followingPostsHasMoreRef.current) return;
    followingLoadingMoreRef.current = true;
    try {
      // Always send both cursors, even for an exhausted type — querying
      // "older than the last known item" on an already-exhausted source
      // just correctly returns empty again, which is harmless. Omitting it
      // instead would restart that source from the top and reintroduce
      // duplicates.
      const params = new URLSearchParams();
      if (followingTradesCursorRef.current) params.set("beforeTrades", followingTradesCursorRef.current);
      if (followingPostsCursorRef.current) params.set("beforePosts", followingPostsCursorRef.current);
      const res = await fetch(`/api/following-feed?${params.toString()}`);
      if (res.ok) {
        const { trades, posts } = await res.json();
        const newItems: FeedItem[] = [
          ...trades.map((t: RealTrade) => ({ ...t, type: "trade" as const })),
          ...posts.map((p: RealPost) => ({ ...p, type: "post" as const })),
        ].sort((a, b) => new Date(sortKey(b)).getTime() - new Date(sortKey(a)).getTime());

        followingTradesHasMoreRef.current = trades.length === PAGE_SIZE;
        followingPostsHasMoreRef.current = posts.length === PAGE_SIZE;
        if (trades.length) followingTradesCursorRef.current = oldestOf(trades);
        if (posts.length) followingPostsCursorRef.current = oldestOf(posts);
        if (newItems.length) {
          setFollowingItems((prev) => [...prev, ...newItems]);
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
    feedTradesHasMoreRef.current = true;
    feedPostsHasMoreRef.current = true;
    followingTradesHasMoreRef.current = true;
    followingPostsHasMoreRef.current = true;
    await Promise.all([loadFeed(), loadFollowing()]);
  }, [loadFeed, loadFollowing]);

  useEffect(() => {
    window.addEventListener("ryzr:feed-refresh", handleRefresh);
    return () => window.removeEventListener("ryzr:feed-refresh", handleRefresh);
  }, [handleRefresh]);

  function handleDelete(id: string) {
    setDeletedIds((s) => new Set(s).add(id));
  }

  function renderItem(item: FeedItem) {
    const key = item.repostId ?? item.id;
    const repostedByMe = myReposts.has(`${item.type}:${item.id}`);
    if (item.type === "trade") {
      const { trade, trader } = realTradeToCardProps(item);
      return (
        <TradeCard
          key={key}
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
          repostedBy={item.repostedBy ?? null}
          repostedByMe={repostedByMe}
          repostCount={item.reposts_count ?? 0}
        />
      );
    }
    return (
      <PostCard
        key={key}
        post={item}
        onDelete={handleDelete}
        repostedBy={item.repostedBy ?? null}
        repostedByMe={repostedByMe}
      />
    );
  }

  const followingPill = (
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
  );

  const channelsPill = (
    <Link
      href="/rooms"
      className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border transition-colors"
      style={{ background: "transparent", borderColor: "var(--border)", color: "rgba(255,255,255,0.5)" }}
    >
      <Hash className="w-2.5 h-2.5" />
      Channels
    </Link>
  );

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

        {tab === "video" && (
          <>
            <div className="flex items-center justify-between mb-2">
              {followingPill}
              {channelsPill}
            </div>
            <VideoTab followingOnly={followingOnly} />
          </>
        )}

        {tab === "feed" && (
          <>
            <div className="flex items-center justify-between">
              {followingPill}
              {channelsPill}
            </div>

            {followingOnly ? (
              followingItems.length === 0
                ? <div className="glass-card rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">Follow some traders to see their posts here.</p></div>
                : <>
                    {followingItems.filter((item) => !deletedIds.has(item.id)).map(renderItem)}
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
                {feedItems.filter((item) => !deletedIds.has(item.id)).map(renderItem)}
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
