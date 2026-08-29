"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Send, Hash, Lock, Plus, Users, Trash2, Flag, ImagePlus, X, ChevronLeft, Megaphone, Pencil, Share2, Ban } from "lucide-react";
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

/** Channel avatar that opens full-size when it's a real photo. */
function ChannelAvatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (src) setOpen(true); }}
        className={src ? "cursor-zoom-in shrink-0" : "shrink-0"}
      >
        <SafeAvatar src={src} alt={name} initials={name} className={className} />
      </button>
      {open && src && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 42%, rgba(20,32,28,1) 0%, rgba(6,10,9,1) 60%, rgba(0,0,0,1) 100%)" }}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white"
            style={{ top: "max(1rem, env(safe-area-inset-top))", right: "1rem" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={name} className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>,
        document.body
      )}
    </>
  );
}

interface Channel { id: string; name: string; slug: string; position: number; mods_only_posts?: boolean }
interface Room {
  id: string; name: string; slug: string; description: string | null;
  avatar_url: string | null; price_cents: number | null; member_count: number;
  visibility?: string;
  owner_id: string; owner?: { handle: string; avatar_url: string; verified: boolean } | null;
}
interface Membership { role: "owner" | "mod" | "member"; status: string }
interface ChatMessage {
  id: string; sender_id: string; content: string; image_url: string | null;
  poster_url?: string | null;
  created_at: string; edited_at?: string | null; hidden?: boolean;
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
  const { userId, isLoaded } = useAuth();
  const [signedOut, setSignedOut] = useState(false);

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Mobile is master–detail like Discord: the topic list and the chat are
  // separate screens. Desktop shows both side by side.
  const [showChat, setShowChat] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const lastTypingPingRef = useRef(0);
  const isMod = membership?.role === "owner" || membership?.role === "mod";

