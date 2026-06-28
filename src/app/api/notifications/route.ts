import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("notifications")
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey (handle, avatar_url, verified)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return Response.json(data ?? []);
}

export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return new Response("OK", { status: 200 });
}
