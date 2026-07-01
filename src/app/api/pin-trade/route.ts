import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST { tradeId } — pin this trade (or unpin if already pinned)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tradeId } = await req.json();

  // Check if it's already pinned → toggle off
  const { data: profile } = await supabase
    .from("profiles")
    .select("pinned_trade_id")
    .eq("id", userId)
    .single();

  const newPinId = profile?.pinned_trade_id === tradeId ? null : tradeId;

  await supabase
    .from("profiles")
    .update({ pinned_trade_id: newPinId })
    .eq("id", userId);

  return NextResponse.json({ pinned: newPinId !== null });
}
