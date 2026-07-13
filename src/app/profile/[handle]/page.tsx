"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { X, MessageSquare, Heart, TrendingUp, TrendingDown, FileText, Pin, PinOff, LogOut, Settings } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import FounderBadge from "@/components/ui/FounderBadge";
import BadgeDisplay from "@/components/ui/BadgeDisplay";
import JournalSection from "@/components/profile/JournalSection";
import { useRouter } from "next/navigation";
import TradeCard from "@/components/feed/TradeCard";
import { Trade as TradeCardTrade, Trader } from "@/types";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";
import { clsx } from "clsx";
import Link from "next/link";
import RithmicConnectModal from "@/components/brokers/RithmicConnectModal";
import WatchlistSection from "@/components/profile/WatchlistSection";
import { timeAgo } from "@/lib/timeAgo";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { demoProfileData, demoLikedItems } from "@/lib/demoData";

function nameSizeClass(name: string): string {
  const len = name.length;
  if (len <= 12) return "text-lg";
  if (len <= 18) return "text-base";
  if (len <= 24) return "text-sm";
  return "text-xs";
}

function extractHandle(val: string): string {
  // Strip common domain prefixes and extract just the username/handle
  try {
    const url = val.includes("://") ? new URL(val) : new URL(`https://${val}`);
    // pathname is like "/@scottprofits" or "/scottprofits" or "/channel/UCxxx"
    const parts = url.pathname.replace(/^\//, "").split("/");
    const handle = parts[0].replace(/^@/, "") || val;
    return `@${handle}`;
  } catch {
    // Not a URL — treat as bare username
    return `@${val.replace(/^@/, "")}`;
  }
}

interface FollowUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
}

interface Profile {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  brokerage: string;
  trading_style: string;
  win_rate: number;
  pnl_month: number;
  verified: boolean;
  pinned_trade_id?: string | null;
  logo_url?: string | null;
  instagram?: string;
  tiktok?: string;
  discord?: string;
  youtube?: string;
  website?: string;
}

interface Trade {
  id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  pnl: number;
  pnl_percent: number;
  caption: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  source?: string | null;
}

interface ProfileData {
  profile: Profile;
  trades: Trade[];
  followersCount: number;
  followingCount: number;
  isOwner: boolean;
}

