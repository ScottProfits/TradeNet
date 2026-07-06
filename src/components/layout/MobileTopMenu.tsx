"use client";
import Link from "next/link";
import { Grid2x2, Search, Bell, MessageSquare } from "lucide-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";

export default function MobileTopMenu() {
  const { isSignedIn, isLoaded } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadDms, setUnreadDms] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    function load() {
      fetch("/api/messages?unread=1").then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setUnreadDms(d.count));
      fetch("/api/notifications").then((r) => r.ok ? r.json() : []).then((d) => setUnreadNotifs(d.filter((n: { read: boolean }) => !n.read).length));
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadTotal = unreadDms + unreadNotifs;

  return (
    <div ref={ref} className="fixed top-2 right-1 z-50 lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full solid-menu"
        aria-label="Menu"
      >
        <Grid2x2 className="w-4 h-4 text-gray-300" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 solid-menu rounded-2xl overflow-hidden">
          <Link
            href="/search"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-200 flex-1">Search</span>
          </Link>

          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-200 flex-1">Notifications</span>
                {unreadNotifs > 0 && (
                  <span className="w-4 h-4 bg-[var(--green)] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                )}
              </Link>
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 hover:bg-white/5 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-200 flex-1">Messages</span>
                {unreadDms > 0 && (
                  <span className="w-4 h-4 bg-[var(--red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadDms > 9 ? "9+" : unreadDms}
                  </span>
                )}
              </Link>
            </>
          ) : isLoaded && !isSignedIn ? (
            <SignInButton mode="redirect">
              <button className="w-full text-center px-3 py-3 text-sm font-medium text-[var(--green)] hover:bg-white/5 transition-colors">
                Sign in
              </button>
            </SignInButton>
          ) : null}
        </div>
      )}
    </div>
  );
}
