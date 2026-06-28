import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const tradeId = req.nextUrl.searchParams.get("tradeId");
  if (!tradeId) return new Response("Missing tradeId", { status: 400 });

  const { data } = await supabase
    .from("comments")
    .select(`*, profiles!comments_user_id_fkey (handle, avatar_url, verified)`)
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });

  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId, content } = await req.json();
  if (!content?.trim()) return new Response("Empty comment", { status: 400 });

  // Ensure profile exists
  const user = await currentUser();
  if (user) {
    const handle = user.username || `user_${userId.slice(-6)}`;
    const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || handle;
    await supabase.from("profiles").upsert(
      { id: userId, handle, full_name, avatar_url: user.imageUrl },
      { onConflict: "id" }
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: userId, trade_id: tradeId, content: content.trim() })
    .select(`*, profiles!comments_user_id_fkey (handle, avatar_url, verified)`)
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
