import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return Response.json([]);

  try {
    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(q)}&hl=1&exchange=&lang=en&domain=production&type=`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.tradingview.com/" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return Response.json([]);
    const data = await res.json();

    const results = (data.symbols ?? []).slice(0, 10).map((s: {
      symbol: string;
      full_name: string;
      description: string;
      exchange: string;
      type: string;
    }) => ({
      symbol: s.symbol,
      fullName: s.full_name,
      name: s.description,
      exchange: s.exchange,
      type: s.type,
    }));

    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
