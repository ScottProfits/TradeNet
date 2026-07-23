"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Send, Heart, ImagePlus, Video, X } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";
import ExpandableImage from "@/components/feed/ExpandableImage";
import ExpandableVideo from "@/components/feed/ExpandableVideo";
import { supabase } from "@/lib/supabase";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { VIDEO_POSTER_DATA_URI } from "@/lib/videoPoster";
import { extractVideoThumbnail } from "@/lib/extractVideoThumbnail";
import { demoPartner, demoMessages, demoAutoReplies } from "@/lib/demoData";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
  poster_url?: string | null;
  created_at: string;
  sender: { handle: string; avatar_url: string; verified: boolean };
  liked_by?: string[];
}

interface Profile {
  id: string;
  handle: string;
  avatar_url: string;
  verified: boolean;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { handle } = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>(isDemo ? demoMessages : []);
  const [partner, setPartner] = useState<Profile | null>(isDemo ? demoPartner : null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const stickToBottom = useRef(true);

  function handleMediaPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
  }

  function clearMedia() {
    setMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function isNearBottom() {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Keep pinned to bottom as late-loading media (images/videos) change the
  // container's height — a single scrollIntoView on load can land short if
  // media hasn't finished loading/growing to its final size yet.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isDemo) return;
    // Load partner profile
    fetch(`/api/profile/${handle}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.profile) setPartner(d.profile); });
  }, [handle, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!partner) return;
    // Initial load
    stickToBottom.current = true;
    fetch(`/api/messages?with=${partner.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d: Message[]) => {
        setMessages(d);
        lastMessageIdRef.current = d.at(-1)?.id ?? null;
        setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 50);
      });

    // Poll for new messages (messages table is server-only now, no client Realtime access)
    const interval = setInterval(() => {
      const wasNearBottom = isNearBottom();
      fetch(`/api/messages?with=${partner.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d: Message[]) => {
          const newLastId = d.at(-1)?.id ?? null;
          const hasNewMessage = newLastId !== lastMessageIdRef.current;
          setMessages(d);
          lastMessageIdRef.current = newLastId;
          // Only auto-scroll if a genuinely new message arrived and the user was already at the bottom
          if (hasNewMessage && wasNearBottom) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [partner, isDemo]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !media) || sending || !partner) return;
    stickToBottom.current = true;
    if (isDemo) {
      setMessages((m) => [...m, { id: `dm-${Date.now()}`, sender_id: "me", receiver_id: partner.id, content: text, image_url: mediaPreview, created_at: new Date().toISOString(), sender: { handle: "you", avatar_url: "", verified: false } }]);
      setText("");
      clearMedia();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      setTimeout(() => {
        const reply = demoAutoReplies[Math.floor(Math.random() * demoAutoReplies.length)];
        setMessages((m) => [...m, { id: `dm-${Date.now()}`, sender_id: partner.id, receiver_id: "me", content: reply, created_at: new Date().toISOString(), sender: { handle: partner.handle, avatar_url: partner.avatar_url, verified: partner.verified } }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }, 1400);
      return;
    }
    setSending(true);

    let imageUrl: string | null = null;
    let posterUrl: string | null = null;
    if (media && userId) {
      const ext = media.name.split(".").pop();
      const ts = Date.now();
      const path = `${userId}/${ts}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("trade-images").upload(path, media, { contentType: media.type });
      if (!uploadError) {
        const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      if (mediaType === "video") {
        const thumb = await extractVideoThumbnail(media);
        if (thumb) {
          const posterPath = `${userId}/${ts}-poster.jpg`;
          const { error: posterError } = await supabase.storage.from("trade-images").upload(posterPath, thumb, { contentType: "image/jpeg" });
          if (!posterError) {
            const { data } = supabase.storage.from("trade-images").getPublicUrl(posterPath);
            posterUrl = data.publicUrl;
          }
        }
      }
    }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: partner.id, content: text, imageUrl, posterUrl }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((m) => [...m, msg]);
      lastMessageIdRef.current = msg.id;
      setText("");
      clearMedia();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  async function toggleLike(m: Message) {
    const myId = isDemo ? "me" : userId;
    if (isDemo ? m.sender_id === "me" : (!userId || m.sender_id === userId)) return;
    if (!myId) return;
    const alreadyLiked = (m.liked_by ?? []).includes(myId);
    setMessages((msgs) =>
      msgs.map((msg) =>
        msg.id === m.id
          ? { ...msg, liked_by: alreadyLiked ? (msg.liked_by ?? []).filter((id) => id !== myId) : [...(msg.liked_by ?? []), myId] }
          : msg
      )
    );
    if (isDemo) return;
    await fetch("/api/messages/like", {
      method: alreadyLiked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: m.id }),
    }).catch(() => {});
  }


  return (
    <div className="max-w-xl mx-auto flex flex-col h-[calc(100dvh-96px)]">
      {/* Header */}
      <div className="glass-card rounded-t-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <BackButton fallbackHref="/messages" iconOnly className="text-gray-500 hover:text-white transition-colors" />
        <SafeAvatar src={partner?.avatar_url} alt={partner?.handle ?? handle} initials={partner?.handle ?? handle} className="w-9 h-9 text-sm" />
        <div className="flex items-center gap-1.5">
          <Link href={`/profile/${handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
            @{handle}
          </Link>
          {partner?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={() => { stickToBottom.current = isNearBottom(); }}
        className="flex-1 overflow-y-auto glass-card border-t-0 border-b-0 rounded-none p-4 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm pt-8">Start the conversation with @{handle}</p>
        )}
        {messages.map((m) => {
          const mine = isDemo ? m.sender_id === "me" : m.sender_id === userId;
          const liked = (m.liked_by ?? []).length > 0;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className="group relative max-w-[75%] rounded-2xl px-4 py-2.5 transition-transform active:scale-[0.98]"
                style={
                  mine
                    ? {
                        background: "linear-gradient(135deg, #00C896 0%, #00a87e 100%)",
                        boxShadow: "0 4px 16px rgba(0,200,150,0.25)",
                        color: "#000",
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                      }
                }
                onDoubleClick={() => { if (!mine) toggleLike(m); }}
              >
                {m.image_url && (
                  <div className="mb-1.5 -mx-1 rounded-lg overflow-hidden max-w-[220px]">
                    {isVideoUrl(m.image_url) ? (
                      <ExpandableVideo
                        src={m.image_url}
                        poster={m.poster_url ?? VIDEO_POSTER_DATA_URI}
                        className="w-full max-h-56 object-cover rounded-lg"
                      />
                    ) : (
                      <ExpandableImage src={m.image_url} alt="Attachment" />
                    )}
                  </div>
                )}
                {m.content && <p className="text-sm leading-relaxed">{m.content}</p>}
                <p className={`text-xs mt-1 ${mine ? "text-black/60" : "text-gray-500"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {mine ? (
                  liked && (
                    <span className="absolute -bottom-3 left-1 w-6 h-6 rounded-full flex items-center justify-center solid-menu heart-pop">
                      <Heart className="w-3 h-3 fill-[var(--red)] text-[var(--red)]" />
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleLike(m)}
                    className={`absolute -bottom-3 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all solid-menu ${
                      liked ? "opacity-100 scale-100" : "opacity-60 hover:opacity-100 scale-90 hover:scale-100"
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${liked ? "fill-[var(--red)] text-[var(--red)]" : "text-gray-400"}`} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass-card rounded-b-2xl px-4 py-3 flex-shrink-0 space-y-2">
        {mediaPreview && (
          <div className="relative inline-block">
            {mediaType === "video" ? (
              <video src={mediaPreview} className="h-20 rounded-lg border border-[var(--border)]" muted />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediaPreview} alt="Attachment preview" className="h-20 rounded-lg border border-[var(--border)] object-cover" />
            )}
            <button
              type="button"
              onClick={clearMedia}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaPick} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
            aria-label="Attach photo or video"
          >
            {mediaType === "video" ? <Video className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors"
          />
          <button
            type="submit"
            disabled={sending || (!text.trim() && !media)}
            className="p-2.5 rounded-xl transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgba(0,200,150,0.9) 0%, rgba(0,168,126,0.9) 100%)",
              boxShadow: "0 0 16px rgba(0,200,150,0.3)",
            }}
          >
            <Send className="w-4 h-4 text-black" />
          </button>
        </form>
      </div>
    </div>
  );
}
