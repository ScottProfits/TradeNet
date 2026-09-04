"use client";
import { Keyboard } from "lucide-react";
import { clsx } from "clsx";

// Opens/closes the comment thread + focuses the text box. Sits next to the
// Voice button and matches its style.
export default function CommentPill({ onOpen, active = false }: { onOpen: () => void; active?: boolean }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Write a comment"
      aria-pressed={active}
      className={clsx(
        "shrink-0 flex items-center rounded-md border px-2 py-[3px] transition-colors",
        active
          ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
          : "border-white/[0.08] bg-white/[0.03] text-gray-500 hover:text-gray-300 hover:border-white/15"
      )}
    >
      <Keyboard className="w-4 h-4" />
    </button>
  );
}
