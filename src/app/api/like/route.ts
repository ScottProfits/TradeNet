import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  const { error } = await supabase.from("likes").insert({
    user_id: userId,
    trade_id: tradeId,
  });

  // 23505 = unique violation (already liked), 23503 = FK violation (mock trade)
  if (error && error.code !== "23505" && error.code !== "23503") {
    return new Response(error.message, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId } = await req.json();

  await supabase.from("likes").delete().match({
    user_id: userId,
    trade_id: tradeId,
  });

  return new Response("OK", { status: 200 });
}
