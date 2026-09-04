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

// Ryzr's repost mark — two interlocking spiral arms (an S of arrows).
// One arm is drawn; the other is it rotated 180°. Only place it's defined.
const REPOST_ARM =
  "M10.56 12.90L10.38 12.89L10.21 12.85L10.05 12.79L9.89 12.72L9.74 12.63L9.59 12.52L9.45 12.40L9.31 12.26L9.19 12.11L9.07 11.95L8.97 11.77L8.88 11.58L8.80 11.38L8.73 11.17L8.68 10.95L8.64 10.72L8.62 10.48L8.62 10.24L8.64 10.00L8.67 9.74L8.72 9.49L8.79 9.24L8.88 8.98L8.98 8.73L9.11 8.48L9.26 8.24L9.42 8.00L9.61 7.76L9.81 7.54L10.03 7.32L10.27 7.12L10.52 6.93L10.79 6.75L11.08 6.59L11.38 6.45L11.70 6.32L12.03 6.21L12.37 6.12L12.72 6.05L13.08 6.00L13.44 5.97L13.82 5.97L14.20 5.99L14.58 6.03L14.97 6.10L15.35 6.20M13.19 4.27L15.35 6.20L12.59 7.09";

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
      <path d={REPOST_ARM} />
      <path d={REPOST_ARM} transform="rotate(180 12 12)" />
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
