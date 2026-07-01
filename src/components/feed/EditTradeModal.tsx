"use client";
import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

interface EditTradeProps {
  tradeId: string;
  initial: {
    ticker: string;
    direction: "Long" | "Short";
    entry: number;
    exit: number;
    shares: number;
    notes: string;
    strategy: string;
  };
  onSaved: (updates: { ticker: string; direction: string; pnl: number; pnlPct: number; notes: string; strategy: string }) => void;
  onClose: () => void;
}

export default function EditTradeModal({ tradeId, initial, onSaved, onClose }: EditTradeProps) {
  const [ticker, setTicker] = useState(initial.ticker);
  const [direction, setDirection] = useState<"LONG" | "SHORT">(initial.direction === "Long" ? "LONG" : "SHORT");
  const [entry, setEntry] = useState(String(initial.entry));
  const [exit, setExit] = useState(String(initial.exit));
  const [shares, setShares] = useState(String(initial.shares || 100));
  const [caption, setCaption] = useState(initial.notes);
  const [strategy, setStrategy] = useState(initial.strategy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const sharesNum = parseFloat(shares) || 1;
  let preview: number | null = null;
  let previewPct: number | null = null;
  if (!isNaN(entryNum) && !isNaN(exitNum) && entryNum > 0) {
    preview = direction === "LONG" ? (exitNum - entryNum) * sharesNum : (entryNum - exitNum) * sharesNum;
    previewPct = direction === "LONG" ? ((exitNum - entryNum) / entryNum) * 100 : ((entryNum - exitNum) / entryNum) * 100;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, direction, entry, exit, shares, caption, strategy }),
    });
    if (!res.ok) { setError(await res.text()); setSaving(false); return; }
    const updated = await res.json();
    onSaved({
      ticker: updated.ticker,
      direction: updated.direction,
      pnl: updated.pnl,
      pnlPct: updated.pnl_percent,
      notes: updated.caption ?? "",
      strategy: updated.strategy ?? "",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Edit Trade</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                required
                maxLength={12}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDirection("LONG")}
                  className={clsx("flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    direction === "LONG" ? "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40" : "bg-[var(--bg)] text-gray-500 border border-[var(--border)]")}>
                  <TrendingUp className="w-3.5 h-3.5" /> Long
                </button>
                <button type="button" onClick={() => setDirection("SHORT")}
                  className={clsx("flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    direction === "SHORT" ? "bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/40" : "bg-[var(--bg)] text-gray-500 border border-[var(--border)]")}>
                  <TrendingDown className="w-3.5 h-3.5" /> Short
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Entry $</label>
              <input value={entry} onChange={(e) => setEntry(e.target.value)} type="number" step="0.01" min="0" required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--green)]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Exit $</label>
              <input value={exit} onChange={(e) => setExit(e.target.value)} type="number" step="0.01" min="0" required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--green)]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Shares</label>
              <input value={shares} onChange={(e) => setShares(e.target.value)} type="number" min="1"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--green)]" />
            </div>
          </div>

          {preview !== null && (
            <div className={clsx("rounded-lg px-4 py-3 flex items-center justify-between",
              preview >= 0 ? "bg-[var(--green)]/10 border border-[var(--green)]/20" : "bg-[var(--red)]/10 border border-[var(--red)]/20")}>
              <span className="text-sm text-gray-400">P&L Preview</span>
              <div className="text-right">
                <span className={clsx("font-bold", preview >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
                  {preview >= 0 ? "+" : ""}${Math.abs(preview).toFixed(2)}
                </span>
                <span className={clsx("text-sm ml-2", preview >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
                  ({previewPct! >= 0 ? "+" : ""}{previewPct!.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Caption</label>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={280}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] resize-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Strategy</label>
            <input value={strategy} onChange={(e) => setStrategy(e.target.value)} maxLength={100}
              placeholder="e.g. Momentum breakout, VWAP reclaim..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]" />
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
