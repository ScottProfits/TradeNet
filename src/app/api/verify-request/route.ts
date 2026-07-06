import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { reason } = await req.json();

  const { error } = await supabaseAdmin.from("verify_requests").upsert(
    { user_id: userId, reason, status: "pending" },
    { onConflict: "user_id" }
  );

  if (error) return new Response(error.message, { status: 500 });
  return new Response("OK", { status: 200 });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabaseAdmin
    .from("verify_requests")
    .select("status, reason, created_at")
    .eq("user_id", userId)
    .single();

  return Response.json(data ?? null);
}
