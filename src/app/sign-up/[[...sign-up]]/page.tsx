"use client";
import { SignUp } from "@clerk/nextjs";

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

const TRADES = [
  { handle: "markv", ticker: "TSLA", pnl: 2400, dir: "LONG" },
  { handle: "tradewithjess", ticker: "NVDA", pnl: 5800, dir: "LONG" },
  { handle: "scalperking", ticker: "SPY", pnl: 1200, dir: "SHORT" },
  { handle: "daytrader99", ticker: "AAPL", pnl: 3100, dir: "LONG" },
  { handle: "swingkid", ticker: "AMZN", pnl: 7200, dir: "LONG" },
  { handle: "wavetrader", ticker: "META", pnl: 940, dir: "SHORT" },
];

const LEADERBOARD = [
  { rank: 1, handle: "markv", pnl: 48200, win: 84 },
  { rank: 2, handle: "tradewithjess", pnl: 31500, win: 79 },
  { rank: 3, handle: "scalperking", pnl: 27900, win: 72 },
  { rank: 4, handle: "daytrader99", pnl: 19400, win: 68 },
];

const clerkAppearance = {
  variables: {
    colorBackground: "transparent",
    colorInputBackground: "#0f0f0f",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af",
    colorPrimary: "#22c55e",
    colorDanger: "#ef4444",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-none bg-transparent border-0 !p-0",
    headerTitle: "text-white text-xl font-bold",
    headerSubtitle: "text-gray-400 text-sm",
    socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors",
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/10",
    dividerText: "text-gray-600 text-xs",
    formFieldLabel: "text-gray-400 text-xs font-medium uppercase tracking-wide",
    formFieldInput: "bg-[#0f0f0f] border border-white/10 text-white rounded-xl focus:border-green-500",
    formButtonPrimary: "bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors",
    footerActionLink: "text-green-400 hover:text-green-300 font-semibold",
    footerActionText: "text-gray-500",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-green-400",
    formResendCodeLink: "text-green-400",
    otpCodeFieldInput: "bg-[#0f0f0f] border border-white/10 text-white",
    alertText: "text-red-400",
  },
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col lg:flex-row">

      {/* LEFT — social proof panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 overflow-hidden border-r border-white/5">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-green-500/20 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 space-y-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <VerifiedCandle className="w-8 h-8" />
            <span className="text-2xl font-black text-white tracking-tight">Ryzr</span>
          </div>

          {/* Hero copy */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Trades happening right now
            </div>
            <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
              Your P&L.<br />
              <span className="text-green-400">Your rank.</span><br />
              Your proof.
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
              The only trading platform where your results do the talking. Post trades, climb the leaderboard, build a track record that can&apos;t be faked.
            </p>
          </div>

          {/* Live trade feed */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">Live trades</p>
            {TRADES.map((t, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">
                  {t.handle[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-400 flex-1">@{t.handle}</span>
                <span className="text-xs text-gray-600 font-mono">${t.ticker}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                  {t.dir}
                </span>
                <span className="text-sm font-bold text-green-400">+${t.pnl.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom leaderboard */}
        <div className="relative z-10 space-y-3">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Top traders this month</p>
          {LEADERBOARD.map((t) => (
            <div key={t.rank} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-4 font-mono">#{t.rank}</span>
              <div className="flex-1 bg-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-sm text-gray-300 flex-1">@{t.handle}</span>
                <span className="text-xs text-gray-600">{t.win}% win rate</span>
                <span className="text-sm font-bold text-green-400">+${t.pnl.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-4 sm:px-8 py-12 min-h-screen overflow-hidden">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <VerifiedCandle className="w-7 h-7" />
          <span className="text-2xl font-black text-white">Ryzr</span>
        </div>

        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-gray-500 text-sm">Join thousands of traders posting real results.</p>
          </div>

          {/* Social proof numbers */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Traders", value: "2.4K+" },
              { label: "Trades posted", value: "18K+" },
              { label: "Avg win rate", value: "67%" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-400">{s.value}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
            <SignUp appearance={clerkAppearance} />
          </div>
        </div>
      </div>
    </div>
  );
}
