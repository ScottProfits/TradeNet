import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("trades")
    .select(`
      *,
      profiles (id, handle, avatar_url, brokerage, verified)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { ticker, direction, entry, exit, caption } = body;

  if (!ticker || !direction || !entry || !exit) {
    return new Response("Missing required fields", { status: 400 });
  }

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const shares = parseFloat(body.shares) || 100;

  let pnl: number;
  let pnl_percent: number;
  if (direction === "LONG") {
    pnl = (exitNum - entryNum) * shares;
    pnl_percent = ((exitNum - entryNum) / entryNum) * 100;
  } else {
    pnl = (entryNum - exitNum) * shares;
    pnl_percent = ((entryNum - exitNum) / entryNum) * 100;
  }

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: userId,
      ticker: ticker.toUpperCase(),
      direction,
      entry: entryNum,
      exit: exitNum,
      pnl: Math.round(pnl * 100) / 100,
      pnl_percent: Math.round(pnl_percent * 100) / 100,
      caption,
    })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
