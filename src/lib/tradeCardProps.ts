import { Trade, Trader } from "@/types";
import { timeAgo } from "@/lib/timeAgo";

export interface RealTrade {
  id: string;
  user_id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  shares: number;
  pnl: number;
  pnl_percent: number;
  caption: string;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  strategy: string | null;
  liked_by_me: boolean;
  verified_pnl: boolean;
  journal_note: string | null;
  created_at: string;
  source?: string | null;
  profiles: { id: string; handle: string; avatar_url: string; brokerage: string; verified: boolean };
}

export interface RealPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count?: number;
  liked_by_me?: boolean;
  created_at: string;
  profiles: { id: string; handle: string; avatar_url: string; verified: boolean } | null;
}

export function realTradeToCardProps(rt: RealTrade): { trade: Trade; trader: Trader } {
  const handle = rt.profiles?.handle ?? "unknown";
  const trader: Trader = {
    id: rt.user_id, handle, displayName: handle, initials: handle.slice(0, 2).toUpperCase(),
    color: "#6366F1", brokerage: rt.profiles?.brokerage ?? "", verified: rt.profiles?.verified ?? false,
    followers: 0, following: 0, winRate: 0, pnlMonth: 0, categories: [],
  };
  const trade: Trade = {
    id: rt.id, traderId: rt.user_id, ticker: rt.ticker,
    direction: rt.direction === "LONG" ? "Long" : "Short", shares: 0,
    time: timeAgo(rt.created_at),
    createdAt: rt.created_at,
    source: rt.source ?? null,
    pnl: rt.pnl, pnlPct: rt.pnl_percent, notes: rt.caption ?? "",
    likes: rt.likes_count, comments: rt.comments_count,
  };
  return { trade, trader };
}
