import { supabaseAdmin } from "@/lib/supabase-admin";
import { renewTradovateToken, fetchTradovateFillsWithSession } from "@/lib/tradovate/client";
import { importTodaysFills } from "@/lib/tradovate/importFills";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// GET /api/cron/tradovate-sync — re-syncs today's fills for every user with
// a Tradovate connection, renewing their stored access token as needed, so
// nobody has to manually reconnect every day. Triggered by Vercel Cron
// (see vercel.json) and gated by CRON_SECRET so it can't be hit publicly.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: connections } = await supabaseAdmin
    .from("broker_connections")
    .select("user_id, access_token, token_expiry, account_id")
    .eq("broker", "tradovate")
    .eq("needs_reconnect", false);

  const results: Array<{ userId: string; status: string; imported?: number }> = [];

  for (const conn of connections ?? []) {
    if (!conn.access_token || !conn.account_id) {
      results.push({ userId: conn.user_id, status: "skipped-no-session" });
      continue;
    }

    try {
      let token = conn.access_token as string;

      // Renew if the token is already expired or expiring within the hour —
      // renewing early avoids a mid-request expiry.
      const expiresAt = conn.token_expiry ? new Date(conn.token_expiry).getTime() : 0;
      const needsRenewal = expiresAt < Date.now() + 60 * 60 * 1000;

      if (needsRenewal) {
        const renewed = await renewTradovateToken(token, "live");
        token = renewed.accessToken;
        await supabaseAdmin
          .from("broker_connections")
          .update({ access_token: renewed.accessToken, token_expiry: renewed.expirationTime })
          .eq("user_id", conn.user_id)
          .eq("broker", "tradovate");
      }

      const fills = await fetchTradovateFillsWithSession(token, conn.account_id, "live");
      const { imported } = await importTodaysFills(conn.user_id, fills);
      results.push({ userId: conn.user_id, status: "ok", imported });
    } catch (err) {
      // Renewal failure (token fully expired beyond the renewal window) —
      // flag for a manual reconnect rather than retrying forever.
      console.error("Tradovate sync failed for", conn.user_id, err);
      await supabaseAdmin
        .from("broker_connections")
        .update({ needs_reconnect: true })
        .eq("user_id", conn.user_id)
        .eq("broker", "tradovate");
      results.push({ userId: conn.user_id, status: "needs-reconnect" });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
