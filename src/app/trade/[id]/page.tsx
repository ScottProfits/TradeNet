"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Heart, Share2, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";
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

function VerifiedCandle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="14" y="2" width="4" height="6" rx="1" fill="#22c55e" />
      <rect x="10" y="8" width="12" height="16" rx="2" fill="#22c55e" />
      <rect x="14" y="24" width="4" height="6" rx="1" fill="#22c55e" />
      <path d="M6 12h4M22 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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
    const pnlStr = trade ? `${trade.pnl >= 0 ? "+" : ""}$${Math.abs(trade.pnl).toLocaleString()}` : "";
    const tweetText = trade ? `${pnlStr} $${trade.ticker} ${trade.direction} trade on Ryzr 📈` : "Check out this trade on Ryzr";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer,width=550,height=420");
  }

  if (notFound) return (
    <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
      <p className="text-gray-400">Trade not found.</p>
      <Link href="/" className="text-[var(--green)] hover:underline text-sm">Go to Ryzr</Link>
    </div>
  );

  if (!trade) return (
    <div className="max-w-2xl mx-auto py-16 text-center text-gray-500 text-sm">Loading...</div>
  );

  const profile = trade.profiles;
  const positive = trade.pnl >= 0;
  const isOwner = userId === trade.user_id;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* Back */}
      {isSignedIn ? (
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm pt-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : (
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm pt-2">
          <VerifiedCandle className="w-5 h-5" />
          <span className="font-bold text-white">Ryzr</span>
        </Link>
      )}

      {/* Trader header */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Link href={isSignedIn ? `/profile/${profile.handle}` : "/sign-up"}>
            <SafeAvatar src={profile.avatar_url} alt={profile.handle} initials={profile.handle} className="w-11 h-11" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={isSignedIn ? `/profile/${profile.handle}` : "/sign-up"} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
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

        {/* Trade stats */}
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
              <p className={clsx("font-semibold", (trade.direction === "Long" || trade.direction === "LONG") ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
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
            <p className={clsx("font-bold", positive ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
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
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d9bf0] transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
          {isSignedIn && (
            <button
              onClick={() => setShowChart((s) => !s)}
              className={clsx("flex items-center gap-1.5 text-sm ml-auto transition-colors", showChart ? "text-[var(--green)]" : "text-gray-500 hover:text-gray-300")}
            >
              <BarChart2 className="w-4 h-4" /> {showChart ? "Hide chart" : "Show chart"}
            </button>
          )}
        </div>
      </div>

      {/* Chart — only for signed-in users */}
      {isSignedIn && showChart && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <TradingViewChart ticker={trade.ticker} />
        </div>
      )}

      {/* Comments — blurred for logged-out */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Comments ({commentCount})</h2>
        {isSignedIn ? (
          <CommentSection
            tradeId={trade.id}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
            onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
            onCountLoaded={(n) => setCommentCount(n)}
          />
        ) : (
          <div className="text-center py-6 space-y-2">
            <p className="text-gray-500 text-sm">Sign up to read and post comments.</p>
            <Link href="/sign-up" className="inline-block px-4 py-2 bg-[var(--green)] text-black text-sm font-bold rounded-full hover:bg-[var(--green)]/90 transition-colors">
              Join Ryzr Free
            </Link>
          </div>
        )}
      </div>

      {/* Sticky CTA for logged-out visitors */}
      {!isSignedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Track trades like this one.</p>
              <p className="text-xs text-gray-500 truncate">Post your P&L. Build your track record. Get ranked.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
              <Link href="/sign-up" className="px-4 py-2 bg-[var(--green)] text-black text-sm font-bold rounded-full hover:bg-[var(--green)]/90 transition-colors whitespace-nowrap">
                Join Free →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
