"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useAuth } from "@clerk/nextjs";

export interface Reposter {
  handle: string;
  avatar_url?: string | null;
  verified?: boolean;
}

// Ryzr's repost mark — a cyclone: a spiral winding outward into an
// arrowhead. (Easy to revert to a plain retweet glyph if it doesn't land.)
export function RepostIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 12.4a0.6 0.6 0 1 1 0.7-0.6c0 1.6-1.5 2.9-3.2 2.9-2.2 0-4-1.9-4-4.2 0-2.9 2.4-5.2 5.3-5.2 3.6 0 6.5 3 6.5 6.7" />
      <path d="M14.7 10.8 17.3 12l1-2.7" />
    </svg>
  );
}

// "@x reposted" label above a card that reached the feed via a repost.
export function RepostBanner({ by }: { by: Reposter }) {
  return (
    <Link
      href={`/profile/${by.handle}`}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors pl-1"
    >
      <RepostIcon className="w-3.5 h-3.5" />
      @{by.handle} reposted
    </Link>
  );
}

export function RepostButton({
  targetType,
  targetId,
  initialReposted = false,
  count = 0,
  ownPost = false,
}: {
  targetType: "trade" | "post";
  targetId: string;
  initialReposted?: boolean;
  count?: number;
  ownPost?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const [reposted, setReposted] = useState(initialReposted);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);

  // Feed/profile learn "did I repost this" asynchronously — sync when it lands.
  useEffect(() => { setReposted(initialReposted); }, [initialReposted]);
  useEffect(() => { setN(count); }, [count]);

  if (ownPost) return null;

  async function toggle() {
    if (!isSignedIn || busy) return;
    const next = !reposted;
    setReposted(next);
    setN((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    const res = await fetch("/api/repost", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setReposted(!next);
      setN((c) => Math.max(0, c + (next ? -1 : 1)));
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={reposted}
      className={clsx(
        "flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50",
        reposted ? "text-[var(--green)]" : "text-gray-500 hover:text-[var(--green)]"
      )}
    >
      <RepostIcon className="w-4 h-4" />
      {n > 0 && <span>{n}</span>}
      <span className="hidden sm:inline">{reposted ? "Reposted" : "Repost"}</span>
    </button>
  );
}
