import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// Tradovate's auth + account-list + fill-list + per-contract lookups are
// several sequential round trips — give it more room than the default
// function timeout so a slow round trip doesn't get killed mid-flight.
export const maxDuration = 60;

// POST /api/brokers/tradovate — connect & import fills
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tradovateUser, tradovatePassword, accountId } = body;

  if (!tradovateUser || !tradovatePassword) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const { fetchTradovateFills } = await import("@/lib/tradovate/client");
    // No sandbox is offered for Tradovate — Tradovate's own guidance is to
    // develop/test against the Demo environment (simulated trading, real
    // market data) until this integration is validated for live accounts.
    const { fills, userId: tradovateUserId, loginAt } = await fetchTradovateFills(
      tradovateUser,
      tradovatePassword,
      "demo",
      accountId
    );

    // Only import fills from today (ET timezone) — matches the same
    // same-day-only import behavior used for Rithmic.
    const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
    const todayFills = fills.filter((fill) => fill.fillDate === todayET);

    // Upsert today's fills as trades into Supabase
    let imported = 0;
    for (const fill of todayFills) {
      const isBuy = fill.transactionType === "Buy";
      const { error } = await supabaseAdmin.from("trades").upsert(
        {
          user_id: userId,
          ticker: fill.symbol,
          asset_type: "futures",
          direction: isBuy ? "long" : "short",
          entry_price: fill.fillPrice,
          exit_price: fill.fillPrice,
          pnl: 0,
          quantity: fill.fillSize,
          strategy: "Tradovate Import",
          notes: `Fill ID: ${fill.fillId} | Exchange: ${fill.exchange}`,
          trade_date: todayET,
          source: "tradovate",
          external_id: fill.fillId,
          is_public: true,
        },
        { onConflict: "external_id", ignoreDuplicates: true }
      );
      if (!error) imported++;
    }

    // Store that this user has connected Tradovate
    await supabaseAdmin
      .from("broker_connections")
      .upsert({ user_id: userId, broker: "tradovate", connected_at: new Date().toISOString() }, { onConflict: "user_id,broker" });

    return NextResponse.json({
      success: true,
      total: todayFills.length,
      imported,
      skipped: fills.length - todayFills.length,
      tradovateUserId,
      loginAt,
      loginTimezone: "UTC",
    });
  } catch (err: unknown) {
    console.error("Tradovate error:", err);
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/brokers/tradovate — check connection status
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ connected: false });

  const { data } = await supabase
    .from("broker_connections")
    .select("connected_at")
    .eq("user_id", userId)
    .eq("broker", "tradovate")
    .single();

  return NextResponse.json({ connected: !!data, connectedAt: data?.connected_at ?? null });
}
