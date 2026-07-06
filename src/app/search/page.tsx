"use client";
import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";

interface UserResult {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
  trading_style: string;
}

interface TickerResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

const TRENDING_TICKERS = [
  { symbol: "SPY", name: "S&P 500 ETF", type: "etf" },
  { symbol: "QQQ", name: "Nasdaq ETF", type: "etf" },
  { symbol: "NVDA", name: "Nvidia", type: "stock" },
  { symbol: "TSLA", name: "Tesla", type: "stock" },
  { symbol: "AAPL", name: "Apple", type: "stock" },
  { symbol: "BTC/USD", name: "Bitcoin", type: "crypto" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [tickers, setTickers] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "traders" | "tickers">("all");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setUsers([]); setTickers([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const [usersRes, tickersRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/ticker-search?q=${encodeURIComponent(query)}`),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (tickersRes.ok) setTickers(await tickersRes.json());
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const showUsers = tab === "all" || tab === "traders";
  const showTickers = tab === "all" || tab === "tickers";

  return (
    <div className="max-w-xl mx-auto">
      {/* Search bar */}
      <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3 mb-6 focus-within:border-[var(--green)]/50 transition-colors">
        <Search className="w-5 h-5 text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search traders, tickers..."
          className="bg-transparent text-white placeholder-gray-500 outline-none w-full text-base"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-gray-500 hover:text-white text-xs">✕</button>
        )}
      </div>

      {/* Tabs */}
      {query.trim() && (
        <div className="flex gap-2 mb-5">
          {(["all", "traders", "tickers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? "bg-[var(--green)] text-black"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* No query — show trending */}
      {!query.trim() && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--green)]" />
              <span className="text-sm font-semibold text-white">Trending Tickers</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TRENDING_TICKERS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => router.push(`/ticker/${encodeURIComponent(t.symbol)}`)}
                  className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3 hover:border-[var(--green)]/30 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.symbol}</p>
                    <p className="text-xs text-gray-500">{t.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && query.trim() && (
        <div className="space-y-5">
          {/* Tickers */}
          {showTickers && tickers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                <span className="text-sm font-semibold text-white">Tickers</span>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                {tickers.slice(0, 6).map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => router.push(`/ticker/${encodeURIComponent(r.symbol)}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{r.symbol}</span>
                        <span className="text-[10px] text-gray-600 uppercase">{r.exchange}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{r.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      r.type === "futures" ? "bg-orange-500/10 text-orange-400" :
                      r.type === "crypto" ? "bg-yellow-500/10 text-yellow-400" :
                      r.type === "forex" ? "bg-blue-500/10 text-blue-400" :
                      "bg-[var(--green)]/10 text-[var(--green)]"
                    }`}>{r.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Traders */}
          {showUsers && users.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[var(--green)]" />
                <span className="text-sm font-semibold text-white">Traders</span>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                {users.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/profile/${r.handle}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <SafeAvatar src={r.avatar_url} alt={r.handle} initials={r.handle} className="w-10 h-10 text-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">@{r.handle}</span>
                        {r.verified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                      {r.full_name && r.full_name !== r.handle && (
                        <p className="text-xs text-gray-500 truncate">{r.full_name}</p>
                      )}
                      {r.trading_style && (
                        <span className="text-[10px] text-gray-600">{r.trading_style}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {users.length === 0 && tickers.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">No results for &quot;{query}&quot;</p>
              <p className="text-gray-600 text-sm mt-1">Try a different ticker or trader handle</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
