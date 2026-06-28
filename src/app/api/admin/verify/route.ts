import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

const ADMIN_ID = "user_3FjHwLbvzd59NATWEJDb6dwguxh";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (userId !== ADMIN_ID) return new Response("Forbidden", { status: 403 });

  const { targetHandle, verified } = await req.json();

  const { error } = await supabase
    .from("profiles")
    .update({ verified })
    .eq("handle", targetHandle);

  if (error) return new Response(error.message, { status: 500 });
  return new Response("OK", { status: 200 });
}

export async function GET() {
  const { userId } = await auth();
  if (userId !== ADMIN_ID) return new Response("Forbidden", { status: 403 });

  const { data } = await supabase
    .from("profiles")
    .select("id, handle, full_name, verified, avatar_url")
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}
