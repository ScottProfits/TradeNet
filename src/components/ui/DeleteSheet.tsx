"use client";
import { Trash2, X } from "lucide-react";

export default function DeleteSheet({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-t-2xl w-full max-w-lg p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-sm text-gray-400">
          Delete this {label}? This can&apos;t be undone.
        </p>
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] font-semibold py-3 rounded-xl hover:bg-[var(--red)]/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete {label}
        </button>
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-[var(--border)] text-gray-400 font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}
