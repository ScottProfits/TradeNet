import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { userId } = await auth();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !profile) return new Response("Not found", { status: 404 });

  const isOwner = userId === profile.id;
  const tradesQuery = supabase
    .from("trades")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!isOwner) tradesQuery.eq("is_public", true);

  const { data: trades } = await tradesQuery;

  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  // Check if the current user already follows this profile
  let isFollowing = false;
  if (userId && userId !== profile.id) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("following_id", profile.id)
      .single();
    isFollowing = !!followRow;
  }

  return Response.json({
    profile,
    trades: trades ?? [],
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing,
    isOwner,
  });
}
