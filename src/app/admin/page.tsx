"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";

const ADMIN_ID = "user_3FjHwLbvzd59NATWEJDb6dwguxh";

interface Profile {
  id: string;
  handle: string;
  full_name: string;
  verified: boolean;
  avatar_url: string;
}

interface VerifyRequest {
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VerifyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [broadcastState, setBroadcastState] = useState<"idle" | "confirming" | "sending" | "done">("idle");
  const [broadcastCount, setBroadcastCount] = useState<number | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<{ notified: number; pushSent: number } | null>(null);

  async function startBroadcastConfirm() {
    const res = await fetch("/api/admin/broadcast-announcement?dryRun=1", { method: "POST" });
    const data = await res.json();
    setBroadcastCount(data.recipientCount ?? 0);
    setBroadcastState("confirming");
  }

  async function sendBroadcast() {
    setBroadcastState("sending");
    const res = await fetch("/api/admin/broadcast-announcement", { method: "POST" });
    const data = await res.json();
    setBroadcastResult({ notified: data.notified ?? 0, pushSent: data.pushSent ?? 0 });
    setBroadcastState("done");
  }

  useEffect(() => {
    if (userId === undefined) return;
    if (userId !== ADMIN_ID) { router.replace("/feed"); return; }
    fetch("/api/admin/verify")
      .then((r) => r.json())
      .then((d) => { setProfiles(d.profiles); setRequests(d.requests); setLoading(false); });
  }, [userId, router]);

  async function toggleVerified(handle: string, current: boolean, requestUserId?: string) {
    setToggling(handle);
    await fetch("/api/admin/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetHandle: handle, verified: !current, requestUserId }),
    });
    setProfiles((p) => p.map((u) => u.handle === handle ? { ...u, verified: !current } : u));
    if (requestUserId) setRequests((r) => r.filter((req) => req.user_id !== requestUserId));
    setToggling(null);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto pt-20 text-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );

  const requestedUserIds = new Set(requests.map((r) => r.user_id));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <VerifiedBadge className="w-6 h-6" />
      </div>

      {/* One-off Tradovate launch announcement */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-white">Broadcast: Tradovate is live</h2>
        <p className="text-sm text-gray-400">
          Sends an in-app notification + push to every user: &ldquo;🎉 Tradovate is now live! Connect it in Settings for a Verified P&amp;L badge — read/fill-only, no order placement.&rdquo;
        </p>

        {broadcastState === "idle" && (
          <button
            onClick={startBroadcastConfirm}
            className="px-4 py-2 text-sm font-medium bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/30 transition-colors"
          >
            Preview recipients
          </button>
        )}

        {broadcastState === "confirming" && (
          <div className="space-y-2">
            <p className="text-sm text-white">This will notify <span className="font-bold">{broadcastCount}</span> users. This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={sendBroadcast}
                className="px-4 py-2 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Send to {broadcastCount} users
              </button>
              <button
                onClick={() => setBroadcastState("idle")}
                className="px-4 py-2 text-sm font-medium bg-white/5 text-gray-400 border border-[var(--border)] rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {broadcastState === "sending" && <p className="text-sm text-gray-400">Sending...</p>}

        {broadcastState === "done" && broadcastResult && (
          <p className="text-sm text-[var(--green)]">
            Done — notified {broadcastResult.notified} users, {broadcastResult.pushSent} push notifications sent.
          </p>
        )}
      </div>

      {/* Pending verification requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            Verification Requests
            <span className="bg-[var(--green)] text-black text-xs font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
          </h2>
          {requests.map((req) => {
            const profile = profiles.find((p) => p.id === req.user_id);
            if (!profile) return null;
            return (
              <div key={req.user_id} className="bg-[var(--card)] border border-[var(--green)]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SafeAvatar src={profile.avatar_url} alt={profile.handle} initials={profile.handle} className="w-10 h-10 text-sm" />
                    <div>
                      <p className="font-semibold text-white">@{profile.handle}</p>
                      <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleVerified(profile.handle, false, req.user_id)}
                      disabled={toggling === profile.handle}
                      className="px-3 py-1.5 text-sm font-medium bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/30 transition-colors"
                    >
                      {toggling === profile.handle ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={async () => {
                        setToggling(profile.handle);
                        await fetch("/api/admin/verify", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ targetHandle: profile.handle, verified: false, requestUserId: req.user_id }),
                        });
                        setRequests((r) => r.filter((x) => x.user_id !== req.user_id));
                        setToggling(null);
                      }}
                      disabled={toggling === profile.handle}
                      className="px-3 py-1.5 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {req.reason && (
                  <p className="text-sm text-gray-300 bg-[var(--bg)] rounded-lg px-3 py-2">"{req.reason}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All users */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">All Users</h2>
        {profiles.map((p) => (
          <div key={p.id} className={`bg-[var(--card)] border rounded-xl p-4 flex items-center justify-between ${requestedUserIds.has(p.id) ? "border-[var(--green)]/20" : "border-[var(--border)]"}`}>
            <div className="flex items-center gap-3">
              <SafeAvatar src={p.avatar_url} alt={p.handle} initials={p.handle} className="w-10 h-10 text-sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">@{p.handle}</span>
                  {p.verified && <VerifiedBadge className="w-4 h-4" />}
                  {requestedUserIds.has(p.id) && <span className="text-xs text-[var(--green)] bg-[var(--green)]/10 px-1.5 py-0.5 rounded-full">Requested</span>}
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
