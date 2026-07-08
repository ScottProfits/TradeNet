"use client";
import { useState, useEffect } from "react";
import { Bell, Heart, UserPlus, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";

interface Notification {
  id: string;
  type: "follow" | "like" | "comment" | "message_like" | "explore";
  read: boolean;
  created_at: string;
  trade_id: string | null;
  comment_id: string | null;
  actor: { handle: string; avatar_url: string; verified: boolean };
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function icon(type: string) {
  if (type === "like" || type === "message_like") return <Heart className="w-4 h-4 text-pink-400 fill-current" />;
  if (type === "follow") return <UserPlus className="w-4 h-4 text-green-400" />;
  if (type === "explore") return <Star className="w-4 h-4 text-yellow-400 fill-current" />;
  return <MessageCircle className="w-4 h-4 text-blue-400" />;
}

function message(type: string) {
  if (type === "like") return "liked your trade";
  if (type === "message_like") return "liked your message";
  if (type === "follow") return "started following you";
  if (type === "explore") return "You're featured on Explore right now";
  return "commented on your trade";
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setNotifs(data);
        setLoading(false);
        if (data.some((n: Notification) => !n.read)) {
          fetch("/api/notifications", { method: "PATCH" });
          setNotifs(data.map((n: Notification) => ({ ...n, read: true })));
        }
      });
  }, []);

  const grouped = notifs.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    const key = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : "Earlier";
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6 pr-12 lg:pr-0">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        {notifs.length > 0 && (
          <button
            onClick={() => {
              fetch("/api/notifications", { method: "PATCH" });
              setNotifs((n) => n.map((x) => ({ ...x, read: true })));
            }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">No notifications yet</p>
          <p className="text-gray-600 text-sm mt-1">When someone likes, follows, or comments you&apos;ll see it here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {["Today", "Yesterday", "Earlier"].map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">{group}</p>
                <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                  {items.map((n) => {
                    const isExplore = n.type === "explore";
                    const tradeHref = isExplore
                      ? "/feed"
                      : n.type === "message_like"
                      ? `/messages/${n.actor?.handle}`
                      : n.trade_id
                        ? `/trade/${n.trade_id}${n.comment_id ? `#comment-${n.comment_id}` : ""}`
                        : `/profile/${n.actor?.handle}`;
                    return (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-4 hover:bg-white/5 transition-colors"
                      >
                        {isExplore ? (
                          <Link href={tradeHref} className="relative shrink-0 w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          </Link>
                        ) : (
                          <Link href={`/profile/${n.actor?.handle}`} className="relative shrink-0">
                            <SafeAvatar src={n.actor?.avatar_url} alt={n.actor?.handle ?? ""} initials={n.actor?.handle ?? "?"} className="w-10 h-10 text-sm" />
                            <span className="absolute -bottom-0.5 -right-0.5 bg-[var(--card)] rounded-full p-0.5">
                              {icon(n.type)}
                            </span>
                          </Link>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200">
                            {!isExplore && (
                              <>
                                <Link href={`/profile/${n.actor?.handle}`} className="font-semibold text-white hover:text-[var(--green)] transition-colors">
                                  @{n.actor?.handle}
                                </Link>
                                {n.actor?.verified && <VerifiedBadge className="w-3 h-3 inline ml-1" />}
                                {" "}
                              </>
                            )}
                            <Link href={tradeHref} className="hover:text-white transition-colors">
                              {message(n.type)}
                            </Link>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
