import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  // Cursor pagination: pass the created_at of the oldest item already shown
  // to get the next page. Keeping each page small is what actually avoids
  // overwhelming WebKit's tile compositor with too much DOM/images at once.
  const before = req.nextUrl.searchParams.get("before");

  let query = supabase
    .from("trades")
    .select(`*, profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)`)
    .order("created_at", { ascending: false })
    .limit(15);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;

  if (error) return new Response(error.message, { status: 500 });

  // Fetch which trades the current user has liked
  let likedIds = new Set<string>();
  if (userId) {
    const { data: likes } = await supabase
      .from("likes")
      .select("trade_id")
      .eq("user_id", userId);
    if (likes) likedIds = new Set(likes.map((l) => l.trade_id));
  }

  const result = (data ?? []).map((t) => ({ ...t, liked_by_me: likedIds.has(t.id) }));
  return Response.json(result);
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
      await supabaseAdmin.from("profiles").insert({ id: userId, handle, full_name, avatar_url: user.imageUrl });
    }
  }

  const body = await req.json();
  const { ticker, direction, entry, exit, caption, strategy, image_url, pnl_sign, audio_url, audio_duration } = body;

  if (!ticker || !direction || !entry || !exit) {
    return new Response("Missing required fields", { status: 400 });
  }

  const entryNum = parseFloat(entry);
  const exitNum = parseFloat(exit);
  const shares = parseFloat(body.shares) || 100;

  let pnl: number;
  let pnl_percent = 0;
  if (direction === "LONG") {
    pnl = (exitNum - entryNum) * shares;
    if (entryNum !== 0) pnl_percent = ((exitNum - entryNum) / entryNum) * 100;
  } else {
    pnl = (entryNum - exitNum) * shares;
    if (entryNum !== 0) pnl_percent = ((entryNum - exitNum) / entryNum) * 100;
  }

  // A short can still be a profit — let the poster explicitly say which,
  // rather than forcing the sign implied by entry/exit direction math.
  if (pnl_sign === "profit" || pnl_sign === "loss") {
    const sign = pnl_sign === "loss" ? -1 : 1;
    pnl = Math.abs(pnl) * sign;
    pnl_percent = Math.abs(pnl_percent) * sign;
  }

  const { data, error } = await supabaseAdmin
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
      strategy: strategy ?? null,
      image_url: image_url ?? null,
      audio_url: audio_url ?? null,
      audio_duration: typeof audio_duration === "number" ? Math.round(audio_duration) : null,
    })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
