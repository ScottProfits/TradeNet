"use client";
import { useEffect, useState, useRef } from "react";
import { clsx } from "clsx";

interface TickerItem {
  id: string;
  ticker: string;
  direction: string;
  pnl: number;
  profiles: { handle: string; verified: boolean } | null;
}

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function load() {
      fetch("/api/live-ticker").then((r) => r.ok ? r.json() : []).then(setItems);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="w-full overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-xl py-2 relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--card)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--card)] to-transparent z-10 pointer-events-none" />
      <div
        ref={trackRef}
        className="flex gap-6 animate-ticker whitespace-nowrap"
        style={{ width: "max-content" }}
      >
        {doubled.map((item, i) => {
          const positive = item.pnl >= 0;
          return (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs shrink-0">
              <span className="text-gray-500">@{item.profiles?.handle ?? "trader"}</span>
              <span className="font-bold text-white">${item.ticker}</span>
              <span className={clsx("font-semibold", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
                {positive ? "+" : ""}${Math.abs(item.pnl).toLocaleString()}
              </span>
              <span className="text-gray-700">·</span>
            </span>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker ${Math.max(items.length * 3, 20)}s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
