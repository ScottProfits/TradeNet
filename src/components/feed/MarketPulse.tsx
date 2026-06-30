"use client";
import { useEffect, useState } from "react";
import { Clock, AlertTriangle, Newspaper, ChevronRight } from "lucide-react";
import Link from "next/link";

interface MarketStatus {
  isOpen: boolean;
  isPremarket: boolean;
  isAfterHours: boolean;
  minutesUntilOpen: number;
  minutesUntilClose: number;
  openMarkets: string[];
  isLondonOpen: boolean;
  isTokyoOpen: boolean;
  nyTime: string;
  lonTime: string;
  tokyoTime: string;
}

interface CalendarEvent {
  date: string;
  label: string;
  type: string;
  impact: "high" | "medium";
  detail?: string;
}

interface NewsItem {
  title: string;
  source: string;
  url: string;
  published: string;
}

interface MarketData {
  marketStatus: MarketStatus;
  upcomingEvents: CalendarEvent[];
  todayEvents: CalendarEvent[];
  news: NewsItem[];
}

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

export default function MarketPulse() {
  const [data, setData] = useState<MarketData | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "news">("events");

  useEffect(() => {
    function load() {
      fetch("/api/market-events")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setData(d); });
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const { marketStatus, upcomingEvents, todayEvents, news } = data;
  const ms = marketStatus;

  function daysUntil(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "TODAY";
    if (diff === 1) return "TOMORROW";
    return `IN ${diff}D`;
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden mb-4">

      {/* Market clocks row */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-b border-[var(--border)]">
        {[
          { name: "Tokyo", time: ms.tokyoTime, open: ms.isTokyoOpen, flag: "🇯🇵" },
          { name: "London", time: ms.lonTime, open: ms.isLondonOpen, flag: "🇬🇧" },
          { name: "New York", time: ms.nyTime, open: ms.isOpen, flag: "🇺🇸" },
        ].map((m) => (
          <div key={m.name} className="flex flex-col items-center py-2.5 px-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{m.flag}</span>
              <span className="text-xs font-semibold text-gray-400">{m.name}</span>
            </div>
            <span className="text-xs font-mono text-gray-300">{m.time}</span>
            <span className={`text-[10px] font-bold mt-0.5 ${m.open ? "text-green-400" : "text-gray-600"}`}>
              {m.open ? "● OPEN" : "● CLOSED"}
            </span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-2">
          {ms.openMarkets.length > 0 ? (
            <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {ms.openMarkets.join(" · ")} OPEN
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              ALL MARKETS CLOSED
            </span>
          )}
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {ms.isOpen
              ? `NY closes in ${formatCountdown(ms.minutesUntilClose)}`
              : ms.isPremarket
              ? `NY opens in ${formatCountdown(ms.minutesUntilOpen)}`
              : `NY opens in ${formatCountdown(ms.minutesUntilOpen)}`}
          </span>
        </div>
        {todayEvents.length > 0 && (
          <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            {todayEvents.length} event{todayEvents.length > 1 ? "s" : ""} today
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {([
          { key: "events", label: "📅 Events" },
          { key: "news", label: "📰 News" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-xs font-semibold py-2.5 transition-colors ${
              activeTab === t.key
                ? "text-white border-b-2 border-[var(--green)]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Events tab */}
      {activeTab === "events" && (
        <div className="divide-y divide-[var(--border)]">
          {upcomingEvents.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-6">No major events in the next 14 days</p>
          ) : (
            upcomingEvents.slice(0, 6).map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xl shrink-0">{EVENT_ICONS[e.type] ?? "📅"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{e.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${EVENT_COLORS[e.type]}`}>
                      {e.impact.toUpperCase()}
                    </span>
                  </div>
                  {e.detail && <p className="text-xs text-gray-500 mt-0.5">{e.detail}</p>}
                </div>
                <span className={`text-[10px] font-bold shrink-0 px-2 py-1 rounded ${
                  daysUntil(e.date) === "TODAY" ? "bg-red-500/20 text-red-400" :
                  daysUntil(e.date) === "TOMORROW" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-white/5 text-gray-500"
                }`}>
                  {daysUntil(e.date)}
                </span>
              </div>
            ))
          )}
          <Link href="/market" className="flex items-center justify-center gap-1 py-3 text-xs text-gray-500 hover:text-[var(--green)] transition-colors">
            View full calendar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* News tab */}
      {activeTab === "news" && (
        <div className="divide-y divide-[var(--border)]">
          {news.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-6">Loading news…</p>
          ) : (
            news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <Newspaper className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{n.source} · {timeAgo(n.published)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-700 shrink-0 mt-0.5" />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
