"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { TrendingUp, TrendingDown, X, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { clsx } from "clsx";
import Link from "next/link";

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
  const [modalUsers, setModalUsers] = useState<FollowUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

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
  const isOwnProfile = userId === profile.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.handle} className="w-16 h-16 rounded-full object-cover" />
              ) : initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">@{profile.handle}</h1>
                {profile.verified && (
                  <span className="flex items-center gap-1 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-full px-2 py-0.5">
                    <VerifiedBadge className="w-3.5 h-3.5" />
                    <span className="text-xs text-[var(--green)] font-semibold">Verified</span>
                  </span>
                )}
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

          {!isOwnProfile && (
            <div className="flex gap-2 flex-shrink-0">
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
            </div>
          )}
        </div>

        {profile.bio && <p className="text-gray-300 text-sm mt-4 text-left leading-relaxed break-words whitespace-pre-wrap">{profile.bio}</p>}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
          <button onClick={() => openModal("followers")} className="text-center hover:opacity-75 transition-opacity">
            <p className="font-bold text-white text-lg">{followerCount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </button>
          <button onClick={() => openModal("following")} className="text-center hover:opacity-75 transition-opacity">
            <p className="font-bold text-white text-lg">{data.followingCount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Following</p>
          </button>
          <div className="text-center">
            <p className={clsx("font-bold text-lg", totalPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500">Total P&L</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white text-lg">{winRate}%</p>
            <p className="text-xs text-gray-500">Win rate</p>
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
          const positive = t.pnl >= 0;
          return (
            <div key={t.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {t.direction === "LONG"
                    ? <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                    : <TrendingDown className="w-4 h-4 text-[var(--red)]" />}
                  <span className="font-bold text-white">{t.ticker}</span>
                  <span className="text-xs text-gray-500">{t.direction}</span>
                </div>
                <div className="text-right">
                  <p className={clsx("font-bold", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
                    {positive ? "+" : ""}${Math.abs(t.pnl).toLocaleString()}
                  </p>
                  <p className={clsx("text-xs", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
                    {positive ? "+" : ""}{t.pnl_percent.toFixed(2)}%
                  </p>
                </div>
              </div>

              {t.caption && <p className="text-sm text-gray-300">{t.caption}</p>}

              {t.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image_url} alt="Trade screenshot" className="w-full rounded-lg object-cover max-h-64" />
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Entry ${t.entry} → Exit ${t.exit}</span>
                <span>{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
