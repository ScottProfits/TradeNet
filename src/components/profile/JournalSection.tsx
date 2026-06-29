"use client";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Plus, Trash2, Check, TrendingUp, TrendingDown, BookOpen, X, Pencil } from "lucide-react";

interface TradeNote {
  id: string;
  ticker: string;
  direction: string;
  pnl: number;
  journal_note: string;
  created_at: string;
}

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function JournalSection() {
  const [tab, setTab] = useState<"notes" | "trades">("notes");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tradeNotes, setTradeNotes] = useState<TradeNote[]>([]);
  const [loading, setLoading] = useState(true);

  // New entry form
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editTradeNote, setEditTradeNote] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/journal/entries").then((r) => r.ok ? r.json() : []),
      fetch("/api/journal/trades").then((r) => r.ok ? r.json() : []),
    ]).then(([e, t]) => {
      setEntries(e);
      setTradeNotes(t);
      setLoading(false);
    });
  }, []);

  async function createEntry() {
    if (!newContent.trim()) return;
    setSaving(true);
    const res = await fetch("/api/journal/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setNewTitle(""); setNewContent(""); setShowNew(false);
    }
    setSaving(false);
  }

  async function saveEdit(id: string) {
    await fetch("/api/journal/entries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editTitle, content: editContent }),
    });
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, title: editTitle || null, content: editContent } : e));
    setEditingId(null);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch("/api/journal/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function saveTradeNote(id: string) {
    await fetch("/api/journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: id, note: editTradeNote }),
    });
    setTradeNotes((prev) => prev.map((t) => t.id === id ? { ...t, journal_note: editTradeNote } : t));
    setEditingTradeId(null);
  }

  async function deleteTradeNote(id: string) {
    if (!confirm("Remove this trade note?")) return;
    await fetch("/api/journal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId: id, note: null }),
    });
    setTradeNotes((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-yellow-400" /> Private Journal
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5">
            <button onClick={() => setTab("notes")} className={clsx("px-3 py-1 text-xs font-semibold rounded-md transition-colors", tab === "notes" ? "bg-yellow-500/20 text-yellow-400" : "text-gray-500 hover:text-white")}>
              Notes
            </button>
            <button onClick={() => setTab("trades")} className={clsx("px-3 py-1 text-xs font-semibold rounded-md transition-colors", tab === "trades" ? "bg-yellow-500/20 text-yellow-400" : "text-gray-500 hover:text-white")}>
              Trade Notes {tradeNotes.length > 0 && `(${tradeNotes.length})`}
            </button>
          </div>
          {tab === "notes" && (
            <button onClick={() => setShowNew((s) => !s)} className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-lg hover:bg-yellow-500/30 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          )}
        </div>
      </div>

      {/* New note form */}
      {tab === "notes" && showNew && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-gray-600 focus:outline-none border-b border-yellow-500/20 pb-2"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            autoFocus
            className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={createEntry} disabled={saving || !newContent.trim()} className="px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-yellow-400 transition-colors">
              {saving ? "Saving..." : "Save Note"}
            </button>
            <button onClick={() => { setShowNew(false); setNewTitle(""); setNewContent(""); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
      ) : tab === "notes" ? (
        entries.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-gray-500 text-sm">No notes yet. Tap New Note to start journaling.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4">
                {editingId === entry.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title (optional)"
                      className="w-full bg-transparent text-sm font-semibold text-white placeholder-gray-600 focus:outline-none border-b border-yellow-500/20 pb-1"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      autoFocus
                      className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(entry.id)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        {entry.title && <p className="text-sm font-semibold text-white mb-1">{entry.title}</p>}
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingId(entry.id); setEditTitle(entry.title ?? ""); setEditContent(entry.content); }} className="p-1.5 text-gray-600 hover:text-yellow-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">
                      {new Date(entry.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        tradeNotes.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No trade notes yet. Open a trade card and tap Journal to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tradeNotes.map((t) => {
              const positive = t.pnl >= 0;
              return (
                <div key={t.id} className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white text-sm">${t.ticker}</span>
                    {(t.direction === "LONG" || t.direction === "Long")
                      ? <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />
                      : <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />}
                    <span className={clsx("text-xs font-semibold", positive ? "text-[var(--green)]" : "text-[var(--red)]")}>
                      {positive ? "+" : ""}${Math.abs(t.pnl).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button onClick={() => { setEditingTradeId(t.id); setEditTradeNote(t.journal_note); }} className="p-1 text-gray-600 hover:text-yellow-400 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTradeNote(t.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {editingTradeId === t.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editTradeNote}
                        onChange={(e) => setEditTradeNote(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none resize-none border-b border-yellow-500/20 pb-1"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveTradeNote(t.id)} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingTradeId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{t.journal_note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
