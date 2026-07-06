import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint) return new Response("Invalid subscription", { status: 400 });

  await supabaseAdmin.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: subscription.endpoint, subscription: JSON.stringify(subscription) },
    { onConflict: "endpoint" }
  );

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { endpoint } = await req.json();
  await supabaseAdmin.from("push_subscriptions").delete().match({ user_id: userId, endpoint });
  return new Response("OK", { status: 200 });
}
