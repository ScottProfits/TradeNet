import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { importTodaysFills } from "@/lib/tradovate/importFills";
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
    const { fills, loginAt, session } = await fetchTradovateFills(
      tradovateUser,
      tradovatePassword,
      "demo",
      accountId
    );

    const { total, imported, skipped } = await importTodaysFills(userId, fills);

    // Store the session (access token, never the username/password) so a
    // scheduled job can keep syncing fills without the user reconnecting
    // every day — see src/app/api/cron/tradovate-sync/route.ts.
    await supabaseAdmin.from("broker_connections").upsert(
      {
        user_id: userId,
        broker: "tradovate",
        connected_at: new Date().toISOString(),
        access_token: session.accessToken,
        token_expiry: session.expirationTime,
        account_id: session.accountId,
        needs_reconnect: false,
      },
      { onConflict: "user_id,broker" }
    );

    return NextResponse.json({
      success: true,
      total,
      imported,
      skipped,
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
    .select("connected_at, needs_reconnect")
    .eq("user_id", userId)
    .eq("broker", "tradovate")
    .single();

  return NextResponse.json({
    connected: !!data,
    connectedAt: data?.connected_at ?? null,
    needsReconnect: data?.needs_reconnect ?? false,
  });
}
