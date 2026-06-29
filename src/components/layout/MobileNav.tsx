"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Plus, Bell, TrendingUp } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import PostTradeModal from "@/components/feed/PostTradeModal";

export default function MobileNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Fetch the user's actual handle and avatar from profiles table
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profile/me`).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.handle) setProfileHandle(d.handle);
      else setProfileHandle(user.username ?? null);
      if (d?.avatar_url) setProfileAvatar(d.avatar_url);
    });
  }, [user?.id, user?.username]);

  const profileHref = profileHandle ? `/profile/${profileHandle}` : (user?.username ? `/profile/${user.username}` : "/feed");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)] border-t border-[var(--border)] flex items-center lg:hidden">

        {/* Feed */}
        <Link
          href="/feed"
          className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
            pathname === "/feed" ? "text-[var(--green)]" : "text-gray-500"
          )}
        >
          <TrendingUp className="w-5 h-5" />
          Feed
        </Link>

        {/* Search */}
        <Link
          href="/search"
          className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
            pathname === "/search" ? "text-[var(--green)]" : "text-gray-500"
          )}
        >
          <Search className="w-5 h-5" />
          Search
        </Link>

        {/* Center post button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2"
        >
          <span className="w-10 h-10 rounded-full bg-[var(--green)] flex items-center justify-center shadow-lg shadow-[var(--green)]/30">
            <Plus className="w-5 h-5 text-black" />
          </span>
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative",
            pathname === "/notifications" ? "text-[var(--green)]" : "text-gray-500"
          )}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
          </div>
          Alerts
        </Link>

        {/* Profile */}
        <Link
          href={profileHref}
          className={clsx(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
            pathname.startsWith("/profile") ? "text-[var(--green)]" : "text-gray-500"
          )}
        >
          {profileAvatar || user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(profileAvatar || user?.imageUrl) as string}
              alt="Profile"
              className={clsx(
                "w-7 h-7 rounded-full object-cover",
                pathname.startsWith("/profile") ? "ring-2 ring-[var(--green)]" : ""
              )}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.slice(0, 1).toUpperCase() ?? "?"}
            </div>
          )}
          Profile
        </Link>
      </nav>

      <div className="h-16 lg:hidden" />

      {showModal && <PostTradeModal onClose={() => setShowModal(false)} onPosted={() => {}} />}
    </>
  );
}
