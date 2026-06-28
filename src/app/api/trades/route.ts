import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("trades")
    .select(`
      *,
      profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Create profile only if it doesn't exist — never overwrite handle set in Settings
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).single();
  if (!existing) {
    const user = await currentUser();
    if (user) {
      const handle = user.username || `user_${userId.slice(-6)}`;
      const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || handle;
      await supabase.from("profiles").insert({ id: userId, handle, full_name, avatar_url: user.imageUrl });
    }
  }

  const body = await req.json();
  const { ticker, direction, entry, exit, caption, image_url } = body;

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
      image_url: image_url ?? null,
    })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
