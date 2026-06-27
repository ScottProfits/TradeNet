"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, Search } from "lucide-react";
import { clsx } from "clsx";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/strategies", label: "Strategies" },
  { href: "/markets", label: "Markets" },
  { href: "/discover", label: "Discover" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

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
          <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 w-64">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              placeholder="Search traders, tickers..."
              className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-full"
            />
          </div>
          {isSignedIn ? (
            <UserButton />
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
