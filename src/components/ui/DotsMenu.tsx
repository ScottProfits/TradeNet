"use client";
import { useState, useRef, useEffect } from "react";
import { NotebookPen, Trash2 } from "lucide-react";

interface DotsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export default function DotsMenu({ onEdit, onDelete }: DotsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((s) => !s); }}
        className="flex flex-col items-center justify-center gap-[3px] p-1.5 text-gray-500 hover:text-white transition-colors"
        aria-label="More options"
      >
        <span className="w-1 h-1 rounded-full bg-current" />
        <span className="w-1 h-1 rounded-full bg-current" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-40 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden min-w-[130px]">
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <NotebookPen className="w-4 h-4" /> Edit
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
