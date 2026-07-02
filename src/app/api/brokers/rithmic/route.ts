import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const RITHMIC_URI = "wss://rituz00100.rithmic.com:443";
const RITHMIC_SYSTEM = "Rithmic Test";

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
    const fills = await fetchRithmicFills(
      rithmicUser,
      rithmicPassword,
      RITHMIC_SYSTEM,
      RITHMIC_URI,
      accountId
    );

    // Upsert fills as trades into Supabase
    let imported = 0;
    for (const fill of fills) {
      const isBuy = fill.transactionType?.toUpperCase().includes("BUY");
      const { error } = await supabase.from("trades").upsert(
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
          trade_date: fill.fillDate || new Date().toISOString().split("T")[0],
          source: "rithmic",
          external_id: fill.fillId,
        },
        { onConflict: "external_id", ignoreDuplicates: true }
      );
      if (!error) imported++;
    }

    // Store that this user has connected Rithmic
    await supabase
      .from("broker_connections")
      .upsert({ user_id: userId, broker: "rithmic", connected_at: new Date().toISOString() }, { onConflict: "user_id,broker" });

    return NextResponse.json({ success: true, total: fills.length, imported });
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
