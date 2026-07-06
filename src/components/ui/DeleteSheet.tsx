"use client";
import { Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function DeleteSheet({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={ready ? onCancel : undefined}
    >
      <div
        className="glass-card rounded-t-2xl w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[var(--red)]/10 border border-[var(--red)]/30 rounded-xl p-2.5">
            <Trash2 className="w-5 h-5 text-[var(--red)]" />
          </div>
          <p className="text-sm text-gray-400">
            Delete this {label}?<br />
            <span className="text-gray-600 text-xs">This can&apos;t be undone.</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            disabled={!ready}
            onClick={ready ? onCancel : undefined}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-[var(--border)] text-gray-400 font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            disabled={!ready}
            onClick={ready ? onConfirm : undefined}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] font-semibold py-3 rounded-xl hover:bg-[var(--red)]/20 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
