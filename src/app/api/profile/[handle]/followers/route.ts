import { supabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const { data: profile } = await supabase
    .from("profiles").select("id").eq("handle", handle).single();
  if (!profile) return new Response("Not found", { status: 404 });

  const { data: followers } = await supabase
    .from("follows")
    .select("profiles!follows_follower_id_fkey (id, handle, avatar_url, verified)")
    .eq("following_id", profile.id);

  const { data: following } = await supabase
    .from("follows")
    .select("profiles!follows_following_id_fkey (id, handle, avatar_url, verified)")
    .eq("follower_id", profile.id);

  return Response.json({
    followers: followers?.map((f) => f.profiles) ?? [],
    following: following?.map((f) => f.profiles) ?? [],
  });
}