  const loadRoom = useCallback(async () => {
    if (!isLoaded) return;

    // Signed-out visitor (e.g. followed an invite link in a browser):
    // show a public preview + a sign-in prompt.
    if (!userId) {
      const res = await fetch(`/api/rooms/${slug}/preview`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setSignedOut(true);
      }
      setLoading(false);
      return;
    }

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
  }, [slug, searchParams, userId, isLoaded]);

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
    setTypingUsers([]);
    fetchMessages(activeChannel);
    const t = setInterval(() => fetchMessages(activeChannel, { silent: true }), 4000);
    return () => clearInterval(t);
  }, [activeChannel, canParticipate, fetchMessages]);

  // "Who's typing" — a tighter poll, only while the chat pane is on screen.
  useEffect(() => {
    if (!activeChannel || !canParticipate) return;
    const chatVisible = () => typeof window !== "undefined" && (window.innerWidth >= 768 || showChat);
    const poll = () => {
      if (!chatVisible()) return;
      fetch(`/api/channels/${activeChannel}/typing`)
        .then((r) => (r.ok ? r.json() : []))
        .then((h: string[]) => setTypingUsers(Array.isArray(h) ? h : []))
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [activeChannel, canParticipate, showChat]);

  // Tap outside a message / the picker to dismiss it. Taps on a message
  // row are handled by onMessageTap (toggle), so ignore those here.
  useEffect(() => {
    if (!reactingId) return;
    const close = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el?.closest?.("[data-reaction-ui]") || el?.closest?.("[data-msg]")) return;
      setReactingId(null);
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", close); };
  }, [reactingId]);

  function pingTyping() {
    if (!activeChannel) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < 3000) return;
    lastTypingPingRef.current = now;
    fetch(`/api/channels/${activeChannel}/typing`, { method: "POST" }).catch(() => {});
  }

  async function join() {
    if (!userId) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/rooms/${slug}`)}`);
      return;
    }
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
    setMessages((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/channel-messages/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function startEdit(m: ChatMessage) {
    setReactingId(null);
    setEditingId(m.id);
    setEditText(m.content);
  }

  async function saveEdit(m: ChatMessage) {
    const trimmed = editText.trim();
    setEditingId(null);
    if (!trimmed || trimmed === m.content) return;
    setMessages((msgs) => msgs.map((x) => (x.id === m.id ? { ...x, content: trimmed, edited_at: new Date().toISOString() } : x)));
    const res = await fetch(`/api/channel-messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    if (!res.ok) alert(await errorMessage(res));
  }

  // Tap a message to open its reaction picker. Ignore taps that land on
  // something interactive (links, buttons, the picker itself, media).
  function onMessageTap(id: string, e: React.MouseEvent) {
    if ((e.target as HTMLElement)?.closest?.("a, button, textarea, img, video, [data-reaction-ui]")) return;
    setReactingId((cur) => (cur === id ? null : id));
  }

  async function addCustomReaction(m: ChatMessage) {
    const picked = prompt("React with an emoji");
    if (!picked) return;
    const emoji = picked.trim();
    if (!emoji || /[A-Za-z0-9\s]/.test(emoji)) return;
    await toggleReaction(m, emoji);
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

  async function blockSender(m: ChatMessage) {
    if (!m.sender?.handle) return;
    if (!confirm(`Block @${m.sender.handle}? You won't see their messages anywhere.`)) return;
    setMessages((msgs) => msgs.filter((x) => x.sender_id !== m.sender_id));
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.sender_id }),
    }).catch(() => {});
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
      setShowChat(true);
    } else {
      alert(await errorMessage(res));
    }
  }

  if (loading) return <p className="text-gray-500 text-sm text-center pt-20">Loading...</p>;
  if (!room) return <p className="text-gray-500 text-sm text-center pt-20">Room not found.</p>;

  const paid = !!room.price_cents && room.price_cents > 0;
  const activeChannelObj = channels.find((c) => c.id === activeChannel);
  const activeChannelName = activeChannelObj?.name ?? "";
  const canPostHere = !activeChannelObj?.mods_only_posts || isMod;
  const mobileChat = canParticipate && showChat;

  function openTopic(id: string) {
    setActiveChannel(id);
    setShowChat(true);
  }

  async function shareChannel() {
    const url = `${window.location.origin}/rooms/${room!.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: room!.name, text: `Join ${room!.name} on Ryzr`, url });
        return;
      }
    } catch { /* user cancelled the share sheet */ return; }
    try {
      await navigator.clipboard.writeText(url);
      alert("Invite link copied");
    } catch {
      prompt("Invite link", url);
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100dvh-20px)] -mb-6">
      {/* Header — room info, or (mobile chat screen) the current topic */}
      <div className="glass-card rounded-t-2xl pl-4 pr-14 md:pr-4 py-3 flex items-center gap-3 flex-shrink-0">
        {mobileChat ? (
          <>
            <button onClick={() => setShowChat(false)} className="md:hidden text-gray-400 hover:text-white -ml-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="font-semibold text-white truncate">{activeChannelName}</span>
            </div>
          </>
        ) : (
          <>
            <BackButton fallbackHref="/rooms" iconOnly className="text-gray-500 hover:text-white transition-colors" />
            <ChannelAvatar src={room.avatar_url} name={room.name} className="w-9 h-9 rounded-lg text-sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white truncate">{room.name}</span>
                {paid && <Lock className="w-3.5 h-3.5 text-[var(--green)]" />}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> {room.member_count}
                {room.visibility === "unlisted" && <> · Unlisted</>}
                {room.owner && <> · @{room.owner.handle}</>}
              </p>
            </div>
          </>
        )}
        {!mobileChat && (
          <button onClick={shareChannel} className="text-gray-400 hover:text-white shrink-0" title="Share invite link">
            <Share2 className="w-4 h-4" />
          </button>
        )}
        {isMod && (
          <Link href={`/rooms/${room.slug}/manage`} className="text-xs text-gray-400 hover:text-white shrink-0">
            Manage
          </Link>
        )}
        {!isMod && canParticipate && paid && !mobileChat && (
          <button onClick={openBillingPortal} className="text-xs text-gray-400 hover:text-white shrink-0">
            Subscription
          </button>
        )}
      </div>

      {!canParticipate ? (
        <div className="flex-1 glass-card border-t-0 rounded-b-2xl flex flex-col items-center justify-center text-center p-8 gap-3">
          <Lock className="w-8 h-8 text-gray-600" />
          <p className="text-gray-300 text-sm max-w-sm">{room.description || `Join to see the conversation in ${room.name}.`}</p>
          {signedOut ? (
            <>
              {paid && <p className="text-white font-semibold">${(room.price_cents! / 100).toFixed(2)}/month</p>}
              <button onClick={join} className="px-5 py-2 rounded-lg bg-[var(--green)] text-black text-sm font-semibold">
                Sign in to join
              </button>
              <p className="text-gray-600 text-xs">New to Ryzr? You can create an account on the next screen.</p>
            </>
          ) : paid ? (
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
          {/* Topic list — full screen on mobile, sidebar on desktop */}
          <div
            className={`${showChat ? "hidden" : "flex"} md:flex flex-col w-full md:w-56 flex-shrink-0 md:border-r border-[var(--border)] overflow-y-auto`}
          >
            {/* Hero (mobile) */}
            <div
              className="md:hidden px-4 pt-4 pb-3 border-b border-[var(--border)]"
              style={{ background: "radial-gradient(120% 80% at 0% 0%, rgba(0,200,150,0.10), transparent 60%)" }}
            >
              <div className="flex items-center gap-3">
                <ChannelAvatar src={room.avatar_url} name={room.name} className="w-12 h-12 rounded-2xl text-base" />
                <div className="min-w-0">
                  <p className="text-base font-bold text-white truncate">{room.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> {room.member_count} member{room.member_count === 1 ? "" : "s"}
                    {room.visibility === "unlisted" && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--green)] border border-[var(--green)]/30 rounded px-1 py-px">
                        <Lock className="w-2 h-2" /> Unlisted
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {room.description && (
                <p className="mt-3 text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap border-l-2 border-[var(--green)]/40 pl-3">
                  {room.description}
                </p>
              )}
            </div>

            {/* Desktop compact about */}
            {room.description && (
              <p className="hidden md:block px-3 py-2 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap border-b border-[var(--border)]">
                {room.description}
              </p>
            )}

            <div className="p-2 md:p-2 space-y-1">
              <p className="hidden md:block px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">Topics</p>
              {channels.map((c) => {
                const active = activeChannel === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => openTopic(c.id)}
                    className={`group/topic w-full flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-xl text-sm transition-all ${
                      active
                        ? "bg-[var(--green)]/10 text-white ring-1 ring-inset ring-[var(--green)]/30"
                        : "text-gray-300 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors ${
                        c.mods_only_posts
                          ? "bg-[var(--green)]/15 text-[var(--green)]"
                          : active
                          ? "bg-[var(--green)]/20 text-[var(--green)]"
                          : "bg-white/[0.06] text-gray-400 group-hover/topic:text-white"
                      }`}
                    >
                      {c.mods_only_posts ? <Megaphone className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate flex-1 text-left font-medium">{c.name}</span>
                    <ChevronLeft className="w-4 h-4 rotate-180 text-gray-600 md:hidden" />
                  </button>
                );
              })}
              {isMod && (
                <button
                  onClick={addChannel}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 md:py-2 rounded-xl text-sm text-gray-500 hover:text-white border border-dashed border-[var(--border)] hover:border-[var(--green)]/40 transition-colors"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  Add topic
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className={`${showChat ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 min-h-0`}>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-gray-600 text-sm pt-8">No messages yet — say hi.</p>}
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                if (m.hidden) return null;
                return (
                  <div key={m.id} data-msg className="group flex gap-2.5" onClick={(e) => onMessageTap(m.id, e)}>
                    <SafeAvatar src={m.sender?.avatar_url} alt={m.sender?.handle ?? ""} initials={m.sender?.handle ?? "?"} className="w-8 h-8 text-xs shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${m.sender?.handle}`} className="text-sm font-semibold text-white hover:text-[var(--green)]">
                          @{m.sender?.handle ?? "unknown"}
                        </Link>
                        {m.sender?.verified && <VerifiedBadge className="w-3 h-3" />}
                        <span className="text-[11px] text-gray-600">{timeAgo(m.created_at)}</span>
                        <span data-reaction-ui className="ml-auto hidden md:flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {mine && m.content && editingId !== m.id && (
                            <button onClick={() => startEdit(m)} className="text-gray-600 hover:text-white" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!mine && (
                            <button onClick={() => report(m.id)} className="text-gray-600 hover:text-yellow-500" title="Report">
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!mine && (
                            <button onClick={() => blockSender(m)} className="text-gray-600 hover:text-red-500" title="Block user">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!mine && isMod && (
                            <button onClick={() => deleteMessage(m.id)} className="text-gray-600 hover:text-red-500" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                      {editingId === m.id ? (
                        <div className="mt-1 space-y-1.5">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit(m);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            rows={Math.min(6, editText.split("\n").length + 1)}
                            autoFocus
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--green)] resize-none"
                          />
                          <div className="flex gap-2 text-xs">
                            <button onClick={() => saveEdit(m)} className="px-2.5 py-1 rounded bg-[var(--green)] text-black font-semibold">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-2.5 py-1 rounded bg-white/5 text-gray-400">Cancel</button>
                            <button onClick={() => { setEditingId(null); deleteMessage(m.id); }} className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 ml-auto">Delete</button>
                          </div>
                        </div>
                      ) : (
                        m.content && (
                          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                            {m.content}
                            {m.edited_at && <span className="text-[10px] text-gray-600 ml-1">(edited)</span>}
                          </p>
                        )
                      )}
                      {m.image_url && (
                        <div
                          className="mt-1.5 rounded-lg overflow-hidden max-w-[280px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isVideoUrl(m.image_url) ? (
                            <ExpandableVideo src={m.image_url} poster={m.poster_url ?? undefined} />
                          ) : (
                            <ExpandableImage src={m.image_url} alt="" />
                          )}
                        </div>
                      )}
                      {(Object.keys(m.reactions).length > 0 || reactingId === m.id) && (
                        <div data-reaction-ui className="flex flex-wrap items-center gap-1 mt-1.5">
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
                          {reactingId === m.id && (
                            <>
                              {REACTIONS.map((emoji) => (
                                <button key={emoji} onClick={() => toggleReaction(m, emoji)} className="text-base px-1 active:scale-125 hover:scale-125 transition-transform">
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => addCustomReaction(m)}
                                className="text-xs w-6 h-6 rounded-full border border-[var(--border)] text-gray-400 hover:text-white flex items-center justify-center"
                                title="Add another emoji"
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Tap-opened actions (mobile-first; desktop also has the hover row) */}
                      {reactingId === m.id && (
                        <div data-reaction-ui className="flex items-center gap-3 mt-2 text-xs">
                          {mine && m.content && editingId !== m.id && (
                            <button onClick={() => startEdit(m)} className="flex items-center gap-1 text-gray-400 hover:text-white">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                          {(mine || isMod) && (
                            <button onClick={() => deleteMessage(m.id)} className="flex items-center gap-1 text-gray-400 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                          {!mine && (
                            <>
                              <button onClick={() => report(m.id)} className="flex items-center gap-1 text-gray-400 hover:text-yellow-500">
                                <Flag className="w-3.5 h-3.5" /> Report
                              </button>
                              <button onClick={() => blockSender(m)} className="flex items-center gap-1 text-gray-400 hover:text-red-400">
                                <Ban className="w-3.5 h-3.5" /> Block
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="h-4 px-4 pt-1.5 flex items-center border-t border-[var(--border)]">
              {canPostHere && typingUsers.length > 0 && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" />
                  </span>
                  {typingUsers.length === 1
                    ? `@${typingUsers[0]} is typing`
                    : typingUsers.length === 2
                    ? `@${typingUsers[0]} and @${typingUsers[1]} are typing`
                    : "several people are typing"}
                </span>
              )}
            </div>

            {!canPostHere ? (
              <p className="px-4 pb-4 pt-1 text-xs text-gray-500 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" /> Only channel admins post in this topic.
              </p>
            ) : (
            <form onSubmit={send} className="px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
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
                  onChange={(e) => { setText(e.target.value); pingTyping(); }}
                  placeholder="Message"
                  maxLength={4000}
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-full px-4 py-2 text-sm text-white outline-none focus:border-[var(--green)]"
                />
                <button type="submit" disabled={(!text.trim() && !media) || sending} className="p-2 rounded-full bg-[var(--green)] text-black disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
