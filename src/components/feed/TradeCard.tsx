"use client";
import { Heart, MessageCircle, Share2, Copy, Trash2 } from "lucide-react";
import { Trade, Trader } from "@/types";
import { clsx } from "clsx";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CommentSection from "@/components/feed/CommentSection";

interface TradeCardProps {
  trade: Trade;
  trader: Trader;
  imageUrl?: string;
  avatarUrl?: string;
  strategy?: string;
  onDelete?: (id: string) => void;
}

export default function TradeCard({ trade, trader, imageUrl, avatarUrl, strategy, onDelete }: TradeCardProps) {
  const { isSignedIn, userId } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(trade.likes);
  const [commentCount, setCommentCount] = useState(trade.comments);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const positive = trade.pnl >= 0;
  const isOwner = userId === trade.traderId;

  async function handleLike() {
    if (!isSignedIn || liking) return;
    setLiking(true);
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
    setLiking(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this trade?")) return;
    setDeleting(true);
    await fetch(`/api/trades/${trade.id}`, { method: "DELETE" });
    onDelete?.(trade.id);
  }

  return (
    <div className={clsx("bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3 transition-opacity", deleting && "opacity-40 pointer-events-none")}>
      <div className="flex items-start gap-3">
        {/* Avatar with verified badge overlay */}
        <Link href={`/profile/${trader.handle}`} className="flex-shrink-0 relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={trader.handle}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: trader.color }}
            >
              {trader.initials}
            </div>
          )}
          {trader.verified && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-[var(--bg)] rounded-full p-0.5">
              <VerifiedBadge className="w-3.5 h-3.5" />
            </span>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/profile/${trader.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
              @{trader.handle}
            </Link>
            <span
              className={clsx(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                positive
                  ? "bg-[var(--green)]/20 text-[var(--green)]"
                  : "bg-[var(--red)]/20 text-[var(--red)]"
              )}
            >
              {positive ? "+" : ""}${trade.pnl.toLocaleString()} today
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {trade.time} {trader.brokerage && `· ${trader.brokerage} verified`}
          </p>
        </div>

        {/* Delete button — only for post owner */}
        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-gray-600 hover:text-[var(--red)] transition-colors p-1 flex-shrink-0"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {trade.notes && <p className="text-sm text-gray-300 leading-relaxed">{trade.notes}</p>}
      {strategy && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-white/5 border border-[var(--border)] text-gray-400 px-2 py-0.5 rounded-full">📊 {strategy}</span>
        </div>
      )}

      {imageUrl && (
        <div className="rounded-lg overflow-hidden border border-[var(--border)]">
          {/\.(mp4|mov|webm|avi|mkv)/i.test(imageUrl) ? (
            <video src={imageUrl} controls className="w-full max-h-80 object-cover" />
          ) : (
            <Image
              src={imageUrl}
              alt="Trade screenshot"
              width={600}
              height={300}
              className="w-full object-cover"
              unoptimized
            />
          )}
        </div>
      )}

      <div className="bg-[var(--bg)] rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-white text-lg">{trade.ticker} {trade.direction === "Short" ? "485P" : ""}</p>
          <p className="text-xs text-gray-500">
            {trade.direction} · {trade.shares} {trade.direction === "Long" ? "shares" : "contracts"} · {trade.time}
          </p>
        </div>
        <div className="text-right">
          <p className={clsx("font-bold text-lg", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
            {positive ? "+" : ""}${trade.pnl.toLocaleString()}
          </p>
          <p className={clsx("text-sm", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
            {positive ? "+" : ""}{trade.pnlPct}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLike}
          disabled={liking}
          className={clsx(
            "flex items-center gap-1.5 text-sm transition-colors",
            liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400"
          )}
        >
          <Heart className={clsx("w-4 h-4", liked && "fill-current")} />
          {likeCount}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className={clsx("flex items-center gap-1.5 text-sm transition-colors", showComments ? "text-white" : "text-gray-500 hover:text-gray-300")}
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <Share2 className="w-4 h-4" />
          Share
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--green)] transition-colors ml-auto">
          <Copy className="w-4 h-4" />
          Copy trade
        </button>
      </div>

      {showComments && (
        <CommentSection
          tradeId={trade.id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
          onCountLoaded={(n) => setCommentCount(n)}
        />
      )}
    </div>
  );
}
