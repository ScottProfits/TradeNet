"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Room {
  id: string; name: string; slug: string; description: string | null;
  visibility: string; owner_id: string; price_cents: number | null;
}
interface Member {
  user_id: string; role: string; status: string; joined_at: string;
  profile: { handle: string; avatar_url: string; verified: boolean } | null;
}

export default function ManageRoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<{ role: string } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [priceDollars, setPriceDollars] = useState("");
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [priceMsg, setPriceMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/rooms/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setMe(data.membership);
    setName(data.room.name);
    setDescription(data.room.description ?? "");
    setPriceDollars(data.room.price_cents ? (data.room.price_cents / 100).toFixed(2) : "");
    const mRes = await fetch(`/api/rooms/${data.room.id}/members`);
    if (mRes.status === 403) { setForbidden(true); return; }
    if (mRes.ok) setMembers(await mRes.json());
    if (data.membership?.role === "owner") {
      const cRes = await fetch("/api/creator/onboard");
      if (cRes.ok) setPayoutsEnabled((await cRes.json()).payoutsEnabled);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function saveMeta() {
    if (!room) return;
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function savePrice() {
    if (!room) return;
    setPriceMsg(null);
    const cents = priceDollars.trim() ? Math.round(parseFloat(priceDollars) * 100) : 0;
    if (priceDollars.trim() && (!Number.isFinite(cents) || cents < 0)) {
      setPriceMsg("Enter a valid amount");
      return;
    }
    const res = await fetch(`/api/rooms/${room.id}/pricing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceCents: cents }),
    });
    if (res.ok) {
      setPriceMsg(cents > 0 ? `Members now pay $${(cents / 100).toFixed(2)}/mo` : "Room is now free");
      load();
    } else {
      setPriceMsg(await res.text());
    }
  }

  async function updateMember(userId: string, patch: { role?: string; status?: string }) {
    if (!room) return;
    const res = await fetch(`/api/rooms/${room.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) load();
    else alert(await res.text());
  }

  if (forbidden) return <p className="text-gray-500 text-sm text-center pt-20">You don&apos;t manage this room.</p>;
  if (!room) return <p className="text-gray-500 text-sm text-center pt-20">Loading...</p>;

  const isOwner = me?.role === "owner";

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <BackButton fallbackHref={`/rooms/${slug}`} iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">Manage {room.name}</h1>

      <section className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)]"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Description"
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)] resize-none"
        />
        <button onClick={saveMeta} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-[var(--green)] text-black">
          {saved ? "Saved" : "Save"}
        </button>
      </section>

      {isOwner && (
        <section className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Membership price</h2>
          {!payoutsEnabled ? (
            <p className="text-xs text-gray-500">
              Connect payouts first to charge for this room.{" "}
              <Link href="/settings/earnings" className="text-[var(--green)]">Set up earnings →</Link>
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">$</span>
                <input
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-24 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)]"
                />
                <span className="text-gray-500 text-sm">/ month</span>
                <button onClick={savePrice} className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-lg bg-[var(--green)] text-black">
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-600">Leave blank for a free room. Ryzr keeps 4.5%. Existing members keep their current price until they resubscribe.</p>
              {priceMsg && <p className="text-xs text-gray-300">{priceMsg}</p>}
            </>
          )}
        </section>
      )}

      <section className="glass-card rounded-2xl overflow-hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 p-4 pb-2">
          Members ({members.length})
        </h2>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
            <SafeAvatar src={m.profile?.avatar_url} alt={m.profile?.handle ?? ""} initials={m.profile?.handle ?? "?"} className="w-9 h-9 text-xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">@{m.profile?.handle}</span>
                {m.profile?.verified && <VerifiedBadge className="w-3 h-3" />}
              </div>
              <span className="text-xs text-gray-500 capitalize">
                {m.role}
                {m.status !== "active" && ` · ${m.status}`}
              </span>
            </div>
            {m.role !== "owner" && (
              <div className="flex gap-2 text-xs">
                {isOwner && m.status === "active" && (
                  <button
                    onClick={() => updateMember(m.user_id, { role: m.role === "mod" ? "member" : "mod" })}
                    className="text-gray-400 hover:text-white"
                  >
                    {m.role === "mod" ? "Remove mod" : "Make mod"}
                  </button>
                )}
                <button
                  onClick={() => updateMember(m.user_id, { status: m.status === "banned" ? "active" : "banned" })}
                  className={m.status === "banned" ? "text-gray-400 hover:text-white" : "text-red-400 hover:text-red-300"}
                >
                  {m.status === "banned" ? "Unban" : "Ban"}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
