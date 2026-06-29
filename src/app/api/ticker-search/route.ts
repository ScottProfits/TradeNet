import { NextRequest } from "next/server";

// Convert Yahoo Finance futures symbol (ES=F) to TradingView continuous contract (ES1!)
function toTVSymbol(symbol: string, type: string): string {
  if (type === "FUTURE" && symbol.endsWith("=F")) return symbol.replace("=F", "1!");
  return symbol;
}

function typeLabel(quoteType: string): string {
  switch (quoteType) {
    case "FUTURE": return "futures";
    case "CRYPTOCURRENCY": return "crypto";
    case "FOREX": return "forex";
    case "ETF": return "etf";
    default: return "stock";
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return Response.json([]);

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=US&quotesCount=10&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
    );
    if (!res.ok) return Response.json([]);
    const data = await res.json();

    const results = (data.quotes ?? [])
      .filter((q: { quoteType: string }) =>
        ["EQUITY", "ETF", "FUTURE", "CRYPTOCURRENCY", "FOREX"].includes(q.quoteType)
      )
      .map((q: { symbol: string; shortname?: string; longname?: string; quoteType: string; exchange?: string }) => ({
        symbol: toTVSymbol(q.symbol, q.quoteType),
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange ?? "",
        type: typeLabel(q.quoteType),
      }));

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
