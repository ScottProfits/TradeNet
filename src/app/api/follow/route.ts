import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { targetHandle } = await req.json();

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", targetHandle)
    .single();

  if (!target) return new Response("User not found", { status: 404 });

  const { error } = await supabase.from("follows").insert({
    follower_id: userId,
    following_id: target.id,
  });

  if (error && error.code !== "23505") {
    return new Response(error.message, { status: 500 });
  }

  // Notify the person being followed (don't notify yourself)
  if (target.id !== userId) {
    await supabase.from("notifications").insert({
      user_id: target.id,
      type: "follow",
      actor_id: userId,
    });
  }

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { targetHandle } = await req.json();

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", targetHandle)
    .single();

  if (!target) return new Response("User not found", { status: 404 });

  await supabase.from("follows").delete().match({
    follower_id: userId,
    following_id: target.id,
  });

  return new Response("OK", { status: 200 });
}
