"use client";
import { Heart, MessageCircle, Share2, Copy } from "lucide-react";
import { Trade, Trader } from "@/types";
import Avatar from "@/components/ui/Avatar";
import { clsx } from "clsx";
import { useState } from "react";

interface TradeCardProps {
  trade: Trade;
  trader: Trader;
}

export default function TradeCard({ trade, trader }: TradeCardProps) {
  const [liked, setLiked] = useState(false);
  const positive = trade.pnl >= 0;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar initials={trader.initials} color={trader.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">@{trader.handle}</span>
            {trader.verified && <span className="text-[var(--green)] text-xs">✓</span>}
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
            {trade.time} · {trader.brokerage} verified
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{trade.notes}</p>

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
          onClick={() => setLiked(!liked)}
          className={clsx(
            "flex items-center gap-1.5 text-sm transition-colors",
            liked ? "text-pink-400" : "text-gray-500 hover:text-pink-400"
          )}
        >
          <Heart className={clsx("w-4 h-4", liked && "fill-current")} />
          {trade.likes + (liked ? 1 : 0)}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <MessageCircle className="w-4 h-4" />
          {trade.comments}
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
    </div>
  );
}
