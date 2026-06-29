import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("trades")
    .select("id, ticker, direction, pnl, journal_note, created_at")
    .eq("user_id", userId)
    .not("journal_note", "is", null)
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}
