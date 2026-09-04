"use client";

// Slim faux-input that opens the comment thread. Shared by trade + post cards.
export default function CommentPill({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Add a comment"
      className="flex-1 min-w-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-[2px] text-left leading-none transition-colors hover:border-white/15 hover:bg-white/[0.06]"
    >
      <span
        className="text-[12px] italic text-gray-500 transition-colors hover:text-gray-300"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        Share thoughts
      </span>
    </button>
  );
}
