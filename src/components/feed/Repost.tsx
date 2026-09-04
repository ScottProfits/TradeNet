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

// Ryzr's repost mark — a clean spiral. Minimal on purpose.
// (Trivial to swap: it's the only place the glyph is defined.)
export function RepostIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 11.5L12.2 11.3L12.6 11.2L13 11.4L13.4 11.7L13.7 12.2L13.7 12.8L13.5 13.5L13.1 14.1L12.3 14.6L11.4 14.8L10.4 14.7L9.4 14.1L8.6 13.2L8.2 12.1L8.1 10.7L8.6 9.4L9.5 8.2L10.8 7.4L12.4 7L14.1 7.2L15.7 8L17.1 9.4L17.9 11.1L18.1 13.2L17.6 15.2L16.3 17L14.5 18.4L12.3 19.1L9.9 19L7.5 18.1" />
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
