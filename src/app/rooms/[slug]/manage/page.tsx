"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronUp, ChevronDown, Camera } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import BackButton from "@/components/ui/BackButton";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/apiError";

interface Room {
  id: string; name: string; slug: string; description: string | null;
  visibility: string; owner_id: string; price_cents: number | null;
  show_on_profile: boolean; avatar_url: string | null;
}
interface Member {
  user_id: string; role: string; status: string; joined_at: string;
  profile: { handle: string; avatar_url: string; verified: boolean } | null;
}
interface Topic { id: string; name: string; slug: string; position: number; mods_only_posts?: boolean }

export default function ManageRoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
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
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { userId } = useAuth();

  const load = useCallback(async () => {
    const res = await fetch(`/api/rooms/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setMe(data.membership);
    setName(data.room.name);
    setDescription(data.room.description ?? "");
    setShowOnProfile(data.room.show_on_profile ?? true);
    setVisibility(data.room.visibility === "unlisted" ? "unlisted" : "public");
    setAvatarUrl(data.room.avatar_url ?? null);
    setTopics(data.channels ?? []);
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

  async function uploadAvatar(file: File) {
    if (!room || !userId) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/room-${room.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("trade-images").upload(path, file, { contentType: file.type, upsert: true });
    if (!error) {
      const url = supabase.storage.from("trade-images").getPublicUrl(path).data.publicUrl;
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (res.ok) setAvatarUrl(url);
      else alert(await errorMessage(res));
    } else {
      alert("Upload failed");
    }
    setUploadingAvatar(false);
  }

  async function saveMeta() {
    if (!room) return;
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function changeVisibility(next: "public" | "unlisted") {
    if (!room || next === visibility) return;
    setVisibility(next);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (!res.ok) {
      setVisibility(next === "public" ? "unlisted" : "public");
      alert(await errorMessage(res));
    }
  }

  async function toggleShowOnProfile() {
    if (!room) return;
    const next = !showOnProfile;
    setShowOnProfile(next);
    await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showOnProfile: next }),
    }).catch(() => setShowOnProfile(!next));
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
      setPriceMsg(cents > 0 ? `Members now pay $${(cents / 100).toFixed(2)}/mo` : "Channel is now free");
      load();
    } else {
      setPriceMsg(await errorMessage(res));
    }
  }

  async function renameTopic(topic: Topic) {
    const next = prompt("Rename topic", topic.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === topic.name) return;
    const res = await fetch(`/api/channels/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTopics((t) => t.map((x) => (x.id === topic.id ? { ...x, name: updated.name } : x)));
    } else {
      alert(await errorMessage(res));
    }
  }

  async function deleteTopic(topic: Topic) {
    if (!confirm(`Delete #${topic.name}? Its messages will be removed.`)) return;
    const res = await fetch(`/api/channels/${topic.id}`, { method: "DELETE" });
    if (res.ok) setTopics((t) => t.filter((x) => x.id !== topic.id));
    else alert(await errorMessage(res));
  }

  async function moveTopic(index: number, dir: -1 | 1) {
    if (!room) return;
    const target = index + dir;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    [next[index], next[target]] = [next[target], next[index]];
    setTopics(next);
    await fetch(`/api/rooms/${room.id}/channels`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
    }).catch(() => load());
  }

  async function deleteChannel() {
    if (!room) return;
    if (prompt(`This permanently deletes "${room.name}" and every message in it. Type the name to confirm:`) !== room.name) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (res.ok) router.push("/rooms");
    else alert(await errorMessage(res));
  }

  async function toggleModsOnly(topic: Topic) {
    const next = !topic.mods_only_posts;
    setTopics((t) => t.map((x) => (x.id === topic.id ? { ...x, mods_only_posts: next } : x)));
    const res = await fetch(`/api/channels/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modsOnly: next }),
    });
    if (!res.ok) {
      setTopics((t) => t.map((x) => (x.id === topic.id ? { ...x, mods_only_posts: !next } : x)));
      alert(await errorMessage(res));
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
    else alert(await errorMessage(res));
  }

  if (forbidden) return <p className="text-gray-500 text-sm text-center pt-20">You don&apos;t manage this channel.</p>;
  if (!room) return <p className="text-gray-500 text-sm text-center pt-20">Loading...</p>;

  const isOwner = me?.role === "owner";

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <BackButton fallbackHref={`/rooms/${slug}`} iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">Manage {room.name}</h1>

      <section className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details</h2>

        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer shrink-0">
            <SafeAvatar src={avatarUrl} alt={name} initials={name || room.name} className="w-16 h-16 rounded-2xl text-lg" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--green)] text-black flex items-center justify-center border-2 border-[var(--card,#111)]">
              <Camera className="w-3 h-3" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
            />
          </label>
          <p className="text-xs text-gray-500">{uploadingAvatar ? "Uploading…" : "Tap the photo to set a channel image."}</p>
        </div>

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

      <section className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visibility</h2>
        <div className="flex gap-2">
          {(["public", "unlisted"] as const).map((v) => (
            <button
              key={v}
              onClick={() => changeVisibility(v)}
              className={`flex-1 text-sm py-2 rounded-lg border capitalize transition-colors ${
                visibility === v
                  ? "border-[var(--green)] text-white bg-[var(--green)]/10"
                  : "border-[var(--border)] text-gray-400 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600">
          {visibility === "unlisted"
            ? "Hidden from Discover — only people with the invite link can find it."
            : "Shows in the Discover list for everyone."}
        </p>
      </section>

      <section className="glass-card rounded-2xl p-5 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invite link</h2>
        <p className="text-xs text-gray-500">Anyone with this link can open the channel and join.</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={typeof window !== "undefined" ? `${window.location.origin}/rooms/${slug}` : `/rooms/${slug}`}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-gray-300 outline-none"
          />
          <button
            onClick={async () => {
              const url = `${window.location.origin}/rooms/${slug}`;
              try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
              catch { prompt("Invite link", url); }
            }}
            className="text-sm font-semibold px-3 py-2 rounded-lg bg-[var(--green)] text-black shrink-0"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      {isOwner && (
        <section className="glass-card rounded-2xl p-5">
          <button
            onClick={toggleShowOnProfile}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm text-white font-medium">Show on my profile</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Adds a link to this channel on your public profile. Turn off if you&apos;re not looking for new members.
              </span>
            </span>
            <span
              className="relative w-10 h-6 rounded-full transition-colors shrink-0"
              style={{ background: showOnProfile ? "var(--green)" : "var(--border)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: showOnProfile ? "1.125rem" : "0.125rem" }}
              />
            </span>
          </button>
        </section>
      )}

      {isOwner && (
        <section className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Membership price</h2>
          {!payoutsEnabled ? (
            <p className="text-xs text-gray-500">
              Connect payouts first to charge for this channel.{" "}
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
              <p className="text-xs text-gray-600">Leave blank for a free channel. Ryzr keeps 4.5%. Existing members keep their current price until they resubscribe.</p>
              {priceMsg && <p className="text-xs text-gray-300">{priceMsg}</p>}
            </>
          )}
        </section>
      )}

      <section className="glass-card rounded-2xl overflow-hidden">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 p-4 pb-2">Topics</h2>
        {topics.map((t, i) => (
          <div key={t.id} className="px-4 py-3 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col -my-1">
                <button
                  onClick={() => moveTopic(i, -1)}
                  disabled={i === 0}
                  className="text-gray-500 hover:text-white disabled:opacity-20 leading-none"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveTopic(i, 1)}
                  disabled={i === topics.length - 1}
                  className="text-gray-500 hover:text-white disabled:opacity-20 leading-none"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <span className="text-gray-500">#</span>
              <span className="flex-1 text-sm text-white truncate">{t.name}</span>
              <button onClick={() => renameTopic(t)} className="text-xs text-gray-400 hover:text-white">Rename</button>
            </div>
            <button onClick={() => toggleModsOnly(t)} className="w-full flex items-center justify-between gap-3 text-left">
              <span className="text-xs text-gray-500">
                {t.mods_only_posts ? "Admins only — members read & react" : "Everyone can post"}
              </span>
              <span
                className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                style={{ background: t.mods_only_posts ? "var(--green)" : "var(--border)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: t.mods_only_posts ? "1.125rem" : "0.125rem" }}
                />
              </span>
            </button>
            {topics.length > 1 && (
              <div className="pt-1 text-right">
                <button onClick={() => deleteTopic(t)} className="text-xs text-gray-600 hover:text-red-400">Delete topic</button>
              </div>
            )}
          </div>
        ))}
      </section>

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

      {isOwner && (
        <section className="glass-card rounded-2xl p-5 border border-red-500/20">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-red-400/80 mb-2">Danger zone</h2>
          <p className="text-xs text-gray-500 mb-3">
            Deleting the channel removes every topic, message and membership. This can&apos;t be undone.
          </p>
          <button onClick={deleteChannel} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25">
            Delete channel
          </button>
        </section>
      )}
    </div>
  );
}
