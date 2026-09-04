"use client";
import { Repeat2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useAuth } from "@clerk/nextjs";

export interface Reposter {
  handle: string;
  avatar_url?: string | null;
  verified?: boolean;
}

// Small "@x reposted" label shown above a card that reached the feed via a repost.
export function RepostBanner({ by }: { by: Reposter }) {
  return (
    <Link
      href={`/profile/${by.handle}`}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors pl-1"
    >
      <Repeat2 className="w-3.5 h-3.5" />
      @{by.handle} reposted
    </Link>
  );
}

export function RepostButton({
  targetType,
  targetId,
  initialReposted = false,
  ownPost = false,
}: {
  targetType: "trade" | "post";
  targetId: string;
  initialReposted?: boolean;
  ownPost?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const [reposted, setReposted] = useState(initialReposted);
  const [busy, setBusy] = useState(false);

  if (ownPost) return null;

  async function toggle() {
    if (!isSignedIn || busy) return;
    const next = !reposted;
    setReposted(next);
    setBusy(true);
    const res = await fetch("/api/repost", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
    }).catch(() => null);
    if (!res || !res.ok) setReposted(!next);
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={clsx(
        "flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50",
        reposted ? "text-[var(--green)]" : "text-gray-500 hover:text-[var(--green)]"
      )}
    >
      <Repeat2 className="w-4 h-4" />
      <span className="hidden sm:inline">{reposted ? "Reposted" : "Repost"}</span>
    </button>
  );
}
