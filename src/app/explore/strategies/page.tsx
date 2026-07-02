"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, X, UserPlus, Check } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface HotStrategy { name: string; count: number; winRate: number; avgPnl: number; }

interface StrategyUser {
  id: string;
  handle: string;
  avatar_url: string;
  verified: boolean;
  trading_style: string | null;
  pnl: number;
  trades: number;
}

function Avatar({ url, handle }: { url: string; handle: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={handle} className="w-10 h-10 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
      {handle.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function StrategiesPage() {
  const { userId } = useAuth();
  const [strategies, setStrategies] = useState<HotStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HotStrategy | null>(null);
  const [users, setUsers] = useState<StrategyUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/explore")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.hotStrategies) setStrategies(d.hotStrategies); setLoading(false); });
  }, []);

  async function openStrategy(s: HotStrategy) {
    setSelected(s);
    setUsersLoading(true);
    const res = await fetch(`/api/explore/strategy-users?name=${encodeURIComponent(s.name)}`);
    const data: StrategyUser[] = res.ok ? await res.json() : [];
    setUsers(data);

    // Check which of these users the current user already follows
    if (data.length > 0) {
      const followRes = await fetch(`/api/follow/status?ids=${data.map((u) => u.id).join(",")}`);
      if (followRes.ok) {
        const followMap: Record<string, boolean> = await followRes.json();
        setFollowing((f) => ({ ...f, ...followMap }));
      }
    }

    setUsersLoading(false);
  }

  async function toggleFollow(userId: string, handle: string) {
    const isFollowing = following[userId];
    setFollowing((f) => ({ ...f, [userId]: !isFollowing }));
    await fetch("/api/follow", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetHandle: handle }),
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/feed?tab=explore" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Zap className="w-5 h-5 text-yellow-400" />
        <h1 className="text-lg font-bold text-white">Hot Strategies This Week</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-[var(--card)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <p className="text-gray-500 text-sm py-12 text-center">No strategy data yet this week.</p>
      ) : (
        <div className="space-y-3">
          {strategies.map((s, i) => (
            <button
              key={s.name}
              onClick={() => openStrategy(s)}
              className="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-yellow-400/40 transition-colors"
            >
              <span className="text-gray-600 font-mono text-sm w-5 text-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{s.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{s.count} {s.count === 1 ? "trade" : "trades"}</span>
                  <span>·</span>
                  <span className="text-[var(--green)]">{s.winRate}% win rate</span>
                </div>
              </div>
              <p className={`text-sm font-bold shrink-0 ${s.avgPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {s.avgPnl >= 0 ? "+" : ""}${Math.abs(s.avgPnl).toLocaleString()} avg
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Strategy detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl w-full max-w-lg flex flex-col"
            style={{ height: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h2 className="font-bold text-white">{selected.name}</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{selected.count} trades</span>
                  <span>·</span>
                  <span className="text-[var(--green)]">{selected.winRate}% win</span>
                  <span>·</span>
                  <span className={selected.avgPnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>
                    {selected.avgPnl >= 0 ? "+" : ""}${Math.abs(selected.avgPnl).toLocaleString()} avg
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User list */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2">Top Traders Using This Strategy</p>
              {usersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--bg)] rounded-xl animate-pulse" />
                ))
              ) : users.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No traders found for this strategy.</p>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-[var(--bg)] rounded-xl p-3">
                    <Link href={`/profile/${u.handle}`} onClick={() => setSelected(null)}>
                      <Avatar url={u.avatar_url} handle={u.handle} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.handle}`} onClick={() => setSelected(null)} className="flex items-center gap-1 hover:text-[var(--green)] transition-colors">
                        <span className="text-sm font-semibold text-white truncate">@{u.handle}</span>
                        {u.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{u.trades} trades</span>
                        <span>·</span>
                        <span className={u.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>
                          {u.pnl >= 0 ? "+" : ""}${Math.abs(u.pnl).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {u.id !== userId && (
                      <button
                        onClick={() => toggleFollow(u.id, u.handle)}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                          following[u.id]
                            ? "bg-[var(--green)]/20 text-[var(--green)] border-[var(--green)]/40"
                            : "border-[var(--border)] text-gray-400 hover:text-white hover:border-white/30"
                        }`}
                      >
                        {following[u.id] ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                        {following[u.id] ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
