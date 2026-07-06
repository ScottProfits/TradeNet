"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Suggestion {
  id: string;
  handle: string;
  avatar_url: string | null;
  trading_style: string | null;
  verified: boolean;
}

export default function SuggestedTraders() {
  const [traders, setTraders] = useState<Suggestion[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/suggestions").then((r) => r.ok ? r.json() : []).then(setTraders);
  }, []);

  async function handleFollow(id: string, handle: string) {
    setFollowing((prev) => new Set(prev).add(id));
    await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetHandle: handle }),
    });
  }

  if (traders.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-white text-sm mb-3">Suggested traders</h3>
      <div className="space-y-3">
        {traders.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <Link href={`/profile/${t.handle}`} className="shrink-0">
              {t.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt={t.handle} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {t.handle.slice(0, 2).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link href={`/profile/${t.handle}`} className="text-sm text-gray-300 hover:text-white transition-colors truncate">
                  @{t.handle}
                </Link>
                {t.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
              </div>
              {t.trading_style && <p className="text-xs text-gray-500 truncate">{t.trading_style}</p>}
            </div>
            {following.has(t.id) ? (
              <span className="text-xs text-[var(--green)] font-semibold">Following ✓</span>
            ) : (
              <button
                onClick={() => handleFollow(t.id, t.handle)}
                className="text-xs text-[var(--green)] border border-[var(--green)]/30 px-2 py-0.5 rounded-full hover:bg-[var(--green)]/10 transition-colors shrink-0"
              >
                Follow
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
