"use client";
import { useEffect, useState } from "react";

interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export default function BadgeDisplay({ handle }: { handle: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    fetch(`/api/badges?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setBadges);
  }, [handle]);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {badges.map((b) => (
        <div
          key={b.id}
          title={b.description}
          className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-default"
        >
          <span className="text-sm">{b.emoji}</span>
          <span className="text-xs font-medium text-gray-300">{b.label}</span>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {b.description}
          </div>
        </div>
      ))}
    </div>
  );
}
