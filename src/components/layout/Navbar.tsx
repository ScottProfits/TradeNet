"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TrendingUp, Search, MessageSquare, X } from "lucide-react";
import { clsx } from "clsx";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import NotificationBell from "@/components/layout/NotificationBell";

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

const links = [
  { href: "/feed", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/market", label: "Market" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tickerResults, setTickerResults] = useState<TickerResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadDms, setUnreadDms] = useState(0);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/profile/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.handle) setProfileHandle(d.handle);
      else setProfileHandle(user.username ?? null);
      if (d?.avatar_url) setProfileAvatar(d.avatar_url);
    });
  }, [user?.id, user?.username]);

  const profileHref = profileHandle ? `/profile/${profileHandle}` : "/settings";

  useEffect(() => {
    if (!isSignedIn) return;
    function loadUnread() {
      fetch("/api/messages?unread=1").then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setUnreadDms(d.count));
    }
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  function goToProfile(handle: string) {
    setQuery(""); setResults([]); setTickerResults([]); setShowResults(false); setSearchOpen(false);
    router.push(`/profile/${handle}`);
  }

  function goToTicker(symbol: string) {
    setQuery(""); setResults([]); setTickerResults([]); setShowResults(false); setSearchOpen(false);
    router.push(`/ticker/${encodeURIComponent(symbol)}`);
  }

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 flex items-center gap-2 h-14 w-full">
        <Link href="/feed" className="flex items-center gap-2 font-bold text-white shrink-0">
          <TrendingUp className="w-5 h-5 text-[var(--green)]" />
          Ryzr
        </Link>

        {/* Search icon — between logo and nav tabs */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--green)]/40 rounded-lg px-3 py-1.5 w-52">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                placeholder="Search traders..."
                className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
              />
              <button onClick={() => { setSearchOpen(false); setQuery(""); setShowResults(false); }}>
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {showResults && (results.length > 0 || tickerResults.length > 0) && (
            <div className="absolute top-full mt-1 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-[200] max-h-80 overflow-y-auto">
              {tickerResults.slice(0, 4).map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => goToTicker(r.symbol)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-[var(--border)]/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{r.symbol}</span>
                      <span className="text-[10px] text-gray-600 uppercase">{r.exchange}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{r.name}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    r.type === "futures" ? "bg-orange-500/20 text-orange-400" :
                    r.type === "crypto" ? "bg-yellow-500/20 text-yellow-400" :
                    r.type === "forex" ? "bg-blue-500/20 text-blue-400" :
                    "bg-[var(--green)]/20 text-[var(--green)]"
                  }`}>{r.type}</span>
                </button>
              ))}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goToProfile(r.handle)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt={r.handle} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {r.handle.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-white truncate">@{r.handle}</span>
                      {r.verified && <VerifiedBadge className="w-3 h-3 shrink-0" />}
                    </div>
                    {r.full_name && r.full_name !== r.handle && (
                      <p className="text-xs text-gray-500 truncate">{r.full_name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && query.trim() && results.length === 0 && tickerResults.length === 0 && (
            <div className="absolute top-full mt-1 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl px-4 py-3 z-[200]">
              <p className="text-sm text-gray-500">No results found</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-1 justify-center">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                pathname.startsWith(l.href)
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
          {isLoaded && isSignedIn && (
            <span className="lg:hidden flex items-center gap-1">
              <NotificationBell />
              <Link href="/messages" className="relative p-1.5 text-gray-400 hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
                {unreadDms > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--red)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadDms > 9 ? "9+" : unreadDms}
                  </span>
                )}
              </Link>
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/messages" onClick={() => setUnreadDms(0)} className={clsx("hidden lg:flex relative p-1.5 rounded-lg transition-colors", pathname.startsWith("/messages") ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5")}>
                <MessageSquare className="w-5 h-5" />
                {unreadDms > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--red)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadDms > 9 ? "9+" : unreadDms}
                  </span>
                )}
              </Link>
              <span className="hidden lg:block"><NotificationBell /></span>
              <Link href={profileHref} className="shrink-0">
                {profileAvatar || user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(profileAvatar || user?.imageUrl) as string}
                    alt="Profile"
                    className={clsx("w-7 h-7 rounded-full object-cover", pathname.startsWith("/profile") ? "ring-2 ring-[var(--green)]" : "")}
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.username?.slice(0, 1).toUpperCase() ?? "?"}
                  </div>
                )}
              </Link>
            </>
          ) : isLoaded && !isSignedIn ? (
            <SignInButton mode="redirect">
              <button className="px-3 py-1.5 text-sm font-medium text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/10 transition-colors">
                Sign in
              </button>
            </SignInButton>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
