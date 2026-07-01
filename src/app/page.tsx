import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

function VerifiedCandle({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="14" y="2" width="4" height="6" rx="1" fill="#22c55e" />
      <rect x="10" y="8" width="12" height="16" rx="2" fill="#22c55e" />
      <rect x="14" y="24" width="4" height="6" rx="1" fill="#22c55e" />
      <path d="M6 12h4M22 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  { emoji: "📊", title: "Post Your Trades", desc: "Share ticker, direction, P&L, and charts. Your track record, public and permanent." },
  { emoji: "✅", title: "Verified P&L", desc: "Connect Alpaca to verify real trades. Verified traders earn a badge that can't be faked." },
  { emoji: "🏆", title: "Leaderboard", desc: "Ranked by actual returns. Not followers. Not hype. Real performance, updated live." },
  { emoji: "🤝", title: "Trader Network", desc: "Follow traders who match your style. DM them, copy their setups, debate the market — build real connections with people who actually trade." },
  { emoji: "💬", title: "Market Talk", desc: "Comment on any trade, share your take on a ticker, post market opinions. A live conversation between people with real skin in the game." },
  { emoji: "📈", title: "Live Ticker", desc: "Watch real trades from real traders scroll by in real time. Feel the pulse of the market." },
  { emoji: "🎯", title: "Earned Badges", desc: "Win Streak, Sharpshooter, Whale, Six Figures — badges you earn, not buy." },
  { emoji: "📓", title: "Private Journal", desc: "Attach notes to any trade. Build a private journal only you can see." },
];

const SOCIAL_PROOF = [
  { handle: "markv", style: "Day Trader", quote: "Finally a place where results matter more than follower count. I've connected with traders I actually learn from." },
  { handle: "tradewithjess", style: "Swing Trader", quote: "The DMs and comment threads are where the real alpha is. People sharing setups, calling out bad entries — it's like a trading desk." },
  { handle: "scalperking", style: "Scalper", quote: "Verified P&L changed everything. No more fake gurus flexing screenshots." },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/feed");
  const isLoggedIn = false;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VerifiedCandle className="w-7 h-7" />
            <span className="font-bold text-lg tracking-tight">Ryzr</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/feed" className="px-4 py-1.5 bg-green-500 text-black text-sm font-bold rounded-full hover:bg-green-400 transition-colors">
                Go to Feed
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</Link>
                <Link href="/sign-up" className="px-4 py-1.5 bg-green-500 text-black text-sm font-bold rounded-full hover:bg-green-400 transition-colors">
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live trades happening now
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            The social network<br />
            <span className="text-green-400">built for traders.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
            Post your trades. Build your track record. Get ranked by real returns — not follower count.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isLoggedIn ? (
              <Link href="/feed" className="px-8 py-3.5 bg-green-500 text-black font-bold text-base rounded-full hover:bg-green-400 transition-colors">
                Go to Your Feed →
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="px-8 py-3.5 bg-green-500 text-black font-bold text-base rounded-full hover:bg-green-400 transition-colors w-full sm:w-auto text-center">
                  Start Posting Trades →
                </Link>
                <Link href="/sign-in" className="px-8 py-3.5 border border-white/10 text-white font-medium text-base rounded-full hover:border-white/30 transition-colors w-full sm:w-auto text-center">
                  Sign In
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-gray-600">Free to join. No credit card required.</p>
        </div>
      </section>

      {/* Ticker strip */}
      <div className="border-y border-white/5 bg-white/[0.02] py-3 overflow-hidden">
        <div className="flex gap-8 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          {["@markv +$2,400 TSLA LONG", "@tradewithjess +$880 AAPL LONG", "@scalperking +$1,200 SPY SHORT", "@daytrader99 +$3,100 NVDA LONG", "@wavetrader -$240 META SHORT", "@swingkid +$5,500 AMZN LONG", "@markv +$2,400 TSLA LONG", "@tradewithjess +$880 AAPL LONG", "@scalperking +$1,200 SPY SHORT", "@daytrader99 +$3,100 NVDA LONG"].map((item, i) => (
            <span key={i} className="text-xs text-gray-500 font-mono shrink-0">
              <span className="text-green-400">{item.split(" ")[0]}</span>
              {" "}{item.split(" ").slice(1).join(" ")}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </div>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Everything a trader needs.</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">Built for the community. Not the influencer.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-green-500/20 hover:bg-green-500/[0.03] transition-all">
                <div className="text-2xl mb-3">{f.emoji}</div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto border-t border-white/5" />

      {/* Networking section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/15 rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                  🤝 Built for connection
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                  More than a feed.<br />
                  <span className="text-green-400">A trading community.</span>
                </h2>
                <p className="text-gray-400 leading-relaxed">
                  Follow traders who match your style. Slide into DMs to talk setups. Comment on trades, debate entries, share your market thesis. Ryzr is where traders actually talk to each other — not just post into the void.
                </p>
                <ul className="space-y-3">
                  {[
                    "Follow traders by style — day, swing, scalp, options",
                    "Direct messages with any trader on the platform",
                    "Comment threads on every trade and post",
                    "Copy trades from traders you trust",
                    "Get notified when traders you follow post",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                {[
                  { handle: "markv", msg: "TSLA looking weak at resistance, targeting $180 puts", time: "2m ago" },
                  { handle: "tradewithjess", msg: "Anyone else watching NVDA earnings play? Long into close", time: "8m ago" },
                  { handle: "scalperking", msg: "SPY rejected off VWAP again — classic. Already short.", time: "14m ago" },
                  { handle: "swingkid", msg: "Closed AMZN for +$7,200. Thesis played out perfectly.", time: "21m ago" },
                ].map((m) => (
                  <div key={m.handle} className="flex items-start gap-3 bg-white/[0.04] border border-white/5 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0 mt-0.5">
                      {m.handle[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">@{m.handle}</span>
                        <span className="text-[10px] text-gray-600 shrink-0">{m.time}</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{m.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto border-t border-white/5" />

      {/* Social proof */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Traders are already posting.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SOCIAL_PROOF.map((t) => (
              <div key={t.handle} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <p className="text-sm text-gray-300 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
                    {t.handle[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">@{t.handle}</p>
                    <p className="text-[10px] text-gray-600">{t.style}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <VerifiedCandle className="w-10 h-10 mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your track record starts today.</h2>
          <p className="text-gray-500">Post your first trade. Get on the leaderboard. Build something real.</p>
          {isLoggedIn ? (
            <Link href="/feed" className="inline-block mt-2 px-10 py-4 bg-green-500 text-black font-bold text-base rounded-full hover:bg-green-400 transition-colors">
              Go to Feed →
            </Link>
          ) : (
            <Link href="/sign-up" className="inline-block mt-2 px-10 py-4 bg-green-500 text-black font-bold text-base rounded-full hover:bg-green-400 transition-colors">
              Join Ryzr Free →
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-gray-600">
        <p>© 2026 Ryzr. Built for traders, by traders.</p>
      </footer>
    </div>
  );
}
