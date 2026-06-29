import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();

  // Get current user's trading style
  let tradingStyle: string | null = null;
  let alreadyFollowing: string[] = [];

  if (userId) {
    const [{ data: me }, { data: follows }] = await Promise.all([
      supabase.from("profiles").select("trading_style").eq("id", userId).single(),
      supabase.from("follows").select("following_id").eq("follower_id", userId),
    ]);
    tradingStyle = me?.trading_style ?? null;
    alreadyFollowing = (follows ?? []).map((f) => f.following_id);
    alreadyFollowing.push(userId); // exclude self
  }

  // Fetch candidates — same trading style first, then anyone
  const excludeClause = alreadyFollowing.length > 0 ? `(${alreadyFollowing.join(",")})` : `('')`;

  // Try same style first
  if (tradingStyle) {
    const { data: styleMatch } = await supabase
      .from("profiles")
      .select("id, handle, avatar_url, trading_style, verified")
      .not("handle", "is", null)
      .not("id", "in", excludeClause)
      .eq("trading_style", tradingStyle)
      .limit(5);
    if (styleMatch && styleMatch.length >= 3) {
      return Response.json(styleMatch.slice(0, 5));
    }
  }

  // Fallback: most recent profiles
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, avatar_url, trading_style, verified")
    .not("handle", "is", null)
    .not("id", "in", excludeClause)
    .order("created_at", { ascending: false })
    .limit(5);

  return Response.json(data ?? []);
}
