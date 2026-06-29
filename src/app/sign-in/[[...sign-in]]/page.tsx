"use client";
import { SignIn } from "@clerk/nextjs";

function VerifiedCandle({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="14" y="2" width="4" height="6" rx="1" fill="#22c55e" />
      <rect x="10" y="8" width="12" height="16" rx="2" fill="#22c55e" />
      <rect x="14" y="24" width="4" height="6" rx="1" fill="#22c55e" />
      <path d="M6 12h4M22 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const HIGHLIGHTS = [
  { emoji: "🏆", text: "Ranked by real returns, not followers" },
  { emoji: "✅", text: "Verified P&L — no fake screenshots" },
  { emoji: "📈", text: "Live feed of trades happening right now" },
  { emoji: "🤝", text: "Network with traders who match your style" },
  { emoji: "🎯", text: "Earn badges based on your performance" },
  { emoji: "📓", text: "Private journal attached to every trade" },
];

const RECENT = [
  { handle: "scalperking", ticker: "SPY", pnl: 1200, ago: "2m ago" },
  { handle: "markv", ticker: "TSLA", pnl: 2400, ago: "5m ago" },
  { handle: "swingkid", ticker: "AMZN", pnl: 7200, ago: "11m ago" },
  { handle: "tradewithjess", ticker: "NVDA", pnl: 5800, ago: "18m ago" },
  { handle: "daytrader99", ticker: "AAPL", pnl: 3100, ago: "24m ago" },
];

const clerkAppearance = {
  variables: { colorPrimary: "#22c55e", colorBackground: "#111317", colorDanger: "#ef4444" },
  elements: {
    card: { background: "#111317", boxShadow: "none", width: "100%", maxWidth: "100%" },
    headerTitle: { color: "#ffffff" },
    headerSubtitle: { color: "#9ca3af" },
    formFieldLabel: { color: "#d1d5db" },
    formFieldInput: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#f9fafb" },
    formButtonPrimary: { background: "#22c55e", color: "#000000", fontWeight: "700", width: "100%" },
    footerActionLink: { color: "#22c55e" },
    footerActionText: { color: "#6b7280" },
    socialButtonsBlockButton: { background: "#1e2130", border: "1px solid #2a2d3a", color: "#f9fafb" },
    socialButtonsBlockButtonText: { color: "#f9fafb" },
    dividerLine: { background: "#2a2d3a" },
    dividerText: { color: "#6b7280" },
    identityPreviewText: { color: "#f9fafb" },
    identityPreviewEditButton: { color: "#22c55e" },
  },
} as const;

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col lg:flex-row">

      {/* LEFT — desktop only */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 space-y-12">
          <div className="flex items-center gap-2.5">
            <VerifiedCandle className="w-8 h-8" />
            <span className="text-2xl font-black text-white tracking-tight">Ryzr</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
              Welcome<br />
              <span className="text-green-400">back.</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
              Your track record is waiting. Check the leaderboard, post your latest trade, see who&apos;s been copying you.
            </p>
          </div>
          <div className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex items-center gap-3">
                <span className="text-xl w-8 shrink-0">{h.emoji}</span>
                <span className="text-sm text-gray-300">{h.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Recent trades</p>
          </div>
          {RECENT.map((t, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-bold text-green-400 shrink-0">
                {t.handle[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-400 flex-1">@{t.handle}</span>
              <span className="text-xs font-mono text-gray-600">${t.ticker}</span>
              <span className="text-sm font-bold text-green-400">+${t.pnl.toLocaleString()}</span>
              <span className="text-[10px] text-gray-700 w-12 text-right">{t.ago}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-screen px-4 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <VerifiedCandle className="w-7 h-7" />
          <span className="text-2xl font-black text-white">Ryzr</span>
        </div>

        <div className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Sign in to Ryzr</h2>
            <p className="text-gray-500 text-sm mt-1">Your leaderboard rank is waiting.</p>
          </div>

          <SignIn appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  );
}
