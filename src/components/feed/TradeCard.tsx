"use client";
import { Heart, MessageCircle, Share2, ShieldCheck, NotebookPen, Check, Mic } from "lucide-react";
import { Trade, Trader } from "@/types";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import ExpandableImage from "@/components/feed/ExpandableImage";
import ExpandableVideo from "@/components/feed/ExpandableVideo";
import VoiceNote from "@/components/feed/VoiceNote";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CommentSection from "@/components/feed/CommentSection";
import CommentPill from "@/components/feed/CommentPill";
import DeleteSheet from "@/components/ui/DeleteSheet";
import DotsMenu from "@/components/ui/DotsMenu";
import EditTradeModal from "@/components/feed/EditTradeModal";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { isToday } from "@/lib/timeAgo";
import { getLikeOverride, setLikeOverride, clearLikeOverride } from "@/lib/likeCache";
import { RepostBanner, RepostButton, type Reposter } from "@/components/feed/Repost";

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
  repostedBy?: Reposter | null;
  repostedByMe?: boolean;
  repostCount?: number;
  headerExtra?: ReactNode;
}

export default function TradeCard({ trade, trader, imageUrl, avatarUrl, strategy: initialStrategy, likedByMe, journalNote: initialJournal, entry = 0, exit = 0, rawShares = 0, onDelete, autoPlayVideo = false, repostedBy, repostedByMe, repostCount = 0, headerExtra }: TradeCardProps) {
  const { isSignedIn, userId } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const likeCacheKey = `trade:${trade.id}`;
  const [liked, setLiked] = useState(getLikeOverride(likeCacheKey) ?? likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(trade.likes);
  const [commentCount, setCommentCount] = useState(trade.comments);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [openAs, setOpenAs] = useState<{ mode: "text" | "voice"; n: number } | null>(null);
  const toggleComments = (mode: "text" | "voice") => {
    if (showComments && openAs?.mode === mode) { setShowComments(false); setOpenAs(null); return; }
    setShowComments(true);
    setOpenAs((prev) => ({ mode, n: (prev?.n ?? 0) + 1 }));
  };

  const [showJournal, setShowJournal] = useState(false);
  const [journalNote, setJournalNote] = useState(initialJournal ?? "");
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  // "Verified P&L" = the trade came in as a real broker fill, nothing else.
  const isFillVerified = trade.source === "rithmic" || trade.source === "tradovate";
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
    setLikeOverride(likeCacheKey, next);
    try {
      const res = await fetch("/api/like", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId: trade.id }),
      });
      if (!res.ok) throw new Error("like request failed");
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      clearLikeOverride(likeCacheKey);
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
      {repostedBy && <RepostBanner by={repostedBy} />}
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
            {isFillVerified && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-full px-1.5 py-0.5">
                <ShieldCheck className="w-3 h-3" /> Verified P&L
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {trade.time} {trader.brokerage && `· ${trader.brokerage}`}
          </p>
        </div>

        {(headerExtra || isOwner) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {headerExtra}
            {isOwner && (
              <DotsMenu
                onEdit={() => setShowEditModal(true)}
                onDelete={() => setShowDeleteSheet(true)}
              />
            )}
          </div>
        )}
      </div>

      {localNotes && <p className="text-sm text-gray-300 leading-relaxed">{localNotes}</p>}
      {localStrategy && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-white/5 border border-[var(--border)] text-gray-400 px-2 py-0.5 rounded-full">📊 {localStrategy}</span>
        </div>
      )}

      {trade.audioUrl && <VoiceNote src={trade.audioUrl} duration={trade.audioDuration ?? 0} />}

      {localImageUrl && (
        <div className="rounded-lg overflow-hidden border border-[var(--border)]">
          {isVideoUrl(localImageUrl) ? (
            <ExpandableVideo src={localImageUrl} />
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
          <img src="/brokers/omne-logo-white.png" alt="Powered by OMNE" className="h-3.5" />
        </div>
      )}

      <div className="flex items-center gap-2.5 pt-1">
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
          onClick={() => toggleComments("text")}
          className={clsx("flex items-center gap-1.5 text-sm transition-colors", showComments ? "text-white" : "text-gray-500 hover:text-gray-300")}
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount}
        </button>
        <RepostButton targetType="trade" targetId={trade.id} initialReposted={repostedByMe} count={repostCount} ownPost={isOwner} />
        <CommentPill onOpen={() => toggleComments("text")} active={showComments && openAs?.mode === "text"} />
        <button
          onClick={() => toggleComments("voice")}
          className={clsx(
            "shrink-0 flex items-center gap-1 rounded-md border px-2 py-[2px] text-[12px] transition-colors",
            showComments && openAs?.mode === "voice"
              ? "border-[var(--green)]/50 text-[var(--green)] bg-[var(--green)]/10"
              : "border-white/[0.08] bg-white/[0.03] text-gray-500 hover:text-gray-300 hover:border-white/15"
          )}
          aria-label="Voice comment"
        >
          <Mic className="w-3.5 h-3.5" /> Voice
        </button>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1d9bf0] transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          {isOwner && (
            <button onClick={() => setShowJournal((s) => !s)} className={clsx("flex items-center gap-1.5 text-sm transition-colors", showJournal ? "text-white" : "text-gray-500 hover:text-yellow-400")}>
              <NotebookPen className="w-4 h-4" />
              <span className="hidden sm:inline">Journal</span>
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

      {showComments && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-[var(--green)] uppercase tracking-wider mb-2">Trade Talk</p>
          <CommentSection
            tradeId={trade.id}
            openAs={openAs ?? undefined}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
            onCommentDeleted={() => setCommentCount((c) => Math.max(0, c - 1))}
            onCountLoaded={(n) => setCommentCount(n)}
          />
        </div>
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
