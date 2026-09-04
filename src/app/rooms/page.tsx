"use client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCachedFetch } from "@/lib/useCachedFetch";
import { Users, Plus, Lock, Compass, ChevronRight } from "lucide-react";
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
  const { data: discoverData, loading: discoverLoading } = useCachedFetch<Room[]>("rooms:discover", "/api/rooms");
  const { data: mineData, loading: mineLoading } = useCachedFetch<Room[]>(
    "rooms:mine",
    userId ? "/api/rooms?mine=1" : null
  );
  const discover = discoverData ?? [];
  const mine = mineData ?? [];
  const loading = (discoverLoading || mineLoading) && discover.length === 0 && mine.length === 0;

  const mineIds = new Set(mine.map((r) => r.id));
  const browse = discover.filter((r) => !mineIds.has(r.id));

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-4">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />

      {/* Hero */}
      <div
        className="rounded-3xl p-5 border border-[var(--border)] relative overflow-hidden"
        style={{ background: "radial-gradient(130% 120% at 0% 0%, rgba(0,200,150,0.16), transparent 55%)" }}
      >
        <h1 className="text-2xl font-bold text-white">Channels</h1>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Trading rooms with live chat, topics and daily recaps — free or members-only.
        </p>
        <Link
          href="/rooms/new"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-[var(--green)] text-black hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New channel
        </Link>
      </div>

      {loading && <p className="text-gray-500 text-sm text-center pt-6">Loading...</p>}

      {!loading && mine.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">Your channels</h2>
          <div className="space-y-2.5">
            {mine.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Discover
          </h2>
          {browse.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <Users className="w-9 h-9 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No public channels yet.</p>
              <p className="text-gray-600 text-xs mt-1">Start one and it&apos;ll show up here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {browse.map((r) => (
                <RoomCard key={r.id} room={r} showOwner />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RoomCard({ room, showOwner }: { room: Room; showOwner?: boolean }) {
  const paid = !!room.price_cents && room.price_cents > 0;
  return (
    <Link
      href={`/rooms/${room.slug}`}
      className="group flex items-center gap-3.5 p-3.5 rounded-2xl glass-card border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors"
    >
      <SafeAvatar
        src={room.avatar_url}
        alt={room.name}
        initials={room.name}
        className="w-14 h-14 rounded-2xl text-lg shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[15px] text-white truncate">{room.name}</span>
          {paid && <Lock className="w-3 h-3 text-[var(--green)] shrink-0" />}
          {room.visibility === "unlisted" && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--green)] border border-[var(--green)]/30 rounded px-1 py-px shrink-0">
              Unlisted
            </span>
          )}
        </div>
        {(room.description || (showOwner && room.owner)) && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-snug">
            {showOwner && room.owner ? (
              <span className="text-gray-500">
                @{room.owner.handle}
                {room.owner.verified && <VerifiedBadge className="w-3 h-3 inline ml-0.5 -mt-0.5" />}{" · "}
              </span>
            ) : null}
            {room.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
          <span className="text-gray-500 flex items-center gap-1">
            <Users className="w-3 h-3" /> {room.member_count}
          </span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded-full ${
              paid ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-white/[0.06] text-gray-400"
            }`}
          >
            {priceLabel(room.price_cents)}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[var(--green)] transition-colors shrink-0" />
    </Link>
  );
}
