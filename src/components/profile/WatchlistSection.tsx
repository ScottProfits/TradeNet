"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, X, TrendingUp, TrendingDown, Search, Loader2 } from "lucide-react";

interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

function formatVolume(v: number | null) {
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

export default function WatchlistSection({ handle, isOwner }: { handle: string; isOwner: boolean }) {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch(`/api/watchlist?handle=${handle}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setItems(d); setLoading(false); });
  }, [handle]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setSearchResults([]);
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
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: result.symbol, name: result.name, asset_type: result.type }),
    });
    if (res.ok) {
      const refreshed = await fetch(`/api/watchlist?handle=${handle}`).then((r) => r.json());
      setItems(refreshed);
    }
    setAdding(false);
  }

  async function removeSymbol(symbol: string) {
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
  }

  if (loading) return (
    <div className="space-y-3">
      <div className="h-5 w-32 bg-white/5 rounded animate-pulse" />
      <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--green)]" /> Watchlist
        </h2>
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
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-gray-500 text-sm">{isOwner ? "Add stocks, futures, or crypto to track." : "No watchlist yet."}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Header */}
          <div className="grid gap-2 px-4 py-2 border-b border-white/5"
            style={{ gridTemplateColumns: "1fr 80px 80px 70px" }}>
            {["Symbol", "Price", "Change", "Volume"].map((h) => (
              <p key={h} className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold text-right first:text-left">{h}</p>
            ))}
          </div>

          {/* Rows */}
          {items.map((item) => {
            const up = (item.change ?? 0) >= 0;
            return (
              <div key={item.id} className="grid gap-2 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group"
                style={{ gridTemplateColumns: "1fr 80px 80px 70px" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: up ? "rgba(0,200,150,0.1)" : "rgba(239,68,68,0.1)" }}>
                    {up ? <TrendingUp className="w-3.5 h-3.5 text-[#00C896]" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.symbol}</p>
                    <p className="text-[10px] text-gray-600 truncate">{item.name}</p>
                  </div>
                  {isOwner && (
                    <button onClick={() => removeSymbol(item.symbol)}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-sm font-semibold text-white text-right self-center">
                  {item.price != null ? `$${item.price.toFixed(2)}` : "—"}
                </p>

                <div className="text-right self-center">
                  <p className={`text-sm font-semibold ${up ? "text-[#00C896]" : "text-red-400"}`}>
                    {item.changePct != null ? `${up ? "+" : ""}${item.changePct.toFixed(2)}%` : "—"}
                  </p>
                  <p className={`text-[10px] ${up ? "text-[#00C896]/70" : "text-red-400/70"}`}>
                    {item.change != null ? `${up ? "+" : ""}$${item.change.toFixed(2)}` : ""}
                  </p>
                </div>

                <p className="text-xs text-gray-500 text-right self-center">{formatVolume(item.volume)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
