"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid2x2, Search, Bell, MessageSquare, X } from "lucide-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface SearchResult {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
}

interface TickerResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export default function MobileTopMenu() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tickerResults, setTickerResults] = useState<TickerResult[]>([]);
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
    if (!query.trim()) { setResults([]); setTickerResults([]); return; }
    const timer = setTimeout(async () => {
      const [usersRes, tickersRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/ticker-search?q=${encodeURIComponent(query)}`),
      ]);
      if (usersRes.ok) setResults(await usersRes.json());
      if (tickersRes.ok) setTickerResults(await tickersRes.json());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goToProfile(handle: string) {
    setOpen(false); setQuery(""); setResults([]); setTickerResults([]);
    window.scrollTo(0, 0);
    router.push(`/profile/${handle}`);
  }

  function goToTicker(symbol: string) {
    setOpen(false); setQuery(""); setResults([]); setTickerResults([]);
    window.scrollTo(0, 0);
    router.push(`/ticker/${encodeURIComponent(symbol)}`);
  }

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
        <div className="absolute right-0 top-full mt-2 w-72 solid-menu rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search traders or tickers..."
              className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
              </button>
            )}
          </div>

          {(results.length > 0 || tickerResults.length > 0) && (
            <div className="max-h-64 overflow-y-auto border-b border-white/5">
              {tickerResults.slice(0, 4).map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => goToTicker(r.symbol)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-sm font-bold text-white">{r.symbol}</span>
                  <span className="text-[10px] text-gray-600 uppercase">{r.exchange}</span>
                </button>
              ))}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goToProfile(r.handle)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <SafeAvatar src={r.avatar_url} alt={r.handle} initials={r.handle} className="w-6 h-6 text-[9px]" />
                  <span className="text-sm text-white truncate">@{r.handle}</span>
                  {r.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          )}

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
