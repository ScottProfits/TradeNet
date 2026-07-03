import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

async function fetchQuotes(symbols: string[]): Promise<Record<string, any>> {
  if (!symbols.length) return {};
  const sym = symbols.join(",");
  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${encodeURIComponent(sym)}`,
    `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${encodeURIComponent(sym)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`,
  ];
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
  };
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const results = data?.quoteResponse?.result ?? [];
      if (!results.length) continue;
      const map: Record<string, any> = {};
      for (const q of results) map[q.symbol] = q;
      return map;
    } catch {
      continue;
    }
  }
  return {};
}

// GET /api/watchlist?handle=xxx
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json([]);

  const { data: profile } = await supabase.from("profiles").select("id").eq("handle", handle).single();
  if (!profile) return NextResponse.json([]);

  const { data: items } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", profile.id)
    .order("added_at", { ascending: false });

  if (!items?.length) return NextResponse.json([]);

  const symbols = items.map((i) => i.symbol);
  const quotes = await fetchQuotes(symbols);

  const enriched = items.map((item) => {
    const q = quotes[item.symbol] ?? {};
    const price = q.regularMarketPrice ?? null;
    const priceWhenAdded = item.price_when_added ?? null;
    const changeSinceAdded = price != null && priceWhenAdded != null
      ? price - priceWhenAdded
      : null;
    const changeSinceAddedPct = price != null && priceWhenAdded != null && priceWhenAdded !== 0
      ? ((price - priceWhenAdded) / priceWhenAdded) * 100
      : null;
    return {
      ...item,
      price,
      change: q.regularMarketChange ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume ?? null,
      priceWhenAdded,
      changeSinceAdded,
      changeSinceAddedPct,
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/watchlist — add a symbol
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, name, asset_type } = await req.json();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  // Fetch current price to store as price_when_added
  const quotes = await fetchQuotes([symbol.toUpperCase()]);
  const price_when_added = quotes[symbol.toUpperCase()]?.regularMarketPrice ?? null;

  const { error } = await supabaseAdmin.from("watchlist").upsert(
    { user_id: userId, symbol: symbol.toUpperCase(), name, asset_type, price_when_added },
    { onConflict: "user_id,symbol", ignoreDuplicates: false }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/watchlist — remove a symbol
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await req.json();
  await supabaseAdmin.from("watchlist").delete().eq("user_id", userId).eq("symbol", symbol.toUpperCase());
  return NextResponse.json({ success: true });
}
