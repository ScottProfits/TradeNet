"use client";
import { useState, useRef, useEffect } from "react";
import { X, TrendingUp, TrendingDown, ImagePlus, Video, Search } from "lucide-react";
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
  const [tab, setTab] = useState<"trade" | "post">("trade");
  const [postContent, setPostContent] = useState("");
  const [ticker, setTicker] = useState("");
  const [tickerName, setTickerName] = useState("");
  const [tickerResults, setTickerResults] = useState<{ symbol: string; name: string; type: string }[]>([]);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [shares, setShares] = useState("100");
  const [qtyType, setQtyType] = useState<"shares" | "contracts">("shares");
  const [caption, setCaption] = useState("");
  const [strategy, setStrategy] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ticker || ticker.length < 1) { setTickerResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(ticker)}`);
      if (res.ok) setTickerResults(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [ticker]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tickerRef.current && !tickerRef.current.contains(e.target as Node)) setShowTickerDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const sharesNum = parseFloat(shares) || 100;
  // Contracts = 100 shares each (standard options multiplier)
  const effectiveShares = qtyType === "contracts" ? sharesNum * 100 : sharesNum;

  let preview: number | null = null;
  let previewPct: number | null = null;
  if (!isNaN(entryNum) && !isNaN(exitNum) && entryNum > 0) {
    if (direction === "LONG") {
      preview = (exitNum - entryNum) * effectiveShares;
      previewPct = ((exitNum - entryNum) / entryNum) * 100;
    } else {
      preview = (entryNum - exitNum) * effectiveShares;
      previewPct = ((entryNum - exitNum) / entryNum) * 100;
    }
  }

  function handleMediaPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
  }

  function clearMedia() {
    setMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!postContent.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (media && userId) {
        const ext = media.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("trade-images").upload(path, media, { contentType: media.type });
        if (uploadError) { setError("Upload failed: " + uploadError.message); setSubmitting(false); return; }
        const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent, image_url }),
      });
      if (!res.ok) { setError(await res.text()); } else { onPosted(); onClose(); }
    } catch { setError("Something went wrong."); }
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      let image_url: string | null = null;

      if (media && userId) {
        const ext = media.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("trade-images")
          .upload(path, media, { contentType: media.type });

        if (uploadError) {
          setError("Upload failed: " + uploadError.message);
          setSubmitting(false);
          return;
        }

        const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, direction, entry, exit, shares: String(effectiveShares), caption, strategy, image_url }),
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
          <h2 className="text-lg font-bold text-white">Create Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[var(--bg)] rounded-lg p-1 gap-1">
          <button type="button" onClick={() => setTab("trade")} className={clsx("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", tab === "trade" ? "bg-[var(--green)] text-black" : "text-gray-400 hover:text-white")}>
            📈 Trade
          </button>
          <button type="button" onClick={() => setTab("post")} className={clsx("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", tab === "post" ? "bg-[var(--green)] text-black" : "text-gray-400 hover:text-white")}>
            💬 Post
          </button>
        </div>

        {/* Regular post form */}
        {tab === "post" && (
          <form onSubmit={handlePostSubmit} className="space-y-4">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share your thoughts, market analysis, news..."
              rows={4}
              maxLength={500}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] resize-none"
            />
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaPick} />
            {mediaPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
                {mediaType === "video" ? <video src={mediaPreview} controls className="w-full max-h-48" /> : <Image src={mediaPreview} alt="preview" width={400} height={200} className="w-full object-cover max-h-48" unoptimized />}
                <button type="button" onClick={clearMedia} className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full border border-dashed border-[var(--border)] rounded-lg py-3 flex items-center justify-center gap-2 text-gray-500 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors text-xs">
                <ImagePlus className="w-4 h-4" /><Video className="w-4 h-4" /> Add photo or video
              </button>
            )}
            {error && <p className="text-[var(--red)] text-sm">{error}</p>}
            <button type="submit" disabled={submitting || !postContent.trim()} className="w-full py-2.5 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50">
              {submitting ? "Posting..." : "Post"}
            </button>
          </form>
        )}

        {tab === "trade" && <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker + Direction */}
          <div className="flex gap-3">
            <div className="flex-1 relative" ref={tickerRef}>
              <label className="text-xs text-gray-500 mb-1 block">Ticker</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <input
                  value={ticker}
                  onChange={(e) => { setTicker(e.target.value.toUpperCase()); setTickerName(""); setShowTickerDropdown(true); }}
                  onFocus={() => setShowTickerDropdown(true)}
                  placeholder="Search ticker..."
                  maxLength={12}
                  required
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
                />
              </div>
              {tickerName && (
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{tickerName}</p>
              )}
              {showTickerDropdown && tickerResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                  {tickerResults.map((r) => (
                    <button
                      key={r.symbol}
                      type="button"
                      onClick={() => { setTicker(r.symbol); setTickerName(r.name); setShowTickerDropdown(false); setTickerResults([]); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      <span className="font-bold text-white text-sm w-16 shrink-0">{r.symbol}</span>
                      <span className="text-xs text-gray-400 truncate">{r.name}</span>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-auto">{r.type}</span>
                    </button>
                  ))}
                </div>
              )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">{qtyType === "shares" ? "Shares" : "Contracts"}</label>
                <div className="flex bg-[var(--bg)] border border-[var(--border)] rounded-md overflow-hidden text-[10px]">
                  <button type="button" onClick={() => setQtyType("shares")}
                    className={clsx("px-1.5 py-0.5 transition-colors", qtyType === "shares" ? "bg-[var(--green)] text-black font-semibold" : "text-gray-500")}>
                    Shrs
                  </button>
                  <button type="button" onClick={() => setQtyType("contracts")}
                    className={clsx("px-1.5 py-0.5 transition-colors", qtyType === "contracts" ? "bg-[var(--green)] text-black font-semibold" : "text-gray-500")}>
                    Cts
                  </button>
                </div>
              </div>
              <input
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder={qtyType === "shares" ? "100" : "1"}
                type="number"
                min="1"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
              />
              {qtyType === "contracts" && <p className="text-[10px] text-gray-600 mt-0.5">×100 shares each</p>}
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

          {/* Strategy */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">What strategy did you use? (optional)</label>
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="e.g. Momentum breakout, VWAP reclaim, Earnings play..."
              maxLength={100}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Media upload — photo or video */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Photo / Video (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleMediaPick}
            />
            {mediaPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
                {mediaType === "video" ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-48 object-cover"
                  />
                ) : (
                  <Image
                    src={mediaPreview}
                    alt="Trade screenshot"
                    width={400}
                    height={200}
                    className="w-full object-cover max-h-48"
                    unoptimized
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
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
                <div className="flex gap-3">
                  <ImagePlus className="w-5 h-5" />
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-xs">Tap to attach a photo or video</span>
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
        </form>}
      </div>
    </div>
  );
}
