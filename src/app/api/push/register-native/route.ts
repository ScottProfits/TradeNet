import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { deviceToken, platform } = await req.json();
  if (!deviceToken) return new Response("Missing deviceToken", { status: 400 });

  await supabaseAdmin.from("native_push_tokens").upsert(
    { user_id: userId, device_token: deviceToken, platform: platform ?? "ios" },
    { onConflict: "device_token" }
  );

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { deviceToken } = await req.json();
  await supabaseAdmin.from("native_push_tokens").delete().match({ user_id: userId, device_token: deviceToken });
  return new Response("OK", { status: 200 });
}