interface LikedItem {
  type: "trade" | "post";
  id: string;
  created_at: string;
  // trade fields
  ticker?: string;
  direction?: string;
  pnl?: number;
  pnl_percent?: number;
  caption?: string;
  // post fields
  content?: string;
  image_url?: string | null;
  likes_count?: number;
  profiles?: { handle: string; avatar_url: string; verified: boolean };
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const { handle } = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const { userId } = useAuth();
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const router = useRouter();

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [rithmicModalOpen, setRithmicModalOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ProfileData | null>(isDemo ? (demoProfileData as unknown as ProfileData) : null);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(isDemo ? demoProfileData.followersCount : 0);
  const [modal, setModal] = useState<"followers" | "following" | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [modalUsers, setModalUsers] = useState<FollowUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [likedItems, setLikedItems] = useState<LikedItem[]>(isDemo ? (demoLikedItems as unknown as LikedItem[]) : []);
  const [pinnedTradeId, setPinnedTradeId] = useState<string | null>(isDemo ? demoProfileData.profile.pinned_trade_id : null);
  const [tradeVisibility, setTradeVisibility] = useState<Record<string, boolean>>({});
  const [tradeHistoryTab, setTradeHistoryTab] = useState<"history" | "videos">("history");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isDemo) return;
    fetch(`/api/profile/${handle}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setData(d);
        setFollowerCount(d.followersCount);
        setFollowing(d.isFollowing ?? false);
        setPinnedTradeId(d.profile.pinned_trade_id ?? null);
        const vis: Record<string, boolean> = {};
        for (const t of d.trades) vis[t.id] = (t as any).is_public !== false;
        setTradeVisibility(vis);
      });
  }, [handle, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!data || !userId || userId !== data.profile.id) return;
    fetch("/api/liked")
      .then((r) => r.ok ? r.json() : [])
      .then(setLikedItems);
  }, [data, userId, isDemo]);

  async function handleFollow() {
    if (followLoading) return;
    if (isDemo) {
      setFollowing((f) => !f);
      setFollowerCount((c) => c + (following ? -1 : 1));
      return;
    }
    if (!userId) return;
    setFollowLoading(true);
    const next = !following;
    setFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    try {
      await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetHandle: handle }),
      });
    } catch {
      setFollowing(!next);
      setFollowerCount((c) => c + (next ? -1 : 1));
    }
    setFollowLoading(false);
  }

  async function toggleVisibility(tradeId: string) {
    const next = !tradeVisibility[tradeId];
    setTradeVisibility((v) => ({ ...v, [tradeId]: next }));
    if (isDemo) return;
    await fetch(`/api/trades/${tradeId}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: next }),
    });
  }

  async function handlePin(tradeId: string) {
    const next = pinnedTradeId === tradeId ? null : tradeId;
    setPinnedTradeId(next);
    if (isDemo) return;
    await fetch("/api/pin-trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId }),
    });
  }

  async function openModal(type: "followers" | "following") {
    setModal(type);
    setModalUsers([]);
    if (isDemo) {
      setModalUsers([
        { id: "demo-twolfgang", handle: "twolfgang", avatar_url: "", verified: true },
        { id: "demo-mikefxpro", handle: "mikefxpro", avatar_url: "", verified: false },
        { id: "demo-sarahreads", handle: "sarahreads", avatar_url: "", verified: false },
      ]);
      setModalLoading(false);
      return;
    }
    setModalLoading(true);
    const res = await fetch(`/api/profile/${handle}/followers`);
    if (res.ok) {
      const d = await res.json();
      setModalUsers(type === "followers" ? d.followers : d.following);
    }
    setModalLoading(false);
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center space-y-4">
        <p className="text-gray-400 text-lg">Trader not found.</p>
        <div className="flex justify-center">
          <BackButton />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  const { profile, trades } = data;
  const initials = profile.handle.slice(0, 2).toUpperCase();
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? Math.round((winningTrades / trades.length) * 100) : 0;
  const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;
  const bestTrade = trades.length > 0 ? trades.reduce((best, t) => t.pnl > best.pnl ? t : best, trades[0]) : null;
  const isOwnProfile = data?.isOwner ?? false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 -mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
          <span className="text-lg font-semibold text-white truncate">@{profile.handle}</span>
        </div>
        {isOwnProfile && (
          <div ref={accountMenuRef} className="relative shrink-0">
            <button
              onClick={() => setAccountMenuOpen((o) => !o)}
              className="flex items-center gap-[3px] p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Account options"
            >
              <span className="w-[4px] h-[4px] rounded-[1px] bg-current" />
              <span className="w-[4px] h-[4px] rounded-[1px] bg-current" />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-7 w-52 solid-menu rounded-2xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border)]">
                  <p className="text-xs text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <button
                  onClick={() => { setAccountMenuOpen(false); openUserProfile(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  Manage account
                </button>
                <button
                  onClick={() => { setAccountMenuOpen(false); signOut(() => router.push("/")); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => profile.avatar_url && setAvatarOpen(true)}
              className={`w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-3xl ${profile.avatar_url ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-default"}`}
            >
              {profile.avatar_url && !avatarLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.handle}
                  className="w-24 h-24 rounded-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : initials}
            </button>
            {profile.verified && (
              <span className="flex items-center gap-1 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-full px-2 py-0.5">
                <VerifiedBadge className="w-3 h-3" />
                <span className="text-xs text-[var(--green)] font-semibold">Verified</span>
              </span>
            )}
            {profile.handle === "scottprofits" && <FounderBadge />}
            {profile.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo_url} alt="brand logo" className="w-12 h-12 object-contain mt-1" style={{ mixBlendMode: "screen" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {profile.full_name && <p className={clsx(nameSizeClass(profile.full_name), "text-gray-300 whitespace-nowrap")}>{profile.full_name}</p>}
            <div className="flex flex-col items-center gap-1 mt-1 w-fit">
              {profile.trading_style && (
                <span className="flex items-center text-xs leading-none bg-white/5 border border-[var(--border)] text-gray-400 px-2 py-1 rounded-full whitespace-nowrap">
                  {profile.trading_style}
                </span>
              )}
              {profile.brokerage && profile.brokerage !== "Other" && (
                <span className="flex items-center text-xs leading-none text-gray-500 whitespace-nowrap">{profile.brokerage}</span>
              )}
            </div>
          </div>
          </div>

          <div className="flex gap-2 flex-shrink-0 items-start">
            {isOwnProfile ? (
              <div className="flex flex-col items-end gap-2">
                <Link
                  href="/messages"
                  aria-label="Messages"
                  className="w-9 h-9 flex items-center justify-center rounded-full solid-menu text-gray-300 hover:text-white transition-colors shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
                <Link href="/settings" className="px-4 py-2 text-sm font-medium border border-[var(--border)] text-gray-400 hover:text-white rounded-lg transition-colors whitespace-nowrap">
                  Edit Profile
                </Link>
                <button
                  onClick={() => setWatchlistOpen(true)}
                  className="px-4 py-2 text-sm font-medium border border-[var(--border)] text-gray-400 hover:text-white rounded-lg transition-colors text-left whitespace-nowrap"
                >
                  Watchlist
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={clsx(
                    "px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                    following
                      ? "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40"
                      : "bg-[var(--green)] text-black hover:bg-[var(--green)]/90"
                  )}
                >
                  {following ? "Following ✓" : "Follow"}
                </button>
                <button
                  onClick={() => router.push(`/messages/${handle}`)}
                  className="p-1.5 sm:p-2 border border-[var(--border)] text-gray-400 hover:text-white rounded-lg transition-colors shrink-0"
                  title="Send message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {profile.bio && <p className="text-gray-300 text-sm mt-4 text-left leading-relaxed break-words whitespace-pre-wrap">{profile.bio}</p>}

        {/* Social links */}
        {(() => {
          const SOCIALS = [
            { key: "instagram", icon: "📸", prefix: "IG", buildUrl: (v: string) => `https://instagram.com/${extractHandle(v)}` },
            { key: "tiktok", icon: "🎵", prefix: "TT", buildUrl: (v: string) => `https://tiktok.com/@${extractHandle(v).replace(/^@/, "")}` },
            { key: "discord", icon: "🎮", prefix: "Discord", buildUrl: (v: string) => v.startsWith("http") ? v : `https://${v}` },
            { key: "youtube", icon: "▶️", prefix: "YT", buildUrl: (v: string) => `https://youtube.com/@${extractHandle(v).replace(/^@/, "")}` },
            { key: "website", icon: "🌐", prefix: "", buildUrl: (v: string) => v.startsWith("http") ? v : `https://${v}` },
          ];
          const active = SOCIALS.filter((s) => profile[s.key as keyof typeof profile]);
          if (!active.length) return null;
          return (
            <div className="flex flex-wrap gap-2 mt-3">
              {active.map((s) => {
                const val = profile[s.key as keyof typeof profile] as string;
                const handle = extractHandle(val);
                const label = s.prefix ? `${s.prefix}/${handle.replace(/^@/, "")}` : handle;
                return (
                  <a key={s.key} href={s.buildUrl(val)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 text-gray-400 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                    <span>{s.icon}</span>
                    {label}
                  </a>
                );
              })}
            </div>
          );
        })()}
        <BadgeDisplay handle={profile.handle} />

        {/* Stats row */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5 pt-5 border-t border-[var(--border)]">
          <button onClick={() => openModal("followers")} className="text-center hover:opacity-75 transition-opacity">
            <p className="font-bold text-white text-base sm:text-lg">{followerCount.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Followers</p>
          </button>
          <button onClick={() => openModal("following")} className="text-center hover:opacity-75 transition-opacity">
            <p className="font-bold text-white text-base sm:text-lg">{data.followingCount.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Following</p>
          </button>
          <div className="text-center">
            <p className="font-bold text-white text-base sm:text-lg">{trades.length}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Trades</p>
          </div>
          <div className="text-center">
            <p className={clsx("font-bold text-base sm:text-lg", totalPnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Total P&L</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-base sm:text-lg">{winRate}%</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Win Rate</p>
          </div>
          <div className="text-center">
            <p className={clsx("font-bold text-base sm:text-lg", avgPnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
              {trades.length > 0 ? `${avgPnl >= 0 ? "+" : ""}$${Math.abs(avgPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Avg P&L</p>
          </div>
          <div className="text-center">
            <p className={clsx("font-bold text-base sm:text-lg", bestTrade && bestTrade.pnl >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
              {bestTrade ? `+$${Math.abs(bestTrade.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Best Trade</p>
          </div>
        </div>
      </div>

      {/* Trade history */}
      <div className="space-y-3">
        <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setTradeHistoryTab("history")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors",
              tradeHistoryTab === "history" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Trade History
          </button>
          <button
            onClick={() => setTradeHistoryTab("videos")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors",
              tradeHistoryTab === "videos" ? "bg-[var(--green)]/15 text-[var(--green)]" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Trader Videos
          </button>
        </div>

        {(() => {
          const displayedTrades = tradeHistoryTab === "videos" ? trades.filter((t) => isVideoUrl(t.image_url)) : trades;
          return (
            <>
              <h2 className="font-semibold text-white">
                {tradeHistoryTab === "videos" ? "Trader Videos" : "Trade history"} ({displayedTrades.length})
              </h2>

              {displayedTrades.length === 0 && (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-gray-500 text-sm">
                    {tradeHistoryTab === "videos" ? "No videos posted yet." : "No trades posted yet."}
                  </p>
                </div>
              )}

              {[...displayedTrades]
          .sort((a, b) => {
            if (a.id === pinnedTradeId) return -1;
            if (b.id === pinnedTradeId) return 1;
            return 0;
          })
          .map((t) => {
            const isPinned = t.id === pinnedTradeId;
            const tradeObj: TradeCardTrade = {
              id: t.id,
              traderId: profile.id,
              ticker: t.ticker,
              direction: t.direction === "LONG" ? "Long" : "Short",
              shares: 0,
              time: timeAgo(t.created_at),
              createdAt: t.created_at,
              source: t.source ?? null,
              pnl: t.pnl,
              pnlPct: t.pnl_percent,
              notes: t.caption ?? "",
              likes: (t as { likes_count?: number }).likes_count ?? 0,
              comments: (t as { comments_count?: number }).comments_count ?? 0,
            };
            const traderObj: Trader = {
              id: profile.id,
              handle: profile.handle,
              displayName: profile.full_name || profile.handle,
              initials: profile.handle.slice(0, 2).toUpperCase(),
              color: "#6366F1",
              brokerage: profile.brokerage ?? "",
              verified: profile.verified,
              followers: 0, following: 0, winRate: 0, pnlMonth: 0, categories: [],
            };
            return (
              <div key={t.id} className="relative">
                {isPinned && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-1 ml-1">
                    <Pin className="w-3 h-3" />
                    Pinned trade
                  </div>
                )}
                <TradeCard
                  trade={tradeObj}
                  trader={traderObj}
                  imageUrl={t.image_url ?? undefined}
                  avatarUrl={profile.avatar_url ?? undefined}
                  strategy={(t as { strategy?: string }).strategy ?? undefined}
                />
                {isOwnProfile && (
                  <button
                    onClick={() => handlePin(t.id)}
                    className={`absolute top-3 right-10 flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                      isPinned
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/40 hover:bg-amber-400/10"
                        : "bg-white/5 text-gray-500 border-[var(--border)] hover:text-amber-400 hover:border-amber-400/40"
                    }`}
                  >
                    {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    {isPinned ? "Unpin" : "Pin"}
                  </button>
                )}
              </div>
            );
              })}
            </>
          );
        })()}
      </div>

      {/* Liked posts — only visible to profile owner */}
      {isOwnProfile && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-current" /> Liked ({likedItems.length})
          </h2>

          {likedItems.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">Nothing liked yet.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
              {likedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                  <SafeAvatar src={item.profiles?.avatar_url} alt="" initials={item.profiles?.handle ?? "?"} className="w-9 h-9 text-xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link href={`/profile/${item.profiles?.handle}`} className="text-sm font-semibold text-white hover:text-[var(--green)] transition-colors">
                        @{item.profiles?.handle}
                      </Link>
                      {item.type === "trade" ? (
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-semibold", (item.pnl ?? 0) >= 0 ? "bg-[var(--green)]/20 text-[var(--green)]" : "bg-[var(--red)]/20 text-[var(--red)]")}>
                          {(item.pnl ?? 0) >= 0 ? "+" : ""}${Math.abs(item.pnl ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> post
                        </span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    {item.type === "trade" ? (
                      <div className="flex items-center gap-1.5">
                        {(item.direction === "LONG" || item.direction === "Long")
                          ? <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />
                          : <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />}
                        <p className="text-sm text-gray-400">${item.ticker}{item.caption ? ` · ${item.caption.slice(0, 60)}${item.caption.length > 60 ? "…" : ""}` : ""}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">{item.content?.slice(0, 80)}{(item.content?.length ?? 0) > 80 ? "…" : ""}</p>
                    )}
                  </div>
                  <Heart className="w-4 h-4 text-pink-400 fill-current shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist modal */}
      <WatchlistSection
        handle={profile.handle}
        isOwner={isOwnProfile}
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
      />

      {/* Broker Connections — visible to everyone, Connect button only for owner */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--green)]" /> Broker Connections
        </h2>
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}
            >
              <TrendingUp className="w-4 h-4 text-[#00C896]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Rithmic</p>
              <p className="text-[11px] text-gray-500">Futures broker — verified fills</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {isOwnProfile ? (
              <button
                onClick={() => setRithmicModalOpen(true)}
                className="text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "rgba(0,200,150,0.12)",
                  border: "1px solid rgba(0,200,150,0.3)",
                  color: "#00C896",
                }}
              >
                Connect
              </button>
            ) : (
              <span className="text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
                Not connected
              </span>
            )}
            {/* Rithmic attribution requirement */}
            <img src="/brokers/rithmic-logo-white.png" alt="Market Data by Rithmic" className="h-3 opacity-25" />
          </div>
        </div>
      </div>

      {/* Private journal — own profile only */}
      {isOwnProfile && <JournalSection />}

      {/* Followers / Following modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="solid-menu rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-bold text-white capitalize">{modal}</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {modalLoading && <p className="text-center text-gray-500 text-sm py-6">Loading...</p>}
              {!modalLoading && modalUsers.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-6">No {modal} yet.</p>
              )}
              {modalUsers.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.handle}`}
                  onClick={() => setModal(null)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg)] transition-colors"
                >
                  <SafeAvatar src={u.avatar_url} alt={u.handle} initials={u.handle} className="w-10 h-10 text-sm" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-white truncate">@{u.handle}</span>
                    {u.verified && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rithmic connect modal */}
      {rithmicModalOpen && (
        <RithmicConnectModal
          onClose={() => setRithmicModalOpen(false)}
          onSuccess={() => setRithmicModalOpen(false)}
        />
      )}

      {/* Avatar lightbox */}
      {avatarOpen && profile.avatar_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setAvatarOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url}
            alt={profile.handle}
            className="w-[90vw] h-[90vw] max-w-lg max-h-[80vh] rounded-full object-cover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
