"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { X, MessageSquare, Heart, TrendingUp, TrendingDown, FileText } from "lucide-react";
import FounderBadge from "@/components/ui/FounderBadge";
import BadgeDisplay from "@/components/ui/BadgeDisplay";
import JournalSection from "@/components/profile/JournalSection";
import { useRouter } from "next/navigation";
import TradeCard from "@/components/feed/TradeCard";
import { Trade as TradeCardTrade, Trader } from "@/types";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { clsx } from "clsx";
import Link from "next/link";

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
}

interface ProfileData {
  profile: Profile;
  trades: Trade[];
  followersCount: number;
  followingCount: number;
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
  const { handle } = useParams<{ handle: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [modal, setModal] = useState<"followers" | "following" | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [modalUsers, setModalUsers] = useState<FollowUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);

  useEffect(() => {
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
      });
  }, [handle]);

  useEffect(() => {
    if (!data || !userId || userId !== data.profile.id) return;
    fetch("/api/liked")
      .then((r) => r.ok ? r.json() : [])
      .then(setLikedItems);
  }, [data, userId]);

  async function handleFollow() {
    if (!userId || followLoading) return;
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

  async function openModal(type: "followers" | "following") {
    setModal(type);
    setModalUsers([]);
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
      <div className="max-w-2xl mx-auto pt-20 text-center">
        <p className="text-gray-400 text-lg">Trader not found.</p>
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
  const isOwnProfile = userId === profile.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => profile.avatar_url && setAvatarOpen(true)}
              className={`w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 ${profile.avatar_url ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-default"}`}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.handle} className="w-16 h-16 rounded-full object-cover" />
              ) : initials}
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">@{profile.handle}</h1>
                {profile.verified && (
                  <span className="flex items-center gap-1 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-full px-2 py-0.5">
                    <VerifiedBadge className="w-3.5 h-3.5" />
                    <span className="text-xs text-[var(--green)] font-semibold">Verified</span>
                  </span>
                )}
                {profile.handle === "scottprofits" && <FounderBadge />}
              </div>
              {profile.full_name && <p className="text-gray-400 text-sm">{profile.full_name}</p>}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {profile.trading_style && (
                  <span className="text-xs bg-white/5 border border-[var(--border)] text-gray-400 px-2 py-0.5 rounded-full">
                    {profile.trading_style}
                  </span>
                )}
                {profile.brokerage && profile.brokerage !== "Other" && <p className="text-xs text-gray-500">{profile.brokerage}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {isOwnProfile ? (
              <Link href="/settings" className="px-4 py-2 text-sm font-medium border border-[var(--border)] text-gray-400 hover:text-white rounded-lg transition-colors">
                Edit Profile
              </Link>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    following
                      ? "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40"
                      : "bg-[var(--green)] text-black hover:bg-[var(--green)]/90"
                  )}
                >
                  {following ? "Following ✓" : "Follow"}
                </button>
                <button
                  onClick={() => router.push(`/messages/${handle}`)}
                  className="p-2 border border-[var(--border)] text-gray-400 hover:text-white rounded-lg transition-colors"
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
            <p className={clsx("font-bold text-base sm:text-lg", totalPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Total P&L</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-base sm:text-lg">{winRate}%</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Win Rate</p>
          </div>
          <div className="text-center">
            <p className={clsx("font-bold text-base sm:text-lg", avgPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {trades.length > 0 ? `${avgPnl >= 0 ? "+" : ""}$${Math.abs(avgPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Avg P&L</p>
          </div>
          <div className="text-center">
            <p className={clsx("font-bold text-base sm:text-lg", bestTrade && bestTrade.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {bestTrade ? `+$${Math.abs(bestTrade.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500">Best Trade</p>
          </div>
        </div>
      </div>

      {/* Trade history */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Trade history ({trades.length})</h2>

        {trades.length === 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No trades posted yet.</p>
          </div>
        )}

        {trades.map((t) => {
          const tradeObj: TradeCardTrade = {
            id: t.id,
            traderId: profile.id,
            ticker: t.ticker,
            direction: t.direction === "LONG" ? "Long" : "Short",
            shares: 0,
            time: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
            <TradeCard
              key={t.id}
              trade={tradeObj}
              trader={traderObj}
              imageUrl={t.image_url ?? undefined}
              avatarUrl={profile.avatar_url ?? undefined}
              strategy={(t as { strategy?: string }).strategy ?? undefined}
            />
          );
        })}
      </div>

      {/* Liked posts — only visible to profile owner */}
      {isOwnProfile && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400 fill-current" /> Liked ({likedItems.length})
          </h2>

          {likedItems.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Nothing liked yet.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {likedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                  {item.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {item.profiles?.handle?.slice(0, 2).toUpperCase() ?? "?"}
                    </div>
                  )}
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

      {/* Private journal — own profile only */}
      {isOwnProfile && <JournalSection />}

      {/* Followers / Following modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.handle} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {u.handle.slice(0, 2).toUpperCase()}
                    </div>
                  )}
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
