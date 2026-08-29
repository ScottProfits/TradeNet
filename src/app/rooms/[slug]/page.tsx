"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Send, Hash, Lock, Plus, Users, Trash2, Flag, ImagePlus, X, SmilePlus } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ExpandableImage from "@/components/feed/ExpandableImage";
import ExpandableVideo from "@/components/feed/ExpandableVideo";
import { timeAgo } from "@/lib/timeAgo";
import { supabase } from "@/lib/supabase";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { extractVideoThumbnail } from "@/lib/extractVideoThumbnail";
import { errorMessage } from "@/lib/apiError";

const REACTIONS = ["👍", "🔥", "😂", "🚀", "💯", "👀", "❤️", "🎯"];

interface Channel { id: string; name: string; slug: string; position: number }
interface Room {
  id: string; name: string; slug: string; description: string | null;
  avatar_url: string | null; price_cents: number | null; member_count: number;
  owner_id: string; owner?: { handle: string; avatar_url: string; verified: boolean } | null;
}
interface Membership { role: "owner" | "mod" | "member"; status: string }
interface ChatMessage {
  id: string; sender_id: string; content: string; image_url: string | null;
  poster_url?: string | null;
  created_at: string; deleted: boolean; hidden?: boolean;
  reactions: Record<string, { count: number; mine: boolean }>;
  sender: { handle: string; avatar_url: string; verified: boolean } | null;
}

export default function RoomPage() {
  return (
    <Suspense fallback={null}>
      <RoomPageInner />
    </Suspense>
  );
}

function RoomPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [canParticipate, setCanParticipate] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const isMod = membership?.role === "owner" || membership?.role === "mod";

  const loadRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${slug}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setRoom(data.room);
    setChannels(data.channels);
    setMembership(data.membership);
    setCanParticipate(data.canParticipate);
    const wanted = searchParams.get("c");
    setActiveChannel((prev) => prev ?? (data.channels.find((c: Channel) => c.id === wanted)?.id ?? data.channels[0]?.id ?? null));
    setLoading(false);
  }, [slug, searchParams]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  const fetchMessages = useCallback(async (channelId: string, opts?: { silent?: boolean }) => {
    const res = await fetch(`/api/channels/${channelId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    const wasNearBottom =
      !scrollRef.current ||
      scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 140;
    const newLast = data.messages.at(-1)?.id ?? null;
    const hasNew = newLast !== lastIdRef.current;
    lastIdRef.current = newLast;
    setMessages(data.messages);
    if ((!opts?.silent || (hasNew && wasNearBottom)))
      setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 40);
  }, []);

  // Load + poll the active channel (Realtime is off for the client under
  // the RLS lockdown, same as DMs — a 4s poll keeps it live enough).
  useEffect(() => {
    if (!activeChannel || !canParticipate) return;
    lastIdRef.current = null;
    setMessages([]);
    fetchMessages(activeChannel);
    const t = setInterval(() => fetchMessages(activeChannel, { silent: true }), 4000);
    return () => clearInterval(t);
  }, [activeChannel, canParticipate, fetchMessages]);

  async function join() {
    if (!userId) { router.push("/sign-in"); return; }
    setJoining(true);
    const paidRoom = !!room!.price_cents && room!.price_cents > 0;
    if (paidRoom) {
      // Web-only Stripe Checkout. On iOS the WebView will open it; the
      // membership row is created by the webhook on return.
      const res = await fetch(`/api/rooms/${room!.id}/subscribe`, { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
        return;
      }
      alert(await errorMessage(res));
      setJoining(false);
      return;
    }
    const res = await fetch(`/api/rooms/${room!.id}/join`, { method: "POST" });
    if (res.ok) await loadRoom();
    setJoining(false);
  }

  async function openBillingPortal() {
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo: `/rooms/${slug}` }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      alert(await errorMessage(res));
    }
  }

  function pickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  function clearMedia() {
    setMedia(null);
    setMediaPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !media) || sending || !activeChannel) return;
    setSending(true);
    const body = text;
    const file = media;
    setText("");
    clearMedia();

    let imageUrl: string | null = null;
    let posterUrl: string | null = null;
    if (file && userId) {
      const ts = Date.now();
      const ext = file.name.split(".").pop();
      const path = `${userId}/room-${ts}.${ext}`;
      const { error } = await supabase.storage.from("trade-images").upload(path, file, { contentType: file.type });
      if (!error) imageUrl = supabase.storage.from("trade-images").getPublicUrl(path).data.publicUrl;
      if (file.type.startsWith("video/")) {
        const thumb = await extractVideoThumbnail(file);
        if (thumb) {
          const pPath = `${userId}/room-${ts}-poster.jpg`;
          const { error: pErr } = await supabase.storage.from("trade-images").upload(pPath, thumb, { contentType: "image/jpeg" });
          if (!pErr) posterUrl = supabase.storage.from("trade-images").getPublicUrl(pPath).data.publicUrl;
        }
      }
    }

    const res = await fetch(`/api/channels/${activeChannel}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: body, imageUrl, posterUrl }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((m) => [...m, { ...msg, reactions: {} }]);
      lastIdRef.current = msg.id;
      setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 40);
    } else {
      setText(body);
    }
    setSending(false);
  }

  async function toggleReaction(m: ChatMessage, emoji: string) {
    setReactingId(null);
    const mine = m.reactions[emoji]?.mine;
    setMessages((msgs) =>
      msgs.map((x) => {
        if (x.id !== m.id) return x;
        const r = { ...x.reactions };
        const cur = r[emoji] ?? { count: 0, mine: false };
        const next = { count: cur.count + (mine ? -1 : 1), mine: !mine };
        if (next.count <= 0) delete r[emoji];
        else r[emoji] = next;
        return { ...x, reactions: r };
      })
    );
    await fetch(`/api/channel-messages/${m.id}/react`, {
      method: mine ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).catch(() => {});
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, deleted: true, content: "" } : x)));
    await fetch(`/api/channel-messages/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function report(id: string) {
    const reason = prompt("Report this message — what's wrong with it?");
    if (reason === null) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "channel_message", targetId: id, reason }),
    }).catch(() => {});
    alert("Thanks — our team will review this within 24 hours.");
  }

  async function addChannel() {
    const name = prompt("New topic name");
    if (!name?.trim()) return;
    const res = await fetch(`/api/rooms/${room!.id}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const ch = await res.json();
      setChannels((c) => [...c, ch]);
      setActiveChannel(ch.id);
    } else {
      alert(await errorMessage(res));
    }
  }

  if (loading) return <p className="text-gray-500 text-sm text-center pt-20">Loading...</p>;
  if (!room) return <p className="text-gray-500 text-sm text-center pt-20">Room not found.</p>;

  const paid = !!room.price_cents && room.price_cents > 0;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100dvh-96px)]">
      {/* Header */}
      <div className="glass-card rounded-t-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <BackButton fallbackHref="/rooms" iconOnly className="text-gray-500 hover:text-white transition-colors" />
        <SafeAvatar src={room.avatar_url} alt={room.name} initials={room.name} className="w-9 h-9 rounded-lg text-sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white truncate">{room.name}</span>
            {paid && <Lock className="w-3.5 h-3.5 text-[var(--green)]" />}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Users className="w-3 h-3" /> {room.member_count}
            {room.owner && <> · @{room.owner.handle}</>}
          </p>
        </div>
        {isMod && (
          <Link href={`/rooms/${room.slug}/manage`} className="text-xs text-gray-400 hover:text-white">
            Manage
          </Link>
        )}
        {!isMod && canParticipate && paid && (
          <button onClick={openBillingPortal} className="text-xs text-gray-400 hover:text-white">
            Subscription
          </button>
        )}
      </div>

      {!canParticipate ? (
        <div className="flex-1 glass-card border-t-0 rounded-b-2xl flex flex-col items-center justify-center text-center p-8 gap-3">
          <Lock className="w-8 h-8 text-gray-600" />
          <p className="text-gray-300 text-sm max-w-sm">{room.description || `Join to see the conversation in ${room.name}.`}</p>
          {paid ? (
            <>
              <p className="text-white font-semibold">${(room.price_cents! / 100).toFixed(2)}/month</p>
              <p className="text-gray-500 text-xs max-w-xs">Secure checkout on Stripe. Cancel anytime.</p>
              <button onClick={join} disabled={joining} className="px-4 py-2 rounded-lg bg-[var(--green)] text-black text-sm font-semibold disabled:opacity-40">
                {joining ? "Starting checkout..." : "Subscribe"}
              </button>
            </>
          ) : (
            <button onClick={join} disabled={joining} className="px-5 py-2 rounded-lg bg-[var(--green)] text-black text-sm font-semibold disabled:opacity-40">
              {joining ? "Joining..." : "Join channel"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 glass-card border-t-0 rounded-b-2xl overflow-hidden">
          {/* Channel sidebar */}
          <div className="w-40 sm:w-48 flex-shrink-0 border-r border-[var(--border)] p-2 overflow-y-auto">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChannel(c.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  activeChannel === c.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {isMod && (
              <button onClick={addChannel} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-gray-600 text-sm pt-8">No messages yet — say hi.</p>}
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                if (m.hidden) return null;
                return (
                  <div key={m.id} className="group flex gap-2.5">
                    <SafeAvatar src={m.sender?.avatar_url} alt={m.sender?.handle ?? ""} initials={m.sender?.handle ?? "?"} className="w-8 h-8 text-xs shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${m.sender?.handle}`} className="text-sm font-semibold text-white hover:text-[var(--green)]">
                          @{m.sender?.handle ?? "unknown"}
                        </Link>
                        {m.sender?.verified && <VerifiedBadge className="w-3 h-3" />}
                        <span className="text-[11px] text-gray-600">{timeAgo(m.created_at)}</span>
                        {!m.deleted && (
                          <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setReactingId(reactingId === m.id ? null : m.id)} className="text-gray-600 hover:text-white" title="React">
                              <SmilePlus className="w-3 h-3" />
                            </button>
                            {!mine && (
                              <button onClick={() => report(m.id)} className="text-gray-600 hover:text-yellow-500" title="Report">
                                <Flag className="w-3 h-3" />
                              </button>
                            )}
                            {(mine || isMod) && (
                              <button onClick={() => deleteMessage(m.id)} className="text-gray-600 hover:text-red-500" title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {m.deleted ? (
                        <p className="text-xs text-gray-600 italic">message deleted</p>
                      ) : (
                        <>
                          {m.content && <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{m.content}</p>}
                          {m.image_url && (
                            <div className="mt-1.5 rounded-lg overflow-hidden max-w-[280px]">
                              {isVideoUrl(m.image_url) ? (
                                <ExpandableVideo src={m.image_url} poster={m.poster_url ?? undefined} />
                              ) : (
                                <ExpandableImage src={m.image_url} alt="" />
                              )}
                            </div>
                          )}
                          {(Object.keys(m.reactions).length > 0 || reactingId === m.id) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {Object.entries(m.reactions).map(([emoji, r]) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m, emoji)}
                                  className={`text-xs px-1.5 py-0.5 rounded-full border ${
                                    r.mine ? "border-[var(--green)] bg-[var(--green)]/10" : "border-[var(--border)]"
                                  }`}
                                >
                                  {emoji} {r.count}
                                </button>
                              ))}
                              {reactingId === m.id &&
                                REACTIONS.map((emoji) => (
                                  <button key={emoji} onClick={() => toggleReaction(m, emoji)} className="text-xs px-1 hover:scale-125 transition-transform">
                                    {emoji}
                                  </button>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-[var(--border)] space-y-2">
              {mediaPreview && (
                <div className="relative inline-block">
                  {media?.type.startsWith("video/") ? (
                    <video src={mediaPreview} className="h-20 rounded-lg" />
                  ) : (
                    <img src={mediaPreview} alt="" className="h-20 rounded-lg" />
                  )}
                  <button type="button" onClick={clearMedia} className="absolute -top-1.5 -right-1.5 bg-black rounded-full p-0.5 border border-[var(--border)]">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pickMedia} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-gray-400 hover:text-white">
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message"
                  maxLength={4000}
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-full px-4 py-2 text-sm text-white outline-none focus:border-[var(--green)]"
                />
                <button type="submit" disabled={(!text.trim() && !media) || sending} className="p-2 rounded-full bg-[var(--green)] text-black disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
