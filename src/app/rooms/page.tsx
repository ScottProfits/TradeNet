"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Users, Plus, Lock } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  price_cents: number | null;
  member_count: number;
  visibility?: string;
  owner?: { handle: string; avatar_url: string; verified: boolean } | null;
}

function priceLabel(cents: number | null) {
  if (!cents || cents <= 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

export default function RoomsPage() {
  const { userId } = useAuth();
  const [discover, setDiscover] = useState<Room[]>([]);
  const [mine, setMine] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rooms").then((r) => (r.ok ? r.json() : [])),
      userId ? fetch("/api/rooms?mine=1").then((r) => (r.ok ? r.json() : [])) : Promise.resolve([]),
    ]).then(([d, m]) => {
      setDiscover(d);
      setMine(m);
      setLoading(false);
    });
  }, [userId]);

  const mineIds = new Set(mine.map((r) => r.id));
  const browse = discover.filter((r) => !mineIds.has(r.id));

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Channels</h1>
        <Link
          href="/rooms/new"
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-[var(--green)] text-black hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New channel
        </Link>
      </div>

      {loading && <p className="text-gray-500 text-sm text-center pt-10">Loading...</p>}

      {!loading && mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your channels</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            {mine.map((r) => (
              <RoomRow key={r.id} room={r} />
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Discover</h2>
          {browse.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Users className="w-9 h-9 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No channels to show yet.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              {browse.map((r) => (
                <RoomRow key={r.id} room={r} showOwner />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RoomRow({ room, showOwner }: { room: Room; showOwner?: boolean }) {
  const paid = !!room.price_cents && room.price_cents > 0;
  return (
    <Link
      href={`/rooms/${room.slug}`}
      className="flex items-center gap-3 p-4 hover:bg-[var(--bg)] transition-colors border-b border-[var(--border)] last:border-0"
    >
      <SafeAvatar src={room.avatar_url} alt={room.name} initials={room.name} className="w-11 h-11 rounded-xl" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-white truncate">{room.name}</span>
          {paid && <Lock className="w-3 h-3 text-[var(--green)] shrink-0" />}
          {room.visibility === "unlisted" && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 border border-[var(--border)] rounded px-1 py-px shrink-0">
              Unlisted
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {showOwner && room.owner ? (
            <>
              @{room.owner.handle}
              {room.owner.verified && <VerifiedBadge className="w-3 h-3 inline ml-0.5 -mt-0.5" />} ·{" "}
            </>
          ) : null}
          {room.description || `${room.member_count} member${room.member_count === 1 ? "" : "s"}`}
        </p>
      </div>
      <span className={`text-xs font-semibold shrink-0 ${paid ? "text-[var(--green)]" : "text-gray-500"}`}>
        {priceLabel(room.price_cents)}
      </span>
    </Link>
  );
}
