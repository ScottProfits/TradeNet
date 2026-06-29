"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TrendingUp, Search, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import NotificationBell from "@/components/layout/NotificationBell";

interface UserResult {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
}

interface SearchResponse {
  type: "users" | "ticker";
  ticker?: string;
  results: UserResult[];
}

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [query, setQuery] = useState("");
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [unreadDms, setUnreadDms] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

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
    if (!query.trim()) { setSearchData(null); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setSearchData(await res.json());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goToProfile(handle: string) {
    setQuery(""); setSearchData(null); setShowResults(false);
    router.push(`/profile/${handle}`);
  }

  function goToTicker(ticker: string) {
    setQuery(""); setSearchData(null); setShowResults(false);
    router.push(`/ticker/${ticker}`);
  }

  const hasResults = searchData && searchData.results.length > 0;
  const noResults = searchData && query.trim() && searchData.results.length === 0;

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-8 h-14">
        <Link href="/feed" className="flex items-center gap-2 font-bold text-white shrink-0">
          <TrendingUp className="w-5 h-5 text-[var(--green)]" />
          Ryzr
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(l.href)
                  ? "text-white bg-white/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <div ref={searchRef} className="relative w-64">
            <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 focus-within:border-[var(--green)]/50 transition-colors">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchData?.type === "ticker" && searchData.ticker) {
                    goToTicker(searchData.ticker);
                  }
                }}
                placeholder="Search traders or $AAPL..."
                className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
              />
            </div>

            {showResults && hasResults && (
              <div className="absolute top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50">
                {searchData?.type === "ticker" && searchData.ticker && (
                  <button
                    onClick={() => goToTicker(searchData.ticker!)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition-colors text-left border-b border-[var(--border)]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--green)]/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">${searchData.ticker}</p>
                      <p className="text-xs text-gray-500">{searchData.results.length} trade{searchData.results.length !== 1 ? "s" : ""} posted</p>
                    </div>
                  </button>
                )}
                {searchData?.type === "users" && searchData.results.map((r) => (
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

            {showResults && noResults && (
              <div className="absolute top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl px-4 py-3 z-50">
                <p className="text-sm text-gray-500">No results found</p>
              </div>
            )}
          </div>

          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/messages" onClick={() => setUnreadDms(0)} className={clsx("relative p-1.5 rounded-lg transition-colors", pathname.startsWith("/messages") ? "text-white bg-white/10" : "text-gray-400 hover:text-white hover:bg-white/5")}>
                <MessageSquare className="w-5 h-5" />
                {unreadDms > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--red)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadDms > 9 ? "9+" : unreadDms}
                  </span>
                )}
              </Link>
              <NotificationBell />
              <Link href="/settings" className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                Settings
              </Link>
              <UserButton />
            </div>
          ) : (
            <SignInButton mode="redirect">
              <button className="px-3 py-1.5 text-sm font-medium text-[var(--green)] border border-[var(--green)]/30 rounded-lg hover:bg-[var(--green)]/10 transition-colors">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
}
