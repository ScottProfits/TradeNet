export interface Trader {
  id: string;
  handle: string;
  displayName: string;
  initials: string;
  color: string;
  brokerage: string;
  verified: boolean;
  followers: number;
  following: number;
  winRate: number;
  pnlMonth: number;
  categories: string[];
}

export interface Trade {
  id: string;
  traderId: string;
  ticker: string;
  direction: "Long" | "Short";
  shares: number;
  time: string;
  createdAt?: string;
  source?: string | null;
  pnl: number;
  pnlPct: number;
  notes: string;
  likes: number;
  comments: number;
}

export interface Strategy {
  id: string;
  name: string;
  tag: "Hot" | "Cold" | "Rising";
  winRate: number;
  traders: number;
}
