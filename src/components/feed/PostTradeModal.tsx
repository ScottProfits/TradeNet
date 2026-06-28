"use client";
import { useState, useRef } from "react";
import { X, TrendingUp, TrendingDown, ImagePlus } from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";

interface Props {
  onClose: () => void;
  onPosted: () => void;
}

export default function PostTradeModal({ onClose, onPosted }: Props) {
  const { userId } = useAuth();
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [shares, setShares] = useState("100");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const sharesNum = parseFloat(shares) || 100;

  let preview: number | null = null;
  let previewPct: number | null = null;
  if (!isNaN(entryNum) && !isNaN(exitNum) && entryNum > 0) {
    if (direction === "LONG") {
      preview = (exitNum - entryNum) * sharesNum;
      previewPct = ((exitNum - entryNum) / entryNum) * 100;
    } else {
      preview = (entryNum - exitNum) * sharesNum;
      previewPct = ((entryNum - exitNum) / entryNum) * 100;
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let image_url: string | null = null;

      if (image && userId) {
        const ext = image.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("trade-images")
          .upload(path, image, { contentType: image.type });

        if (uploadError) {
          setError("Image upload failed: " + uploadError.message);
          setSubmitting(false);
          return;
        }

        const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, direction, entry, exit, shares, caption, image_url }),
      });

      if (!res.ok) {
        setError((await res.text()) || "Failed to post trade");
      } else {
        onPosted();
        onClose();
      }
    } catch {
      setError("Something went wrong. Try again.");
    }

    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Post a Trade</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker + Direction */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Ticker</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                maxLength={10}
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={clsx(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    direction === "LONG"
                      ? "bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40"
                      : "bg-[var(--bg)] text-gray-500 border border-[var(--border)] hover:text-white"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Long
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={clsx(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    direction === "SHORT"
                      ? "bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/40"
                      : "bg-[var(--bg)] text-gray-500 border border-[var(--border)] hover:text-white"
                  )}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Short
                </button>
              </div>
            </div>
          </div>

          {/* Entry / Exit / Shares */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Entry $</label>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="150.00"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Exit $</label>
              <input
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                placeholder="165.00"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Shares</label>
              <input
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="100"
                type="number"
                min="1"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>

          {/* P&L Preview */}
          {preview !== null && (
            <div className={clsx(
              "rounded-lg px-4 py-3 flex items-center justify-between",
              preview >= 0 ? "bg-[var(--green)]/10 border border-[var(--green)]/20" : "bg-[var(--red)]/10 border border-[var(--red)]/20"
            )}>
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

          {/* Caption */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Caption (optional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What was your thesis? How did it play out?"
              rows={3}
              maxLength={280}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] resize-none"
            />
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Screenshot (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
                <Image
                  src={imagePreview}
                  alt="Trade screenshot"
                  width={400}
                  height={200}
                  className="w-full object-cover max-h-48"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-[var(--border)] rounded-lg py-4 flex flex-col items-center gap-2 text-gray-500 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">Tap to attach a screenshot</span>
              </button>
            )}
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post Trade"}
          </button>
        </form>
      </div>
    </div>
  );
}
