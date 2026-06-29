import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET() {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return Response.json([]);

  // Fetch profiles separately (no FK constraint)
  const userIds = [...new Set(data.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, avatar_url, verified")
    .in("id", userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const result = data.map((p) => ({ ...p, profiles: profileMap[p.user_id] ?? null }));
  return Response.json(result);
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
