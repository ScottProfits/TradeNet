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
          <Link href="/market" className="text-xs text-gray-600 hover:text-[var(--green)] transition-colors">
            Market Hub →
          </Link>
        </div>
      </div>

      {/* High-impact event banner — only shown on event day before scheduled time */}
      {todayEvents.filter((e) => {
        if (e.impact !== "high") return false;
        // Parse "H:MM AM/PM ET" from detail and hide once that time has passed
        const match = e.detail?.match(/(\d+):(\d+)\s*(AM|PM)\s*ET/i);
        if (!match) return true; // no time found, show all day
        let hour = parseInt(match[1]);
        const min = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const etMinutes = etNow.getHours() * 60 + etNow.getMinutes();
        return etMinutes < hour * 60 + min;
      }).length > 0 && (
        <div
          className="mx-3 mb-3 rounded-xl px-4 py-3"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "#f87171", textShadow: "0 0 10px rgba(239,68,68,0.5)" }}
            >
              High Impact Events Today
            </span>
          </div>
          <div className="space-y-1.5">
            {todayEvents.filter((e) => {
              if (e.impact !== "high") return false;
              const match = e.detail?.match(/(\d+):(\d+)\s*(AM|PM)\s*ET/i);
              if (!match) return true;
              let hour = parseInt(match[1]);
              const min = parseInt(match[2]);
              const ampm = match[3].toUpperCase();
              if (ampm === "PM" && hour !== 12) hour += 12;
              if (ampm === "AM" && hour === 12) hour = 0;
              const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
              return etNow.getHours() * 60 + etNow.getMinutes() < hour * 60 + min;
            }).map((e, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-white truncate">{e.label}</span>
                </div>
                {e.detail && (
                  <span className="text-[10px] text-red-300/70 shrink-0 text-right">{e.detail}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
