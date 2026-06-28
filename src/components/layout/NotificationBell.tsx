"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Heart, UserPlus, MessageCircle } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Notification {
  id: string;
  type: "follow" | "like" | "comment";
  read: boolean;
  created_at: string;
  trade_id: string | null;
  actor: {
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications").then((r) => r.ok ? r.json() : []).then(setNotifs);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  function handleOpen() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      fetch("/api/notifications", { method: "PATCH" });
      setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    }
  }

  function icon(type: string) {
    if (type === "like") return <Heart className="w-3.5 h-3.5 text-pink-400 fill-current" />;
    if (type === "follow") return <UserPlus className="w-3.5 h-3.5 text-[var(--green)]" />;
    return <MessageCircle className="w-3.5 h-3.5 text-blue-400" />;
  }

  function message(n: Notification) {
    if (n.type === "like") return "liked your trade";
    if (n.type === "follow") return "started following you";
    return "commented on your trade";
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-1.5 text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--green)] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <span className="font-semibold text-white text-sm">Notifications</span>
            {notifs.length > 0 && (
              <button
                onClick={() => { fetch("/api/notifications", { method: "PATCH" }); setNotifs((n) => n.map((x) => ({ ...x, read: true }))); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications yet</p>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 ${!n.read ? "bg-[var(--green)]/5" : ""}`}>
                  <div className="relative shrink-0">
                    {n.actor?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.actor.avatar_url} alt={n.actor.handle} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {n.actor?.handle?.slice(0, 2).toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 bg-[var(--card)] rounded-full p-0.5">
                      {icon(n.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">
                      <Link href={`/profile/${n.actor?.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
                        @{n.actor?.handle}
                      </Link>
                      {n.actor?.verified && <VerifiedBadge className="w-3 h-3 inline ml-1" />}
                      {" "}{message(n)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-[var(--green)] rounded-full mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
