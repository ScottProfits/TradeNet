import { NextRequest } from "next/server";

// ── Economic calendar (hardcoded known dates) ──────────────────────────────
const CALENDAR: { date: string; label: string; type: "fomc" | "cpi" | "nfp" | "ppi" | "event"; impact: "high" | "medium"; detail?: string }[] = [
  // FOMC 2026
  { date: "2026-07-28", label: "FOMC Meeting", type: "fomc", impact: "high", detail: "Fed rate decision — Day 1" },
  { date: "2026-07-29", label: "FOMC Rate Decision", type: "fomc", impact: "high", detail: "Fed announces rate decision 2:00 PM ET" },
  { date: "2026-09-15", label: "FOMC Meeting", type: "fomc", impact: "high", detail: "Fed rate decision — Day 1" },
  { date: "2026-09-16", label: "FOMC Rate Decision", type: "fomc", impact: "high", detail: "Fed announces rate decision 2:00 PM ET" },
  { date: "2026-10-27", label: "FOMC Meeting", type: "fomc", impact: "high", detail: "Fed rate decision — Day 1" },
  { date: "2026-10-28", label: "FOMC Rate Decision", type: "fomc", impact: "high", detail: "Fed announces rate decision 2:00 PM ET" },
  { date: "2026-12-08", label: "FOMC Meeting", type: "fomc", impact: "high", detail: "Fed rate decision — Day 1" },
  { date: "2026-12-09", label: "FOMC Rate Decision", type: "fomc", impact: "high", detail: "Fed announces rate decision 2:00 PM ET" },
  // CPI 2026
  { date: "2026-07-15", label: "CPI Report", type: "cpi", impact: "high", detail: "June CPI — inflation data 8:30 AM ET" },
  { date: "2026-08-12", label: "CPI Report", type: "cpi", impact: "high", detail: "July CPI — inflation data 8:30 AM ET" },
  { date: "2026-09-11", label: "CPI Report", type: "cpi", impact: "high", detail: "August CPI — inflation data 8:30 AM ET" },
  { date: "2026-10-14", label: "CPI Report", type: "cpi", impact: "high", detail: "September CPI — inflation data 8:30 AM ET" },
  { date: "2026-11-13", label: "CPI Report", type: "cpi", impact: "high", detail: "October CPI — inflation data 8:30 AM ET" },
  { date: "2026-12-11", label: "CPI Report", type: "cpi", impact: "high", detail: "November CPI — inflation data 8:30 AM ET" },
  // NFP (Jobs Report) 2026
  { date: "2026-07-02", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "June non-farm payrolls 8:30 AM ET" },
  { date: "2026-08-07", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "July non-farm payrolls 8:30 AM ET" },
  { date: "2026-09-04", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "August non-farm payrolls 8:30 AM ET" },
  { date: "2026-10-02", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "September non-farm payrolls 8:30 AM ET" },
  { date: "2026-11-06", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "October non-farm payrolls 8:30 AM ET" },
  { date: "2026-12-04", label: "Jobs Report (NFP)", type: "nfp", impact: "high", detail: "November non-farm payrolls 8:30 AM ET" },
  // PPI 2026
  { date: "2026-07-14", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
  { date: "2026-08-11", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
  { date: "2026-09-10", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
  { date: "2026-10-13", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
  { date: "2026-11-12", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
  { date: "2026-12-10", label: "PPI Report", type: "ppi", impact: "medium", detail: "Producer Price Index 8:30 AM ET" },
];

// ── Market hours helpers ──────────────────────────────────────────────────
function getMinutesInTZ(tz: string) {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  return { day: local.getDay(), total: local.getHours() * 60 + local.getMinutes() };
}

function getMarketStatus() {
  const now = new Date();

  // New York (NYSE/NASDAQ): Mon-Fri 9:30–16:00 ET, pre-market 4:00–9:30
  const et = getMinutesInTZ("America/New_York");
  const nyOpen = 9 * 60 + 30;
  const nyClose = 16 * 60;
  const nyWeekday = et.day >= 1 && et.day <= 5;
  const isNYOpen = nyWeekday && et.total >= nyOpen && et.total < nyClose;
  const isPremarket = nyWeekday && et.total >= 4 * 60 && et.total < nyOpen;
  const isAfterHours = nyWeekday && et.total >= nyClose && et.total < 20 * 60;

  // London (LSE): Mon-Fri 8:00–16:30 GMT
  const gmt = getMinutesInTZ("Europe/London");
  const lonOpen = 8 * 60;
  const lonClose = 16 * 60 + 30;
  const isLondonOpen = gmt.day >= 1 && gmt.day <= 5 && gmt.total >= lonOpen && gmt.total < lonClose;

  // Tokyo (TSE): Mon-Fri 9:00–15:30 JST (with lunch 11:30–12:30)
  const jst = getMinutesInTZ("Asia/Tokyo");
  const tkOpen = 9 * 60;
  const tkClose = 15 * 60 + 30;
  const tkLunchStart = 11 * 60 + 30;
  const tkLunchEnd = 12 * 60 + 30;
  const isTokyoOpen = jst.day >= 1 && jst.day <= 5 &&
    jst.total >= tkOpen && jst.total < tkClose &&
    !(jst.total >= tkLunchStart && jst.total < tkLunchEnd);

  // Countdown for NY
  let minutesUntilOpen = 0;
  let minutesUntilClose = 0;
  if (isNYOpen) {
    minutesUntilClose = nyClose - et.total;
  } else if (nyWeekday && et.total < nyOpen) {
    // Same weekday, before open (e.g. 3 AM ET — market opens later today)
    minutesUntilOpen = nyOpen - et.total;
  } else {
    // Past close, or weekend — find next trading day
    let daysUntilOpen = 0;
    let nextDay = et.day;
    do { daysUntilOpen++; nextDay = (nextDay + 1) % 7; } while (nextDay === 0 || nextDay === 6);
    minutesUntilOpen = daysUntilOpen * 24 * 60 - et.total + nyOpen;
  }

  // Which markets are open right now
  const openMarkets: string[] = [];
  if (isTokyoOpen) openMarkets.push("Tokyo");
  if (isLondonOpen) openMarkets.push("London");
  if (isNYOpen) openMarkets.push("New York");

  return {
    isOpen: isNYOpen,
    isPremarket,
    isAfterHours,
    minutesUntilOpen,
    minutesUntilClose,
    openMarkets,
    isLondonOpen,
    isTokyoOpen,
    nyTime: new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    lonTime: new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" })).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    tokyoTime: new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "all";

  // ── Market status ────────────────────────────────────────────────────────
  const marketStatus = getMarketStatus();

  // ── Upcoming events (next 14 days) ───────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today);
  in14.setDate(in14.getDate() + 14);

  const upcomingEvents = CALENDAR
    .filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d >= today && d <= in14;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayStr = today.toISOString().split("T")[0];
  const todayEvents = CALENDAR.filter((e) => e.date === todayStr);

  if (type === "calendar") {
    return Response.json({ upcomingEvents, todayEvents, marketStatus });
  }

  // ── Trending tickers (Yahoo Finance) ─────────────────────────────────────
  let trending: { symbol: string; name: string; change: number; price: number }[] = [];
  try {
    const tRes = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/trending/US?count=10",
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (tRes.ok) {
      const tData = await tRes.json();
      const symbols: string[] = (tData.finance?.result?.[0]?.quotes ?? [])
        .slice(0, 8)
        .map((q: { symbol: string }) => q.symbol);

      if (symbols.length > 0) {
        const qRes = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}&fields=shortName,regularMarketPrice,regularMarketChangePercent`,
          { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
        );
        if (qRes.ok) {
          const qData = await qRes.json();
          trending = (qData.quoteResponse?.result ?? []).map((q: {
            symbol: string; shortName?: string;
            regularMarketPrice?: number; regularMarketChangePercent?: number;
          }) => ({
            symbol: q.symbol,
            name: q.shortName ?? q.symbol,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChangePercent ?? 0,
          }));
        }
      }
    }
  } catch { /* ignore */ }

  // ── Market news (Yahoo Finance) ───────────────────────────────────────────
  let news: { title: string; source: string; url: string; published: string }[] = [];
  try {
    const nRes = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/search?q=market+news+stocks&lang=en-US&region=US&quotesCount=0&newsCount=8",
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (nRes.ok) {
      const nData = await nRes.json();
      news = (nData.news ?? []).slice(0, 6).map((n: {
        title: string; publisher?: string; link?: string; providerPublishTime?: number;
      }) => ({
        title: n.title,
        source: n.publisher ?? "Yahoo Finance",
        url: n.link ?? "",
        published: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : new Date().toISOString(),
      }));
    }
  } catch { /* ignore */ }

  return Response.json({ marketStatus, upcomingEvents, todayEvents, trending, news });
}
