import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles!posts_user_id_fkey(id, handle, avatar_url, verified)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Try without join if FK doesn't exist
    const { data: plain } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    return Response.json(plain ?? []);
  }
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { content, image_url } = await req.json();
  if (!content?.trim()) return new Response("Content required", { status: 400 });

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).single();
  if (!existing) {
    const user = await currentUser();
    if (user) {
      const handle = user.username || `user_${userId.slice(-6)}`;
      const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || handle;
      await supabase.from("profiles").insert({ id: userId, handle, full_name, avatar_url: user.imageUrl });
    }
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, content: content.trim(), image_url: image_url ?? null })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
