"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

const ADMIN_ID = "user_3FjHwLbvzd59NATWEJDb6dwguxh";

interface Profile {
  id: string;
  handle: string;
  full_name: string;
  verified: boolean;
  avatar_url: string;
}

export default function AdminPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (userId === undefined) return;
    if (userId !== ADMIN_ID) { router.replace("/feed"); return; }
    fetch("/api/admin/verify")
      .then((r) => r.json())
      .then((d) => { setProfiles(d); setLoading(false); });
  }, [userId, router]);

  async function toggleVerified(handle: string, current: boolean) {
    setToggling(handle);
    await fetch("/api/admin/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetHandle: handle, verified: !current }),
    });
    setProfiles((p) =>
      p.map((u) => u.handle === handle ? { ...u, verified: !current } : u)
    );
    setToggling(null);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto pt-20 text-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Admin — Verification</h1>
        <VerifiedBadge className="w-6 h-6" />
      </div>
      <p className="text-gray-500 text-sm">Grant or revoke the bullish candle badge for any user.</p>

      <div className="space-y-3">
        {profiles.map((p) => (
          <div key={p.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatar_url} alt={p.handle} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {p.handle.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">@{p.handle}</span>
                  {p.verified && <VerifiedBadge className="w-4 h-4" />}
                </div>
                {p.full_name && <p className="text-xs text-gray-500">{p.full_name}</p>}
              </div>
            </div>

            <button
              onClick={() => toggleVerified(p.handle, p.verified)}
              disabled={toggling === p.handle}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                p.verified
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 hover:bg-[var(--green)]/30"
              }`}
            >
              {toggling === p.handle ? "..." : p.verified ? "Revoke" : "Verify"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
