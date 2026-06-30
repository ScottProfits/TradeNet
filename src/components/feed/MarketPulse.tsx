"use client";
import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
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

function formatCountdown(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MarketPulse() {
  const [data, setData] = useState<{
    marketStatus: MarketStatus;
    todayEvents: CalendarEvent[];
  } | null>(null);

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

  const { marketStatus: ms, todayEvents } = data;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden mb-4">

      {/* Market clocks */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        {[
          { name: "Tokyo", time: ms.tokyoTime, open: ms.isTokyoOpen, flag: "🇯🇵" },
          { name: "London", time: ms.lonTime, open: ms.isLondonOpen, flag: "🇬🇧" },
          { name: "New York", time: ms.nyTime, open: ms.isOpen, flag: "🇺🇸" },
        ].map((m) => (
          <div key={m.name} className="flex flex-col items-center py-3 px-2">
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
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg)]">
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
              : `NY opens in ${formatCountdown(ms.minutesUntilOpen)}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {todayEvents.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {todayEvents.length} event{todayEvents.length > 1 ? "s" : ""} today
            </span>
          )}
          <Link href="/market" className="text-xs text-gray-600 hover:text-[var(--green)] transition-colors">
            Market Hub →
          </Link>
        </div>
      </div>
    </div>
  );
}
