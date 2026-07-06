import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { avatar_url } = await req.json();
  if (!avatar_url) return new Response("Missing avatar_url", { status: 400 });

  const { error } = await supabaseAdmin.from("profiles").update({ avatar_url }).eq("id", userId);
  if (error) return new Response(error.message, { status: 500 });

  return new Response("OK", { status: 200 });
}
