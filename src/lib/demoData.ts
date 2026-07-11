// Demo/mock content shown only when ?demo=1 is present in the URL — used for
// taking clean App Store screenshots without needing real seeded data, and
// without ever touching the production database or other users' feeds.

export interface DemoTrade {
  type: "trade";
  id: string;
  user_id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number;
  shares: number;
  pnl: number;
  pnl_percent: number;
  caption: string;
  likes_count: number;
  comments_count: number;
  image_url: string | null;
  strategy: string | null;
  liked_by_me: boolean;
  verified_pnl: boolean;
  journal_note: string | null;
  created_at: string;
  source: string | null;
  profiles: { id: string; handle: string; avatar_url: string; brokerage: string; verified: boolean };
}

export interface DemoPost {
  type: "post";
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  profiles: { id: string; handle: string; avatar_url: string; verified: boolean };
}

function minsAgo(mins: number) {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

export const demoFeedItems: (DemoTrade | DemoPost)[] = [
  {
    type: "trade", id: "demo-1", user_id: "demo-kmscalper",
    ticker: "NVDA", direction: "LONG", entry: 118.4, exit: 125.9, shares: 200,
    pnl: 1240, pnl_percent: 6.2,
    caption: "Nailed the NVDA breakout at open. Waited for the 9:45 candle confirmation then scaled out at +$1,240. Classic momentum setup.",
    likes_count: 84, comments_count: 12, image_url: null, strategy: "Momentum breakout",
    liked_by_me: false, verified_pnl: true, journal_note: null, created_at: minsAgo(4), source: "rithmic",
    profiles: { id: "demo-kmscalper", handle: "kmscalper", avatar_url: "", brokerage: "Rithmic", verified: true },
  },
  {
    type: "trade", id: "demo-2", user_id: "demo-twolfgang",
    ticker: "AAPL", direction: "LONG", entry: 231.1, exit: 240.8, shares: 500,
    pnl: 2870, pnl_percent: 3.8,
    caption: "AAPL reclaimed VWAP after earnings and held through the dip. Textbook VWAP reclaim.",
    likes_count: 132, comments_count: 45, image_url: null, strategy: "VWAP reclaim",
    liked_by_me: true, verified_pnl: true, journal_note: null, created_at: minsAgo(34), source: "rithmic",
    profiles: { id: "demo-twolfgang", handle: "twolfgang", avatar_url: "", brokerage: "Rithmic", verified: true },
  },
  {
    type: "post", id: "demo-3", user_id: "demo-mikefxpro",
    content: "Pre-market watchlist for tomorrow: NQ, TSLA, SPY. Levels loading in the morning post. Stay disciplined out there 🎯",
    image_url: null, likes_count: 58, comments_count: 9, liked_by_me: false, created_at: minsAgo(41),
    profiles: { id: "demo-mikefxpro", handle: "mikefxpro", avatar_url: "", verified: false },
  },
  {
    type: "trade", id: "demo-4", user_id: "demo-mikefxpro",
    ticker: "TSLA", direction: "SHORT", entry: 261.2, exit: 251.7, shares: 100,
    pnl: 940, pnl_percent: 2.2,
    caption: "TSLA failed at the 200 SMA again. Shorted the rejection with a tight stop, covered into support.",
    likes_count: 67, comments_count: 19, image_url: null, strategy: "Reversal",
    liked_by_me: false, verified_pnl: false, journal_note: null, created_at: minsAgo(52), source: null,
    profiles: { id: "demo-mikefxpro", handle: "mikefxpro", avatar_url: "", brokerage: "TradeStation", verified: false },
  },
  {
    type: "trade", id: "demo-5", user_id: "demo-sarahreads",
    ticker: "SPY", direction: "SHORT", entry: 601.5, exit: 613.8, shares: 10,
    pnl: -310, pnl_percent: -2.1,
    caption: "Tough morning on SPY puts — Fed minutes came in hotter than expected. Cutting losses and staying flat.",
    likes_count: 41, comments_count: 27, image_url: null, strategy: null,
    liked_by_me: false, verified_pnl: false, journal_note: null, created_at: minsAgo(78), source: null,
    profiles: { id: "demo-sarahreads", handle: "sarahreads", avatar_url: "", brokerage: "IBKR", verified: false },
  },
];

export const demoLeaderboard = [
  { profile: { id: "demo-twolfgang", handle: "twolfgang", full_name: "T Wolfgang", avatar_url: "", verified: true, brokerage: "Rithmic" }, pnl: 4820, tradeCount: 6, winRate: 83, rankChange: 2 },
  { profile: { id: "demo-kmscalper", handle: "kmscalper", full_name: "KM Scalper", avatar_url: "", verified: true, brokerage: "Rithmic" }, pnl: 3140, tradeCount: 9, winRate: 71, rankChange: -1 },
  { profile: { id: "demo-mikefxpro", handle: "mikefxpro", full_name: "Mike FX Pro", avatar_url: "", verified: false, brokerage: "TradeStation" }, pnl: 2210, tradeCount: 4, winRate: 75, rankChange: 1 },
  { profile: { id: "demo-newtrader99", handle: "newtrader99", full_name: "New Trader 99", avatar_url: "", verified: false, brokerage: "Alpaca" }, pnl: 940, tradeCount: 3, winRate: 67, rankChange: null },
  { profile: { id: "demo-sarahreads", handle: "sarahreads", full_name: "Sarah Reads", avatar_url: "", verified: false, brokerage: "IBKR" }, pnl: -310, tradeCount: 2, winRate: 50, rankChange: -2 },
];

export const demoPartner = { id: "demo-alphawave", handle: "alphawave", avatar_url: "", verified: true };

export const demoMessages = [
  { id: "dm-1", sender_id: "demo-alphawave", receiver_id: "me", content: "Bro that SPY trade 🔥 +$4,280??", created_at: minsAgo(46), sender: { handle: "alphawave", avatar_url: "", verified: true }, liked_by: [] },
  { id: "dm-2", sender_id: "me", receiver_id: "demo-alphawave", content: "Scalped it perfectly at the open 💪", created_at: minsAgo(45), sender: { handle: "you", avatar_url: "", verified: false }, liked_by: [] },
  { id: "dm-3", sender_id: "demo-alphawave", receiver_id: "me", content: "How are you reading levels so well?", created_at: minsAgo(44), sender: { handle: "alphawave", avatar_url: "", verified: true }, liked_by: [] },
  { id: "dm-4", sender_id: "me", receiver_id: "demo-alphawave", content: "VWAP + price action. Takes practice", created_at: minsAgo(43), sender: { handle: "you", avatar_url: "", verified: false }, liked_by: [] },
  { id: "dm-5", sender_id: "demo-alphawave", receiver_id: "me", content: "What time do you start watching?", created_at: minsAgo(41), sender: { handle: "alphawave", avatar_url: "", verified: true }, liked_by: [] },
  { id: "dm-6", sender_id: "me", receiver_id: "demo-alphawave", content: "Pre-market at 8 AM. First 30 min 🎯", created_at: minsAgo(40), sender: { handle: "you", avatar_url: "", verified: false }, liked_by: [] },
  { id: "dm-7", sender_id: "demo-alphawave", receiver_id: "me", content: "Appreciate you bro 🙏 keep posting", created_at: minsAgo(38), sender: { handle: "alphawave", avatar_url: "", verified: true }, liked_by: ["me"] },
  { id: "dm-8", sender_id: "me", receiver_id: "demo-alphawave", content: "Always — got a setup loading now", created_at: minsAgo(37), sender: { handle: "you", avatar_url: "", verified: false }, liked_by: [] },
];

export const demoAutoReplies = [
  "Let's get it 🚀",
  "Sending me the chart when you see it",
  "Following you — don't miss the next one",
  "Appreciate you bro 🙏",
  "That's the move right there 🔥",
];
