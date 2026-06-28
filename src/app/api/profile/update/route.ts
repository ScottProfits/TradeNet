import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { handle, full_name, bio, brokerage, trading_style } = await req.json();

  if (!handle || handle.trim().length < 3) {
    return new Response("Handle must be at least 3 characters", { status: 400 });
  }

  const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (clean !== handle.trim().toLowerCase()) {
    return new Response("Handle can only contain letters, numbers, and underscores", { status: 400 });
  }

  // Check handle isn't taken by someone else
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", clean)
    .neq("id", userId)
    .single();

  if (existing) return new Response("That handle is already taken", { status: 409 });

  const { error } = await supabase
    .from("profiles")
    .update({ handle: clean, full_name, bio, brokerage, trading_style })
    .eq("id", userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response("OK", { status: 200 });
}
