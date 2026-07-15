import { supabaseAdmin } from "@/lib/supabase-admin";
import { TradovateFill } from "./client";

// Shared by both the manual Connect flow and the scheduled sync job so the
// upsert logic (and today-only filtering) never drifts between the two.
export async function importTodaysFills(userId: string, fills: TradovateFill[]) {
  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
  const todayFills = fills.filter((fill) => fill.fillDate === todayET);

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

  return { total: todayFills.length, imported, skipped: fills.length - todayFills.length };
}
