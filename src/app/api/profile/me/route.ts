import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!error && data) return Response.json(data);

  // Profile doesn't exist yet — auto-create from Clerk data
  const clerkUser = await currentUser();
  if (!clerkUser) return new Response("Not found", { status: 404 });

  const handle = clerkUser.username || `user_${userId.slice(-8)}`;
  const full_name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || handle;

  const { data: created, error: insertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, handle, full_name, avatar_url: clerkUser.imageUrl },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (insertError || !created) return new Response("Failed to create profile", { status: 500 });
  return Response.json(created);
}
