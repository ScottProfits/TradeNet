"use client";
import { traders } from "@/lib/mock-data";
import Avatar from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { clsx } from "clsx";

export default function DiscoverPage() {
  const { isSignedIn } = useAuth();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function handleFollow(handle: string) {
    if (!isSignedIn || loading[handle]) return;
    setLoading((l) => ({ ...l, [handle]: true }));
    const isFollowing = followed[handle];
    setFollowed((f) => ({ ...f, [handle]: !isFollowing }));
    try {
      await fetch("/api/follow", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetHandle: handle }),
      });
    } catch {
      setFollowed((f) => ({ ...f, [handle]: isFollowing }));
    }
    setLoading((l) => ({ ...l, [handle]: false }));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Discover Traders</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {traders.map((t) => (
          <div key={t.id} className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar initials={t.initials} color={t.color} size="md" />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-white">@{t.handle}</span>
                  {t.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                </div>
                <p className="text-xs text-gray-500">{t.brokerage}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="font-bold text-white">{t.winRate}%</p>
                <p className="text-xs text-gray-500">Win rate</p>
              </div>
              <div>
                <p className={`font-bold ${t.pnlMonth >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red"}`}>
                  {t.pnlMonth >= 0 ? "+" : ""}${Math.abs(t.pnlMonth).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div>
                <p className="font-bold text-white">
                  {t.followers >= 1000 ? `${(t.followers / 1000).toFixed(1)}K` : t.followers}
                </p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {t.categories.map((c) => (
                <span key={c} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>

            <button
              onClick={() => handleFollow(t.handle)}
              disabled={loading[t.handle]}
              className={clsx(
                "w-full py-1.5 text-sm font-medium rounded-lg transition-colors",
                followed[t.handle]
                  ? "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/50"
                  : "text-[var(--green)] border border-[var(--green)]/30 hover:bg-[var(--green)]/10"
              )}
            >
              {followed[t.handle] ? "Following ✓" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
