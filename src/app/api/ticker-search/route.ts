import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return Response.json([]);

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=US&quotesCount=8&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } }
    );
    if (!res.ok) return Response.json([]);
    const data = await res.json();
    const quotes = (data.quotes ?? [])
      .filter((q: { quoteType: string }) => ["EQUITY", "ETF", "FUTURE", "CRYPTOCURRENCY"].includes(q.quoteType))
      .map((q: { symbol: string; shortname?: string; longname?: string; quoteType: string }) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
      }));
    return Response.json(quotes);
  } catch {
    return Response.json([]);
  }
}
