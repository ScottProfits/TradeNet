import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const RITHMIC_URI = "wss://rituz00100.rithmic.com:443";
const RITHMIC_SYSTEM = "Rithmic Test";

// The Rithmic handshake is several sequential round trips (system info,
// login, account list, fill history) — give it more room than the default
// function timeout so a slow round trip doesn't get killed mid-flight.
export const maxDuration = 60;

// POST /api/brokers/rithmic — connect & import fills
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rithmicUser, rithmicPassword, accountId } = body;

  if (!rithmicUser || !rithmicPassword) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const { fetchRithmicFills } = await import("@/lib/rithmic/client");
    // Only today's fills are ever imported below, so we only ever need a couple
    // days of history — well under Rithmic's 30-day-per-request cap.
    const startEpoch = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const { fills, uniqueUserId, loginAt } = await fetchRithmicFills(
      rithmicUser,
      rithmicPassword,
      RITHMIC_SYSTEM,
      RITHMIC_URI,
      accountId,
      startEpoch
    );

    // Only import fills from today (ET timezone)
    const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD

    const todayFills = fills.filter((fill) => {
      if (!fill.fillDate) return false;
      // Rithmic fillDate format: YYYYMMDD — convert to YYYY-MM-DD
      const d = fill.fillDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      return d === todayET;
    });

    // Upsert today's fills as trades into Supabase
    let imported = 0;
    for (const fill of todayFills) {
      const isBuy = fill.transactionType?.toUpperCase().includes("BUY");
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
          strategy: "Rithmic Import",
          notes: `Fill ID: ${fill.fillId} | Exchange: ${fill.exchange}`,
          trade_date: todayET,
          source: "rithmic",
          external_id: fill.fillId,
          is_public: true,
        },
        { onConflict: "external_id", ignoreDuplicates: true }
      );
      if (!error) imported++;
    }

    // Store that this user has connected Rithmic
    await supabaseAdmin
      .from("broker_connections")
      .upsert({ user_id: userId, broker: "rithmic", connected_at: new Date().toISOString() }, { onConflict: "user_id,broker" });

    return NextResponse.json({
      success: true,
      total: todayFills.length,
      imported,
      skipped: fills.length - todayFills.length,
      uniqueUserId,
      loginAt,
      loginTimezone: "UTC",
    });
  } catch (err: any) {
    console.error("Rithmic error:", err);
    return NextResponse.json({ error: err.message ?? "Connection failed" }, { status: 500 });
  }
}

// GET /api/brokers/rithmic — check connection status
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ connected: false });

  const { data } = await supabase
    .from("broker_connections")
    .select("connected_at")
    .eq("user_id", userId)
    .eq("broker", "rithmic")
    .single();

  return NextResponse.json({ connected: !!data, connectedAt: data?.connected_at ?? null });
}
