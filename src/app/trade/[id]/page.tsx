"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Heart, Share2, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CommentSection from "@/components/feed/CommentSection";
import TradingViewChart from "@/components/ui/TradingViewChart";

interface TradeDetail {
  id: string;
  ticker: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_percent: number;
  shares: number;
  caption: string;
  image_url: string | null;
  strategy: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    brokerage: string;
  };
}

export default function TradePage() {
  const { id } = useParams<{ id: string }>();
  const { userId, isSignedIn } = useAuth();
  const router = useRouter();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showChart, setShowChart] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetch(`/api/trades/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (!d) return;
        setTrade(d);
        setLikeCount(d.likes_count ?? 0);
        setCommentCount(d.comments_count ?? 0);
      });
  }, [id]);

  async function handleLike() {
    if (!isSignedIn || !trade) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await fetch("/api/like", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: trade.id }),
      });
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Trade on Ryzr`, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  if (notFound) return (
    <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
      <p className="text-gray-400">Trade not found.</p>
      <Link href="/feed" className="text-[var(--green)] hover:underline text-sm">Back to feed</Link>
    </div>
  );

  if (!trade) return (
    <div className="max-w-2xl mx-auto py-16 text-center text-gray-500 text-sm">Loading...</div>
  );

  const profile = trade.profiles;
  const positive = trade.pnl >= 0;
  const isOwner = userId === trade.user_id;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm pt-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Trader header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${profile.handle}`}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.handle} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {profile.handle.slice(0, 2).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${profile.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
                @{profile.handle}
              </Link>
              {profile.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
            </div>
            <p className="text-xs text-gray-500">{new Date(trade.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
          </div>
          <span className={clsx("text-sm font-bold px-3 py-1 rounded-full", positive ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-[var(--red)]/15 text-[var(--red)]")}>
            {positive ? "+" : ""}${Math.abs(trade.pnl).toLocaleString()}
          </span>
        </div>

        {trade.caption && <p className="text-sm text-gray-300 leading-relaxed">{trade.caption}</p>}

        {/* Trade stats box */}
        <div className="bg-[var(--bg)] rounded-xl p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Ticker</p>
            <p className="font-bold text-white text-lg">${trade.ticker}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Direction</p>
            <div className="flex items-center gap-1.5">
              {trade.direction === "Long" || trade.direction === "LONG"
                ? <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                : <TrendingDown className="w-4 h-4 text-[var(--red)]" />}
              <p className={clsx("font-semibold", (trade.direction === "Long" || trade.direction === "LONG") ? "text-[var(--green)]" : "text-[var(--red)]")}>
                {trade.direction}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Entry</p>
            <p className="font-semibold text-white">${trade.entry_price?.toLocaleString() ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Exit</p>
            <p className="font-semibold text-white">${trade.exit_price?.toLocaleString() ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Size</p>
            <p className="font-semibold text-white">{trade.shares?.toLocaleString()} shares</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Return</p>
            <p className={clsx("font-bold", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {positive ? "+" : ""}{trade.pnl_percent?.toFixed(2) ?? "0.00"}%
            </p>
          </div>
        </div>

        {trade.strategy && (
          <span className="inline-block text-xs bg-white/5 border border-[var(--border)] text-gray-400 px-2.5 py-1 rounded-full">
            📊 {trade.strategy}
          </span>
        )}

        {trade.image_url && (
          <div className="rounded-lg overflow-hidden border border-[var(--border)]">
            {/\.(mp4|mov|webm)/i.test(trade.image_url) ? (
              <video src={trade.image_url} controls className="w-full max-h-80 object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trade.image_url} alt="Trade screenshot" className="w-full object-cover" />
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-5 pt-1 border-t border-[var(--border)]">
          <button
            onClick={handleLike}
            className={clsx("flex items-center gap-1.5 text-sm transition-colors", liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400")}
          >
            <Heart className={clsx("w-4 h-4", liked && "fill-current")} /> {likeCount}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Share2 className="w-4 h-4" /> {shared ? "Copied!" : "Share"}
          </button>
          <button
            onClick={() => setShowChart((s) => !s)}
            className={clsx("flex items-center gap-1.5 text-sm ml-auto transition-colors", showChart ? "text-[var(--green)]" : "text-gray-500 hover:text-gray-300")}
          >
            <BarChart2 className="w-4 h-4" /> {showChart ? "Hide chart" : "Show chart"}
          </button>
        </div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <TradingViewChart ticker={trade.ticker} />
        </div>
      )}

      {/* Comments */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Comments</h2>
        <CommentSection
          tradeId={trade.id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
          onCountLoaded={(n) => setCommentCount(n)}
        />
      </div>
    </div>
  );
}
