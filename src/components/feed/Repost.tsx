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

// Ryzr's own repost mark — a rounded "relay" loop, distinct from the
// generic retweet chevrons.
export function RepostIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 7h8.5a3.5 3.5 0 0 1 3.5 3.5v1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path d="M9.6 4.2 6.4 7l3.2 2.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M17 17H8.5A3.5 3.5 0 0 1 5 13.5v-1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path d="M14.4 19.8 17.6 17l-3.2-2.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
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
