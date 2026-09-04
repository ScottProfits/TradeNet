"use client";
import { useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";
import BackButton from "@/components/ui/BackButton";
import DeleteSheet from "@/components/ui/DeleteSheet";
import { useCachedFetch } from "@/lib/useCachedFetch";

interface Conversation {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  partner: { id: string; handle: string; avatar_url: string; verified: boolean };
}

export default function MessagesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { data: convosData, loading, mutate } = useCachedFetch<Conversation[]>("messages:list", "/api/messages");
  const convos = convosData ?? [];
  const [confirmHide, setConfirmHide] = useState<Conversation | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);

  function startPress(c: Conversation, e: React.PointerEvent) {
    longPressed.current = false;
    cancelPress();
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setConfirmHide(c);
    }, 700);
  }
  function maybeCancelPress(e: React.PointerEvent) {
    if (!pressOrigin.current) return;
    const dx = Math.abs(e.clientX - pressOrigin.current.x);
    const dy = Math.abs(e.clientY - pressOrigin.current.y);
    if (dx > 12 || dy > 12) cancelPress();
  }
  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    pressOrigin.current = null;
  }

  async function hideConvo(c: Conversation) {
    setConfirmHide(null);
    mutate((list) => (list ?? []).filter((x) => x.partner?.id !== c.partner?.id));
    await fetch("/api/messages/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: c.partner?.id }),
    }).catch(() => {});
  }

  if (loading && convos.length === 0) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-11 h-11 rounded-full bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-40 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">Messages</h1>

      <div className="glass-card rounded-2xl overflow-hidden">
        {convos.length === 0 && (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-600 text-xs mt-1">Visit someone&apos;s profile and hit Message to start a conversation.</p>
          </div>
        )}

        {convos.map((c) => {
          const partner = c.partner;
          const unread = !c.read && c.receiver_id === userId;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { if (!longPressed.current && partner?.handle) router.push(`/messages/${partner.handle}`); }}
              onPointerDown={(e) => startPress(c, e)}
              onPointerUp={cancelPress}
              onPointerMove={maybeCancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full text-left flex items-center gap-3 p-4 hover:bg-[var(--bg)] transition-colors border-b border-[var(--border)] last:border-0 select-none [-webkit-touch-callout:none]"
            >
              <SafeAvatar src={partner?.avatar_url} alt={partner?.handle ?? ""} initials={partner?.handle ?? "?"} className="w-11 h-11" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-sm ${unread ? "text-white" : "text-gray-300"}`}>@{partner?.handle}</span>
                  {partner?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                </div>
                <p className={`text-xs truncate mt-0.5 ${unread ? "text-gray-200 font-medium" : "text-gray-500"}`}>{c.content}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-xs text-gray-600">{new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                {unread && <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />}
              </div>
            </button>
          );
        })}
      </div>

      {confirmHide && (
        <DeleteSheet
          label="conversation just for you (they keep their copy)"
          onConfirm={() => hideConvo(confirmHide)}
          onCancel={() => setConfirmHide(null)}
        />
      )}
    </div>
  );
}
