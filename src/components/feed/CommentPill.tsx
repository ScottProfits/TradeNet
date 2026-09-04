"use client";
import { Keyboard } from "lucide-react";

// Opens the comment thread + focuses the text box. Sits next to the Voice
// button and matches its style.
export default function CommentPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Write a comment"
      className="shrink-0 flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-[3px] text-gray-500 hover:text-gray-300 hover:border-white/15 transition-colors"
    >
      <Keyboard className="w-4 h-4" />
    </button>
  );
}
