import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return Response.json([]);

  const { data } = await supabase
    .from("profiles")
    .select("id, handle, full_name, avatar_url, verified")
    .ilike("handle", `%${q}%`)
    .limit(8);

  return Response.json(data ?? []);
}
