import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import FinancialDisclosures from "@/components/ui/FinancialDisclosures";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  { emoji: "✅", title: "Verified P&L", desc: "Connect your broker (Rithmic or Tradovate) and real fills post with a verified P&L badge that can't be faked." },
  { emoji: "🏆", title: "Leaderboard", desc: "Ranked by actual returns. Not followers. Not hype. Real performance, updated live." },
  { emoji: "🤝", title: "Trader Network", desc: "Follow traders who match your style. DM them, discuss their setups, debate the market — build real connections with people who actually trade." },
  { emoji: "💬", title: "Market Talk", desc: "Comment on any trade, share your take on a ticker, post market opinions. A live conversation between people with real skin in the game." },
  { emoji: "📈", title: "Live Ticker", desc: "Watch real trades from real traders scroll by in real time. Feel the pulse of the market." },
  { emoji: "🎯", title: "Earned Badges", desc: "Win Streak, Sharpshooter, Whale, Six Figures — badges you earn, not buy." },
  { emoji: "📓", title: "Private Journal", desc: "Attach notes to any trade. Build a private journal only you can see." },
];

type LandingTrade = { id: string; ticker: string; direction: string; pnl: number; created_at: string; handle: string };
type LandingPost = { id: string; content: string; created_at: string; handle: string };
type LandingChannel = { id: string; name: string; slug: string; description: string | null; avatar_url: string | null; price_cents: number | null; member_count: number };

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const money = (n: number) => `${n >= 0 ? "+" : "-"}$${Math.abs(Math.round(n)).toLocaleString()}`;

// Clearly-labeled samples used ONLY to fill gaps beside real content, so the
// page isn't empty while the community is small. Every one is tagged "Example"
// in the UI and none uses a real-looking username.
const EXAMPLE_TRADES = [
  { ticker: "NQ", direction: "LONG", pnl: 840 },
  { ticker: "ES", direction: "SHORT", pnl: -210 },
  { ticker: "TSLA", direction: "LONG", pnl: 1250 },
];
const EXAMPLE_POSTS = [
  "Held through the open and took profit at the prior day high. Recaps like this are what you'll see in the feed.",
  "Watching 29,650 as support into the close — thoughts? Comment on any trade or post to start a conversation.",
];
const EXAMPLE_CHANNELS = [
  { name: "Morning Futures Room", description: "Live chat and daily recaps around the open.", price: "Free" },
  { name: "Swing Trade Ideas", description: "Weekly setups and watchlists from the channel owner.", price: "$15/mo" },
  { name: "Options Flow Talk", description: "Discuss unusual activity and post your entries.", price: "Free" },
];
function ExampleTag() {
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 rounded px-1.5 py-0.5">
      Example
    </span>
  );
}

