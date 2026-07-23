"use client";
import { useState } from "react";
import { X, Zap, CheckCircle, AlertCircle, Loader2, Copy } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess?: (imported: number) => void;
}

export default function TradovateConnectModal({ onClose, onSuccess }: Props) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleConnect() {
    if (!user || !password) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/brokers/tradovate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradovateUser: user, tradovatePassword: password, accountId: accountId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Connection failed");
      } else {
        setStatus("success");
        setMessage(
          data.imported > 0
            ? `Connected! Imported ${data.imported} trade${data.imported !== 1 ? "s" : ""} from today.`
            : `Connected! No trades from today yet. Check back after you trade.`
        );
        onSuccess?.(data.imported);
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{
          background: "rgba(10,10,10,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.25)" }}
          >
            <Zap className="w-5 h-5 text-[#00C896]" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Connect Tradovate</p>
            <p className="text-[11px] text-gray-500">Import your trade fills automatically</p>
          </div>
        </div>

        {status === "success" ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-[#00C896] mx-auto mb-3" />
            <p className="text-white font-semibold text-sm mb-1">Connected!</p>
            <p className="text-gray-400 text-xs">{message}</p>

            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.15em] transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(0,200,150,0.25) 0%, rgba(0,168,126,0.15) 100%)",
                border: "1px solid rgba(0,200,150,0.35)",
                color: "#00C896",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1 block">
                Tradovate Username
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="your_username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00C896]/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00C896]/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1 block">
                Account ID <span className="text-gray-600 normal-case tracking-normal">(optional — auto-detected)</span>
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="e.g. 12345"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00C896]/40 transition-colors"
              />
            </div>

            {status === "error" && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="select-text flex-1 break-words">{message}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(message)}
                  className="text-red-400/70 hover:text-red-300 transition-colors shrink-0"
                  aria-label="Copy error message"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!user || !password || status === "loading"}
              className="w-full py-3 rounded-xl transition-all duration-300 disabled:opacity-40 mt-1"
              style={{
                background: "linear-gradient(135deg, rgba(0,200,150,0.25) 0%, rgba(0,168,126,0.15) 100%)",
                boxShadow: "0 0 24px rgba(0,200,150,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "1px solid rgba(0,200,150,0.35)",
              }}
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00C896]" />
                  <span className="text-[11px] tracking-[0.15em] font-semibold uppercase text-[#00C896]">
                    Connecting...
                  </span>
                </span>
              ) : (
                <span className="text-[11px] tracking-[0.18em] font-semibold uppercase" style={{ color: "#00C896", textShadow: "0 0 12px rgba(0,200,150,0.6)" }}>
                  Connect & Import
                </span>
              )}
            </button>

            <p className="text-[10px] text-gray-600 text-center pt-1">
              Your credentials are used only to fetch fills and are never stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
