"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, MessageSquare, Trophy } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import PostTradeModal from "@/components/feed/PostTradeModal";

export default function MobileNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [unreadDms, setUnreadDms] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    function load() {
      fetch("/api/messages?unread=1").then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setUnreadDms(d.count));
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  const handle = user?.username;

  const links = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/leaderboard", icon: Trophy, label: "Board" },
    { href: handle ? `/profile/${handle}` : "/feed", icon: null, label: "Profile", isProfile: true },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)] flex items-center lg:hidden">
        {links.slice(0, 2).map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "text-[var(--green)]"
                : "text-gray-500"
            )}
          >
            {Icon && <Icon className="w-5 h-5" />}
            {label}
          </Link>
        ))}

        {/* Center post button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2"
        >
          <span className="w-10 h-10 rounded-full bg-[var(--green)] flex items-center justify-center shadow-lg shadow-[var(--green)]/30">
            <Plus className="w-5 h-5 text-black" />
          </span>
        </button>

        {/* Messages */}
        <Link
          href="/messages"
          className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative",
            pathname.startsWith("/messages") ? "text-[var(--green)]" : "text-gray-500"
          )}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadDms > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {unreadDms > 9 ? "9+" : unreadDms}
              </span>
            )}
          </div>
          PMs
        </Link>

        {/* Profile */}
        {links[3] && (
          <Link
            href={links[3].href}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
              pathname.startsWith("/profile") ? "text-[var(--green)]" : "text-gray-500"
            )}
          >
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.username?.slice(0, 1).toUpperCase() ?? "?"}
              </div>
            )}
            Profile
          </Link>
        )}
      </nav>

      {/* Add padding so content doesn't hide behind nav */}
      <div className="h-16 lg:hidden" />

      {showModal && <PostTradeModal onClose={() => setShowModal(false)} onPosted={() => {}} />}
    </>
  );
}
