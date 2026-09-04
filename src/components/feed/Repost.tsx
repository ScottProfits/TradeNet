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

// Ryzr's repost mark — a slim single-loop arrow. Minimal on purpose.
// (Trivial to swap: it's the only place the glyph is defined.)
export function RepostIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9.5h9.5a3.5 3.5 0 0 1 3.5 3.5" />
      <path d="m8.5 6.5-3 3 3 3" />
      <path d="M18 14.5H8.5A3.5 3.5 0 0 1 5 11" />
      <path d="m15.5 17.5 3-3-3-3" />
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
