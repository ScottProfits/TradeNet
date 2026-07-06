"use client";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, TrendingUp, TrendingDown, ImagePlus, Video, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@clerk/nextjs";

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
    imageUrl?: string | null;
  };
  onSaved: (updates: { ticker: string; direction: string; pnl: number; pnlPct: number; notes: string; strategy: string; imageUrl: string | null }) => void;
  onClose: () => void;
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm|avi|mkv)/i.test(url);
}

export default function EditTradeModal({ tradeId, initial, onSaved, onClose }: EditTradeProps) {
  const { userId } = useAuth();
  const [ticker, setTicker] = useState(initial.ticker);
  const [direction, setDirection] = useState<"LONG" | "SHORT">(initial.direction === "Long" ? "LONG" : "SHORT");
  const [entry, setEntry] = useState(String(initial.entry));
  const [exit, setExit] = useState(String(initial.exit));
  const [shares, setShares] = useState(String(initial.shares || 100));
  const [caption, setCaption] = useState(initial.notes);
  const [strategy, setStrategy] = useState(initial.strategy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Media state: existingUrl (untouched), newMedia (replacement file), removed (explicit clear)
  const [existingUrl, setExistingUrl] = useState<string | null>(initial.imageUrl ?? null);
  const [newMedia, setNewMedia] = useState<File | null>(null);
  const [newMediaPreview, setNewMediaPreview] = useState<string | null>(null);
  const [newMediaType, setNewMediaType] = useState<"image" | "video" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const sharesNum = parseFloat(shares) || 1;
  let preview: number | null = null;
  let previewPct: number | null = null;
  if (!isNaN(entryNum) && !isNaN(exitNum) && entryNum > 0) {
    preview = direction === "LONG" ? (exitNum - entryNum) * sharesNum : (entryNum - exitNum) * sharesNum;
    previewPct = direction === "LONG" ? ((exitNum - entryNum) / entryNum) * 100 : ((entryNum - exitNum) / entryNum) * 100;
  }

  function handleMediaPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewMedia(file);
    setNewMediaPreview(URL.createObjectURL(file));
    setNewMediaType(file.type.startsWith("video/") ? "video" : "image");
  }

  function handleRemoveMedia() {
    setExistingUrl(null);
    setNewMedia(null);
    setNewMediaPreview(null);
    setNewMediaType(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let image_url: string | null = existingUrl;

    if (newMedia && userId) {
      const ext = newMedia.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("trade-images").upload(path, newMedia, { contentType: newMedia.type });
      if (uploadError) { setError("Upload failed: " + uploadError.message); setSaving(false); return; }
      const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
      image_url = data.publicUrl;
    }

    const res = await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, direction, entry, exit, shares, caption, strategy, image_url }),
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
      imageUrl: updated.image_url ?? null,
    });
    onClose();
  }

  const currentMediaUrl = newMediaPreview ?? existingUrl;
  const currentMediaIsVideo = newMediaPreview ? newMediaType === "video" : currentMediaUrl ? isVideo(currentMediaUrl) : false;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative solid-menu rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                <span className={clsx("font-bold", preview >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
                  {preview >= 0 ? "+" : ""}${Math.abs(preview).toFixed(2)}
                </span>
                <span className={clsx("text-sm ml-2", preview >= 0 ? "text-[var(--green)] glow-green" : "text-[var(--red)] glow-red")}>
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

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Photo or video</label>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaPick} />
            {currentMediaUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
                {currentMediaIsVideo ? (
                  <video src={currentMediaUrl} controls className="w-full max-h-48 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentMediaUrl} alt="preview" className="w-full max-h-48 object-cover" />
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="bg-black/70 hover:bg-black/90 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="bg-black/70 hover:bg-[var(--red)]/80 text-white p-1.5 rounded-lg transition-colors"
                    aria-label="Remove media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-[var(--border)] text-gray-500 hover:text-white hover:border-[var(--green)]/40 transition-colors text-sm"
              >
                <ImagePlus className="w-4 h-4" /><Video className="w-4 h-4" /> Add photo or video
              </button>
            )}
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl transition-all duration-300 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgba(0,200,150,0.25) 0%, rgba(0,168,126,0.15) 100%)",
              boxShadow: "0 0 24px rgba(0,200,150,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
              border: "1px solid rgba(0,200,150,0.35)",
            }}
          >
            <span
              className="text-[11px] tracking-[0.18em] font-semibold uppercase"
              style={{ color: "#00C896", textShadow: "0 0 12px rgba(0,200,150,0.6)" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
