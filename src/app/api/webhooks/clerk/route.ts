import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response("No webhook secret", { status: 400 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, username, first_name, last_name, image_url } = evt.data;
    const handle = username || `user_${id.slice(-6)}`;
    const full_name = [first_name, last_name].filter(Boolean).join(" ") || handle;

    await supabaseAdmin.from("profiles").insert({
      id,
      handle,
      full_name,
      avatar_url: image_url,
    });
  }

  if (evt.type === "user.updated") {
    const { id, username, first_name, last_name, image_url } = evt.data;
    const handle = username || `user_${id.slice(-6)}`;
    const full_name = [first_name, last_name].filter(Boolean).join(" ") || handle;

    await supabaseAdmin.from("profiles").upsert({
      id,
      handle,
      full_name,
      avatar_url: image_url,
    });
  }

  return new Response("OK", { status: 200 });
}