// Real, public activity for the logged-out page — never fabricated. Any
// failure just hides the section that needed the data.
async function getLandingData() {
  const empty = { trades: [] as LandingTrade[], posts: [] as LandingPost[], channels: [] as LandingChannel[], traders: 0, tradeCount: 0 };
  try {
    const [{ data: tradeRows }, { data: postRows }, tradersRes, tradesRes, { data: channelRows }] = await Promise.all([
      supabase
        .from("trades")
        .select("id, ticker, direction, pnl, created_at, profiles!trades_user_id_fkey(handle)")
        .neq("is_public", false)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("posts")
        .select("id, content, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("trades").select("id", { count: "exact", head: true }),
      // Public channels only (unlisted ones stay unlisted).
      supabaseAdmin
        .from("rooms")
        .select("id, name, slug, description, avatar_url, price_cents, member_count")
        .eq("visibility", "public")
        .order("member_count", { ascending: false })
        .limit(6),
    ]);

    const trades: LandingTrade[] = (tradeRows ?? [])
      .map((t) => {
        const prof = t.profiles as unknown as { handle: string } | { handle: string }[] | null;
        const handle = Array.isArray(prof) ? prof[0]?.handle : prof?.handle;
        return handle ? { id: t.id, ticker: t.ticker, direction: t.direction, pnl: t.pnl ?? 0, created_at: t.created_at, handle } : null;
      })
      .filter((t): t is LandingTrade => !!t);

    const withText = (postRows ?? []).filter((p) => (p.content ?? "").trim().length > 0).slice(0, 4);
    let posts: LandingPost[] = [];
    if (withText.length) {
      const ids = [...new Set(withText.map((p) => p.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, handle").in("id", ids);
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p.handle]));
      posts = withText
        .filter((p) => map[p.user_id])
        .map((p) => ({ id: p.id, content: p.content.trim(), created_at: p.created_at, handle: map[p.user_id] }));
    }
    return { trades, posts, channels: (channelRows ?? []) as LandingChannel[], traders: tradersRes.count ?? 0, tradeCount: tradesRes.count ?? 0 };
  } catch {
    return empty;
  }
}

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/feed");
  const isLoggedIn = false;
  const { trades, posts, channels, traders, tradeCount } = await getLandingData();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5" style={{ paddingTop: "env(safe-area-inset-top)" }}>
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
          {trades.length > 0 && (
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live trades happening now
            </div>
          )}
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

      {/* Ticker strip — real recent public trades */}
      {trades.length > 0 && (
        <div className="border-y border-white/5 bg-white/[0.02] py-3 overflow-hidden">
          <div className="flex gap-8 animate-[marquee_30s_linear_infinite] whitespace-nowrap w-max">
            {[...trades, ...trades].map((t, i) => (
              <span key={`${t.id}-${i}`} className="text-xs text-gray-500 font-mono shrink-0">
                <span className="text-green-400">@{t.handle}</span>{" "}
                <span className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>{money(t.pnl)}</span>{" "}
                {t.ticker} {t.direction}
              </span>
            ))}
          </div>
          <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
        </div>
      )}

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

      {/* Channels — real public channels */}
      {true && (
        <>
          <section className="py-20 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Join a trading channel.</h2>
              <p className="text-gray-500 text-center mb-12 text-sm">
                Live chat, topics and daily recaps run by traders — free or members-only.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((c) => {
                  const paid = !!c.price_cents && c.price_cents > 0;
                  return (
                    <Link
                      key={c.id}
                      href={`/rooms/${c.slug}`}
                      className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-green-500/30 hover:bg-green-500/[0.03] transition-all"
                    >
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center text-lg font-bold text-green-400 shrink-0">
                          {c.name[0]?.toUpperCase() ?? "#"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{c.name}</p>
                        {c.description && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>}
                        <div className="flex items-center gap-2 mt-2 text-[11px]">
                          <span className="text-gray-500">{c.member_count.toLocaleString()} member{c.member_count === 1 ? "" : "s"}</span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded-full ${paid ? "bg-green-500/15 text-green-400" : "bg-white/[0.06] text-gray-400"}`}>
                            {paid ? `$${(c.price_cents! / 100).toFixed(c.price_cents! % 100 === 0 ? 0 : 2)}/mo` : "Free"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {EXAMPLE_CHANNELS.slice(0, Math.max(0, 3 - channels.length)).map((c) => (
                  <div key={c.name} className="flex items-start gap-3 bg-white/[0.02] border border-dashed border-white/15 rounded-2xl p-5">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg font-bold text-gray-400 shrink-0">#</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-300 truncate">{c.name}</p>
                        <ExampleTag />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>
                      <p className="text-[11px] text-gray-600 mt-2">Sample channel · {c.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-gray-600 mt-6">
                Cards marked <span className="text-yellow-400">Example</span> are samples showing how Ryzr looks — not real users, trades or channels.
              </p>
            </div>
          </section>

          <div className="max-w-5xl mx-auto border-t border-white/5" />
        </>
      )}

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
                    "Discuss setups with traders you trust",
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
                {posts.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-start gap-3 bg-white/[0.04] border border-white/5 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0 mt-0.5">
                      {p.handle[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">@{p.handle}</span>
                        <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(p.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed break-words">
                        {p.content.length > 140 ? `${p.content.slice(0, 140)}…` : p.content}
                      </p>
                    </div>
                  </div>
                ))}
                {EXAMPLE_POSTS.slice(0, Math.max(0, 3 - posts.length)).map((text) => (
                  <div key={text} className="flex items-start gap-3 bg-white/[0.02] border border-dashed border-white/15 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 mt-0.5">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-300">Example post</span>
                        <ExampleTag />
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto border-t border-white/5" />

      {/* Social proof — real numbers + real recent trades, topped up with labeled examples */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Traders are already posting.</h2>
          {(traders > 0 || tradeCount > 0) && (
            <p className="text-center text-sm text-gray-500 mb-12">
              {traders > 0 && <>{traders.toLocaleString()} trader{traders === 1 ? "" : "s"}</>}
              {traders > 0 && tradeCount > 0 && " · "}
              {tradeCount > 0 && <>{tradeCount.toLocaleString()} trade{tradeCount === 1 ? "" : "s"} posted</>}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {trades.slice(0, 3).map((t) => (
              <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">${t.ticker}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t.direction}</span>
                </div>
                <p className={`text-2xl font-extrabold mb-4 ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{money(t.pnl)}</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
                    {t.handle[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">@{t.handle}</p>
                    <p className="text-[10px] text-gray-600">{timeAgo(t.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            {EXAMPLE_TRADES.slice(0, Math.max(0, 3 - trades.length)).map((t) => (
              <div key={`ex-${t.ticker}`} className="bg-white/[0.02] border border-dashed border-white/15 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">${t.ticker}</span>
                  <ExampleTag />
                </div>
                <p className={`text-2xl font-extrabold mb-4 ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{money(t.pnl)}</p>
                <div>
                  <p className="text-xs font-semibold text-gray-300">Example trade</p>
                  <p className="text-[10px] text-gray-600">Sample card — not a real user or trade</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto border-t border-white/5" />

      {/* Recommended trading platform / market data partners */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/15 rounded-3xl p-8 sm:p-12 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="inline-block bg-white rounded-xl px-5 py-4">
                  <Image src="/partners/ninjatrader-logo.png" alt="NinjaTrader" width={792} height={100} className="h-6 w-auto" />
                </div>
                <h3 className="text-xl font-bold text-white">Our Recommended Trading Platform</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  NinjaTrader® is our #1 recommended trading software platform, preferred by traders worldwide including our own team. Download NinjaTrader and get immediate free access to real-time futures data, advanced charting, a trade simulator, and strategy development &amp; backtesting — used by over 500,000 traders for advanced market analysis and fast order execution.
                </p>
                <a
                  href="https://ninjatraderus.pxf.io/QYGaez"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Get Started for Free →
                </a>
              </div>

              <div className="space-y-4">
                <div className="inline-block bg-white rounded-xl px-5 py-4">
                  <Image src="/partners/kinetick-logo.png" alt="Kinetick" width={400} height={100} className="h-10 w-auto" />
                </div>
                <h3 className="text-xl font-bold text-white">Our Recommended Market Data Feed</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Kinetick® delivers reliable, fast, and cost-effective market data to help level the playing field for active traders — unfiltered, real-time quotes for stocks, futures, and forex. Get started with free end-of-day historical market data directly through the NinjaTrader platform.
                </p>
                <a
                  href="http://kinetick.com/NinjaTrader"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-block text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Get Started with Free EOD Data →
                </a>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 leading-relaxed border-t border-white/5 pt-6">
              NinjaTrader® is a registered trademark of NinjaTrader Group, LLC. No NinjaTrader company has any affiliation with the owner, developer, or provider of the products or services described herein, or any interest, ownership or otherwise, in any such product or service, or endorses, recommends or approves any such product or service.
            </p>
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
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-gray-600 space-y-2">
        <p>© 2026 Ryzr. Built for traders, by traders.</p>
        <p>
          Not financial advice — see our <Link href="/terms" className="underline hover:text-gray-400">Terms</Link>.
        </p>
      </footer>
      <FinancialDisclosures />
    </div>
  );
}
