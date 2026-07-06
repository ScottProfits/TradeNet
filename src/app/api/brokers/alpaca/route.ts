import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/brokers/alpaca — verify keys against Alpaca, then store them
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey, apiSecret } = await req.json();
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing API key or secret" }, { status: 400 });
  }

  try {
    const res = await fetch("https://paper-api.alpaca.markets/v2/account", {
      headers: { "APCA-API-KEY-ID": apiKey, "APCA-API-SECRET-KEY": apiSecret },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Alpaca API key or secret" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ alpaca_key: apiKey, alpaca_secret: apiSecret })
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to contact Alpaca" }, { status: 500 });
  }
}

// GET /api/brokers/alpaca — check connection status
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ connected: false });

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("alpaca_key")
    .eq("id", userId)
    .single();

  return NextResponse.json({ connected: !!data?.alpaca_key });
}

// DELETE /api/brokers/alpaca — disconnect
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin.from("profiles").update({ alpaca_key: null, alpaca_secret: null }).eq("id", userId);
  return NextResponse.json({ success: true });
}
