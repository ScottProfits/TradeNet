import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("trades")
    .select("id, ticker, direction, pnl, created_at, profiles!trades_user_id_fkey(handle, verified)")
    .order("created_at", { ascending: false })
    .limit(30);

  return Response.json(data ?? []);
}
