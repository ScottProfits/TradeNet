"use client";
import { MessageCircle } from "lucide-react";

// Slim faux-input that opens the comment thread. Shared by trade + post cards.
export default function CommentPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Add a comment"
      className="group flex-1 min-w-0 flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.06]"
    >
      <MessageCircle className="w-3.5 h-3.5 shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors" />
      <span
        className="truncate text-[13px] font-light tracking-[0.02em] text-gray-500 group-hover:text-gray-300 transition-colors"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        Add a comment
      </span>
    </button>
  );
}
