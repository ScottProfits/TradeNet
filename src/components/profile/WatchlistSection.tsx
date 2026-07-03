"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, X, TrendingUp, TrendingDown, Search, Loader2 } from "lucide-react";

interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  added_at: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  priceWhenAdded: number | null;
  changeSinceAdded: number | null;
  changeSinceAddedPct: number | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

function fmt(v: number | null, prefix = "$") {
  if (v == null) return "—";
  return `${prefix}${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

interface Props {
  handle: string;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
}

export default function WatchlistSection({ handle, isOwner, open, onClose }: Props) {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const load = () =>
      fetch(`/api/watchlist?handle=${handle}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d) => { setItems(d); setLoading(false); });
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [open, handle]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setTimeout(() => { setShowSearch(false); setSearchResults([]); }, 200);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function onSearchChange(q: string) {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(q)}`);
      const data = res.ok ? await res.json() : [];
      setSearchResults(data.slice(0, 6));
      setSearching(false);
    }, 350);
  }

  async function addSymbol(result: SearchResult) {
    setAdding(true);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: result.symbol, name: result.name, asset_type: result.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to add: ${data.error ?? res.status}`);
      } else {
        const refreshed = await fetch(`/api/watchlist?handle=${handle}`).then((r) => r.json());
        setItems(refreshed);
      }
    } catch (e) {
      alert(`Error: ${e}`);
    }
    setAdding(false);
  }

  async function removeSymbol(symbol: string) {
    if (!confirm(`Remove ${symbol} from your watchlist?`)) return;
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      style={{ background: "rgba(0,0,0,0.6)", alignItems: "flex-end", paddingBottom: "80px" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl flex flex-col"
        style={{
          background: "rgba(10,10,10,0.99)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          height: "65vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00C896]" />
            <span className="font-bold text-white text-sm">Stock Watchlist</span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <div ref={searchRef} className="relative">
                <button
                  onClick={() => setShowSearch((s) => !s)}
                  className="flex items-center gap-1.5 text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.3)", color: "#00C896" }}
                >
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add
                </button>
                {showSearch && (
                  <div className="absolute right-0 top-9 w-72 rounded-xl overflow-hidden z-50"
                    style={{ background: "rgba(10,10,10,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
                      <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search symbol or name..."
                        className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1"
                      />
                      {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="py-1">
                        {searchResults.map((r) => (
                          <button key={r.symbol} onClick={() => addSymbol(r)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors text-left">
                            <div>
                              <p className="text-sm font-semibold text-white">{r.symbol}</p>
                              <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{r.name}</p>
                            </div>
                            <span className="text-[10px] text-gray-600 uppercase">{r.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery && !searching && searchResults.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-4">No results found</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <TrendingUp className="w-8 h-8 text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">{isOwner ? "Tap Add to start tracking symbols." : "No watchlist yet."}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {items.map((item) => {
                const dailyUp = (item.change ?? 0) >= 0;
                const sinceUp = (item.changeSinceAdded ?? 0) >= 0;
                return (
                  <div key={item.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                    {/* Row 1: Symbol + Last Price inline */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: dailyUp ? "rgba(0,200,150,0.1)" : "rgba(239,68,68,0.1)" }}>
                          {dailyUp ? <TrendingUp className="w-3.5 h-3.5 text-[#00C896]" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <div className="flex items-baseline gap-2 min-w-0">
                          <p className="text-sm font-bold text-white">{item.symbol}</p>
                          <p className="text-sm font-bold text-white">
                            {item.price != null ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                          </p>
                          <p className={`text-xs font-semibold ${dailyUp ? "text-[#00C896]" : "text-red-400"}`}>
                            {fmtPct(item.changePct)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mb-2 -mt-1 ml-9 truncate">{item.name}</p>

                    {/* Row 2: Stats grid */}
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                        <p className="text-[10px] text-gray-600 mb-0.5">Date Added</p>
                        <p className="text-[11px] font-semibold text-gray-400">{fmtDate(item.added_at)}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                        <p className="text-[10px] text-gray-600 mb-0.5">Price at Add</p>
                        <p className="text-[11px] font-semibold text-gray-400">{fmt(item.priceWhenAdded)}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                        <p className="text-[10px] text-gray-600 mb-0.5">Since Add %</p>
                        <p className={`text-[11px] font-semibold ${sinceUp ? "text-[#00C896]" : "text-red-400"}`}>
                          {item.changeSinceAddedPct != null ? fmtPct(item.changeSinceAddedPct) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Row 3: Day change $ + remove */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-gray-600">Day Change: </span>
                          <span className={`text-[11px] font-semibold ${dailyUp ? "text-[#00C896]" : "text-red-400"}`}>
                            {item.change != null ? `${dailyUp ? "+" : "-"}${fmt(item.change)}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-600">Since Add: </span>
                          <span className={`text-[11px] font-semibold ${sinceUp ? "text-[#00C896]" : "text-red-400"}`}>
                            {item.changeSinceAdded != null ? `${sinceUp ? "+" : "-"}${fmt(item.changeSinceAdded)}` : "—"}
                          </span>
                        </div>
                      </div>
                      {isOwner && (
                        <button onClick={() => removeSymbol(item.symbol)}
                          className="text-gray-600 hover:text-red-400 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
