"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, Newspaper } from "lucide-react";
import Link from "next/link";

interface CalendarEvent {
  date: string;
  label: string;
  type: string;
  impact: "high" | "medium";
  detail?: string;
}

interface TrendingTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

interface NewsItem {
  title: string;
  source: string;
  url: string;
  published: string;
}

interface MarketStatus {
  isOpen: boolean;
  isPremarket: boolean;
  isAfterHours: boolean;
  minutesUntilOpen: number;
  minutesUntilClose: number;
}

const EVENT_COLORS: Record<string, string> = {
  fomc: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  cpi: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  nfp: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  ppi: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  event: "text-green-400 bg-green-500/10 border-green-500/20",
};

const EVENT_ICONS: Record<string, string> = {
  fomc: "🏦", cpi: "📊", nfp: "💼", ppi: "🏭", event: "📅",
};

function formatCountdown(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "TODAY";
  if (diff === 1) return "TOMORROW";
  return `IN ${diff}D`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function MarketPage() {
  const [data, setData] = useState<{
    marketStatus: MarketStatus;
    upcomingEvents: CalendarEvent[];
    todayEvents: CalendarEvent[];
    trending: TrendingTicker[];
    news: NewsItem[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/market-events").then((r) => r.ok ? r.json() : null).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  const { marketStatus, upcomingEvents, todayEvents, trending, news } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Market Hub</h1>
        <div className="flex items-center gap-2">
          {marketStatus.isOpen ? (
            <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> MARKET OPEN
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> MARKET CLOSED
            </span>
          )}
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {marketStatus.isOpen
              ? `Closes in ${formatCountdown(marketStatus.minutesUntilClose)}`
              : `Opens in ${formatCountdown(marketStatus.minutesUntilOpen)}`}
          </span>
        </div>
      </div>

      {/* Today's events alert */}
      {todayEvents.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold text-sm">HIGH-IMPACT EVENTS TODAY</span>
          </div>
          <div className="space-y-2">
            {todayEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{EVENT_ICONS[e.type]}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{e.label}</p>
                  {e.detail && <p className="text-gray-400 text-xs">{e.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economic Calendar */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            📅 Economic Calendar <span className="text-xs text-gray-500 font-normal">Next 14 days</span>
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-8">No major events upcoming</p>
            ) : upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xl shrink-0">{EVENT_ICONS[e.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{e.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${EVENT_COLORS[e.type]}`}>
                      {e.impact.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(e.date)}{e.detail ? ` · ${e.detail}` : ""}</p>
                </div>
                <span className={`text-[10px] font-bold shrink-0 px-2 py-1 rounded ${
                  daysUntil(e.date) === "TODAY" ? "bg-red-500/20 text-red-400" :
                  daysUntil(e.date) === "TOMORROW" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-white/5 text-gray-500"
                }`}>{daysUntil(e.date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Trending Tickers */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">🔥 Trending Tickers</h2>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {trending.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-6">Loading…</p>
              ) : trending.map((t, i) => (
                <Link key={t.symbol} href={`/ticker/${encodeURIComponent(t.symbol)}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <span className="text-xs text-gray-600 w-4 font-mono shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{t.symbol}</p>
                    <p className="text-xs text-gray-500 truncate">{t.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-gray-300">${t.price.toFixed(2)}</p>
                    <p className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${t.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {t.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Market News */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">📰 Market News</h2>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {news.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-6">Loading…</p>
              ) : news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Newspaper className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{n.source} · {timeAgo(n.published)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
