"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TrendingUp, Search } from "lucide-react";
import { clsx } from "clsx";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface SearchResult {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
}

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/strategies", label: "Strategies" },
  { href: "/markets", label: "Markets" },
  { href: "/discover", label: "Discover" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
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
    setQuery("");
    setResults([]);
    setShowResults(false);
    router.push(`/profile/${handle}`);
  }

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
                placeholder="Search traders..."
                className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
              />
            </div>

            {showResults && results.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50">
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

            {showResults && query.trim() && results.length === 0 && (
              <div className="absolute top-full mt-1 w-full bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl px-4 py-3 z-50">
                <p className="text-sm text-gray-500">No traders found</p>
              </div>
            )}
          </div>

          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
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
