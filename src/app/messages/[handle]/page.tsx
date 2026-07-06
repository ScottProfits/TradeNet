"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender: { handle: string; avatar_url: string; verified: boolean };
}

interface Profile {
  id: string;
  handle: string;
  avatar_url: string;
  verified: boolean;
}

export default function ChatPage() {
  const { handle } = useParams<{ handle: string }>();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load partner profile
    fetch(`/api/profile/${handle}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.profile) setPartner(d.profile); });
  }, [handle]);

  useEffect(() => {
    if (!partner) return;
    // Initial load
    fetch(`/api/messages?with=${partner.id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d: Message[]) => { setMessages(d); setTimeout(() => bottomRef.current?.scrollIntoView(), 50); });

    // Poll for new messages (messages table is server-only now, no client Realtime access)
    const interval = setInterval(() => {
      fetch(`/api/messages?with=${partner.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d: Message[]) => { setMessages(d); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50); });
    }, 4000);

    return () => clearInterval(interval);
  }, [partner]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending || !partner) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: partner.id, content: text }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((m) => [...m, msg]);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  const initials = partner?.handle.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="max-w-xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="glass-card rounded-t-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/messages" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {partner?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.avatar_url} alt={partner.handle} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Link href={`/profile/${handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
            @{handle}
          </Link>
          {partner?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[var(--card)] border-x border-[var(--border)] p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm pt-8">Start the conversation with @{handle}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? "bg-[var(--green)] text-black" : "bg-[var(--bg)] text-white"}`}>
                <p className="text-sm leading-relaxed">{m.content}</p>
                <p className={`text-xs mt-1 ${mine ? "text-black/60" : "text-gray-600"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="glass-card rounded-b-2xl px-4 py-3 flex gap-2 flex-shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="p-2 bg-[var(--green)] text-black rounded-xl hover:bg-[var(--green)]/90 transition-colors disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
