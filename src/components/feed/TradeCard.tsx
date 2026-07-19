"use client";
import { Heart, MessageCircle, Share2, BarChart2, ShieldCheck, NotebookPen, Check } from "lucide-react";
import { Trade, Trader } from "@/types";
import { clsx } from "clsx";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import ExpandableImage from "@/components/feed/ExpandableImage";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CommentSection from "@/components/feed/CommentSection";
import DeleteSheet from "@/components/ui/DeleteSheet";
import DotsMenu from "@/components/ui/DotsMenu";
import TradingViewChart from "@/components/ui/TradingViewChart";
import EditTradeModal from "@/components/feed/EditTradeModal";
import { VIDEO_POSTER_DATA_URI } from "@/lib/videoPoster";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { isToday } from "@/lib/timeAgo";

interface TradeCardProps {
  trade: Trade;
  trader: Trader;
  imageUrl?: string;
  avatarUrl?: string;
  strategy?: string;
  likedByMe?: boolean;
  verifiedPnl?: boolean;
  journalNote?: string;
  entry?: number;
  exit?: number;
  rawShares?: number;
  onDelete?: (id: string) => void;
  autoPlayVideo?: boolean;
}

export default function TradeCard({ trade, trader, imageUrl, avatarUrl, strategy: initialStrategy, likedByMe, verifiedPnl, journalNote: initialJournal, entry = 0, exit = 0, rawShares = 0, onDelete, autoPlayVideo = false }: TradeCardProps) {
  const { isSignedIn, userId } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [liked, setLiked] = useState(likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(trade.likes);
  const [commentCount, setCommentCount] = useState(trade.comments);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showChart, setShowChart] = useState(false);

  const [showJournal, setShowJournal] = useState(false);
  const [journalNote, setJournalNote] = useState(initialJournal ?? "");
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [isVerified, setIsVerified] = useState(verifiedPnl ?? false);
  const [verifying, setVerifying] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [localTicker, setLocalTicker] = useState(trade.ticker);
  const [localDirection, setLocalDirection] = useState(trade.direction);
  const [localPnl, setLocalPnl] = useState(trade.pnl);
  const [localPnlPct, setLocalPnlPct] = useState(trade.pnlPct);
  const [localNotes, setLocalNotes] = useState(trade.notes ?? "");
  const [localStrategy, setLocalStrategy] = useState(initialStrategy ?? "");
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl ?? null);
  const positive = localPnl >= 0;
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

  async function handleShare() {
    const tradeUrl = `${window.location.origin}/trade/${trade.id}`;
    const pnlStr = `${trade.pnl >= 0 ? "+" : ""}$${Math.abs(trade.pnl).toLocaleString()}`;
    const text = `${pnlStr} $${trade.ticker} ${trade.direction} trade on Ryzr 📈`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Trade on Ryzr", text, url: tradeUrl });
        return;
      } catch { /* user cancelled */ return; }
    }
    // Fallback: copy link to clipboard
    await navigator.clipboard.writeText(tradeUrl);
    alert("Link copied to clipboard!");
  }

  async function saveJournal() {
    setSavingJournal(true);
    await fetch("/api/journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: trade.id, note: journalNote }),
    });
    setSavingJournal(false);
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2000);
  }

  async function handleVerify() {
    setVerifying(true);
    const res = await fetch("/api/verify-trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: trade.id }),
    });
    if (res.ok) setIsVerified(true);
    else alert(await res.text());
    setVerifying(false);
  }

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  async function handleDelete() {
    setShowDeleteSheet(false);
    setDeleting(true);
    await fetch(`/api/trades/${trade.id}`, { method: "DELETE" });
    onDelete?.(trade.id);
  }

  return (
    <div
      className={clsx("glass-card rounded-2xl p-3 sm:p-4 space-y-3 transition-opacity", deleting && "opacity-40 pointer-events-none")}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with verified badge overlay */}
        <Link href={`/profile/${trader.handle}`} className="flex-shrink-0 relative">
          {avatarUrl && !avatarFailed ? (
            <Image
              src={avatarUrl}
              alt={trader.handle}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
              unoptimized
              onError={() => setAvatarFailed(true)}
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
              {positive ? "+" : ""}${localPnl.toLocaleString()}{trade.createdAt && isToday(trade.createdAt) ? " today" : ""}
            </span>
            {isVerified && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-full px-1.5 py-0.5">
                <ShieldCheck className="w-3 h-3" /> Verified P&L
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {trade.time} {trader.brokerage && `· ${trader.brokerage}`}
          </p>
        </div>

        {isOwner && (
          <DotsMenu
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteSheet(true)}
          />
        )}
      </div>

      {localNotes && <p className="text-sm text-gray-300 leading-relaxed">{localNotes}</p>}
      {localStrategy && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-white/5 border border-[var(--border)] text-gray-400 px-2 py-0.5 rounded-full">📊 {localStrategy}</span>
        </div>
      )}

      {localImageUrl && (
        <div className="rounded-lg overflow-hidden border border-[var(--border)]">
          {isVideoUrl(localImageUrl) ? (
            <div className="relative">
              <video
                src={localImageUrl}
                poster={VIDEO_POSTER_DATA_URI}
                className="w-full max-h-80 object-cover"
                autoPlay
                muted
                loop
                playsInline
                onPlaying={() => setVideoPlaying(true)}
              />
              <img
                src={VIDEO_POSTER_DATA_URI}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-150 pointer-events-none"
                style={{ opacity: videoPlaying ? 0 : 1 }}
              />
            </div>
          ) : (
            <ExpandableImage src={localImageUrl} alt="Trade screenshot" />
          )}
        </div>
      )}

      <div className="bg-[var(--bg)] rounded-lg p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-white text-base sm:text-lg truncate">{localTicker}</p>
          <p className="text-xs text-gray-500 truncate">
            {localDirection} · {trade.shares > 0 ? `${trade.shares} ${localDirection === "Long" ? "shares" : "contracts"} · ` : ""}{trade.time}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={clsx("font-bold text-base sm:text-lg", positive ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
            {positive ? "+" : ""}${localPnl.toLocaleString()}
          </p>
          <p className={clsx("text-sm", positive ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
            {positive ? "+" : ""}{localPnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {trade.source === "rithmic" && (
        <div className="flex items-center gap-2.5 opacity-60">
          <img src="/brokers/rithmic-logo-white.png" alt="Trading Platform by Rithmic" className="h-3.5" />
          <span className="text-[10px] text-gray-500 font-medium tracking-wide">Powered by OMNE</span>
        </div>
      )}

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
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d9bf0] transition-colors">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button onClick={() => setShowChart((s) => !s)} className={clsx("flex items-center gap-1.5 text-sm transition-colors", showChart ? "text-white" : "text-gray-500 hover:text-gray-300")}>
          <BarChart2 className="w-4 h-4" />
          Chart
        </button>
        <div className="ml-auto flex items-center gap-3">
          {isOwner && (
            <button onClick={() => setShowJournal((s) => !s)} className={clsx("flex items-center gap-1.5 text-sm transition-colors", showJournal ? "text-white" : "text-gray-500 hover:text-yellow-400")}>
              <NotebookPen className="w-4 h-4" />
              <span className="hidden sm:inline">Journal</span>
            </button>
          )}
          {isOwner && !isVerified && (
            <button onClick={handleVerify} disabled={verifying} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--green)] transition-colors disabled:opacity-50">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{verifying ? "Verifying..." : "Verify"}</span>
            </button>
          )}
        </div>
      </div>

      {showJournal && isOwner && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-yellow-400 flex items-center gap-1"><NotebookPen className="w-3 h-3" /> Private Journal — only you can see this</p>
          <textarea
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            placeholder="What went right? What went wrong? How were you feeling?"
            rows={3}
            className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
          />
          <button
            onClick={saveJournal}
            disabled={savingJournal}
            className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50"
          >
            {journalSaved ? <><Check className="w-3 h-3" /> Saved!</> : savingJournal ? "Saving..." : "Save note"}
          </button>
        </div>
      )}

      {showChart && (
        <TradingViewChart ticker={trade.ticker} />
      )}

      {showComments && (
        <CommentSection
          tradeId={trade.id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
          onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
          onCountLoaded={(n) => setCommentCount(n)}
        />
      )}
      {showDeleteSheet && (
        <DeleteSheet
          label="trade"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteSheet(false)}
        />
      )}
      {showEditModal && (
        <EditTradeModal
          tradeId={trade.id}
          initial={{ ticker: localTicker, direction: localDirection as "Long" | "Short", entry, exit, shares: rawShares, notes: localNotes, strategy: localStrategy, imageUrl: localImageUrl }}
          onSaved={(u) => { setLocalTicker(u.ticker); setLocalDirection(u.direction === "LONG" ? "Long" : "Short"); setLocalPnl(u.pnl); setLocalPnlPct(u.pnlPct); setLocalNotes(u.notes); setLocalStrategy(u.strategy); setLocalImageUrl(u.imageUrl); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
