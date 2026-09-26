"use client";
import { SignUp } from "@clerk/nextjs";
import FinancialDisclosures from "@/components/ui/FinancialDisclosures";

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

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
    <div className="flex flex-col lg:flex-row">

      {/* LEFT — social proof panel, desktop only */}
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
              Your P&L.<br />
              <span className="text-green-400">Your rank.</span><br />
              Your proof.
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
              The only trading platform where your results do the talking. Post trades, climb the leaderboard, build a track record that can&apos;t be faked.
            </p>
          </div>
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
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">Join thousands of traders posting real results.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Traders", value: "2.4K+" },
              { label: "Trades posted", value: "18K+" },
              { label: "Avg win rate", value: "67%" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.04] border border-white/8 rounded-xl p-3 text-center">
                <p className="text-base font-bold text-green-400">{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <SignUp forceRedirectUrl="/onboarding" />
          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline text-gray-400">Terms of Service</a> (including our zero-tolerance policy for
            objectionable content and abusive users) and{" "}
            <a href="/privacy" className="underline text-gray-400">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>

      <FinancialDisclosures />
    </div>
  );
}
