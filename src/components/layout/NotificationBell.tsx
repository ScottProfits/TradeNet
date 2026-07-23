"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Heart, UserPlus, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";

interface Notification {
  id: string;
  type: "follow" | "like" | "comment" | "comment_like" | "explore";
  read: boolean;
  created_at: string;
  trade_id: string | null;
  post_id: string | null;
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
    function load() {
      fetch("/api/notifications").then((r) => r.ok ? r.json() : []).then(setNotifs);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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
    if (type === "like" || type === "comment_like") return <Heart className="w-3.5 h-3.5 text-pink-400 fill-current" />;
    if (type === "follow") return <UserPlus className="w-3.5 h-3.5 text-[var(--green)]" />;
    if (type === "explore") return <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />;
    return <MessageCircle className="w-3.5 h-3.5 text-blue-400" />;
  }

  function message(n: Notification) {
    if (n.type === "comment_like") return "liked your comment";
    if (n.type === "like" && !n.trade_id && n.post_id) return "liked your post";
    if (n.type === "like") return "liked your trade";
    if (n.type === "follow") return "started following you";
    if (n.type === "explore") return "You're featured on Explore right now";
    if (n.type === "comment" && !n.trade_id && n.post_id) return "commented on your post";
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
        <div className="absolute right-0 top-full mt-2 w-80 glass-card rounded-2xl shadow-xl z-50 overflow-hidden">
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
              notifs.map((n) => {
                const isExplore = n.type === "explore";
                return (
                  <Link
                    key={n.id}
                    href={isExplore || n.post_id ? "/feed" : `/profile/${n.actor?.handle}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-white/5 transition-colors ${!n.read ? "bg-[var(--green)]/5" : ""}`}
                  >
                    {isExplore ? (
                      <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <SafeAvatar src={n.actor?.avatar_url} alt={n.actor?.handle ?? ""} initials={n.actor?.handle ?? "?"} className="w-8 h-8 text-xs" />
                        <span className="absolute -bottom-0.5 -right-0.5 bg-[var(--card)] rounded-full p-0.5">
                          {icon(n.type)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">
                        {!isExplore && (
                          <>
                            <span className="font-semibold text-white">@{n.actor?.handle}</span>
                            {n.actor?.verified && <VerifiedBadge className="w-3 h-3 inline ml-1" />}
                            {" "}
                          </>
                        )}
                        {message(n)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-[var(--green)] rounded-full mt-1.5 shrink-0" />}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
