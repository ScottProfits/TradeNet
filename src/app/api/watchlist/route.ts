import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/watchlist?handle=xxx — fetch a user's watchlist with live prices
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

  // Fetch live quotes from Yahoo Finance
  const symbols = items.map((i) => i.symbol).join(",");
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=5m`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 30 } }
    );
    const quoteRes = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 30 } }
    );

    const quoteData = quoteRes.ok ? await quoteRes.json() : null;
    const quotes: Record<string, any> = {};
    for (const q of quoteData?.quoteResponse?.result ?? []) {
      quotes[q.symbol] = q;
    }

    const enriched = items.map((item) => {
      const q = quotes[item.symbol] ?? {};
      return {
        ...item,
        price: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        changePct: q.regularMarketChangePercent ?? null,
        volume: q.regularMarketVolume ?? null,
        high: q.regularMarketDayHigh ?? null,
        low: q.regularMarketDayLow ?? null,
        marketCap: q.marketCap ?? null,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json(items);
  }
}

// POST /api/watchlist — add a symbol
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, name, asset_type } = await req.json();
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const { error } = await supabaseAdmin.from("watchlist").upsert(
    { user_id: userId, symbol: symbol.toUpperCase(), name, asset_type },
    { onConflict: "user_id,symbol", ignoreDuplicates: true }
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
