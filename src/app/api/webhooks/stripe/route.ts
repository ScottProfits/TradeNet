import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";

// Stripe needs the raw body for signature verification.
export const runtime = "nodejs";

function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled";
}

async function setMemberCount(roomId: string, delta: number) {
  const { data } = await supabaseAdmin.from("rooms").select("member_count").eq("id", roomId).single();
  await supabaseAdmin
    .from("rooms")
    .update({ member_count: Math.max(0, (data?.member_count ?? 0) + delta) })
    .eq("id", roomId);
}

async function applySubscription(sub: Stripe.Subscription) {
  const roomId = sub.metadata?.ryzr_room_id;
  const userId = sub.metadata?.ryzr_user_id;
  if (!roomId || !userId) return;

  const status = mapStatus(sub.status);
  const { data: prev } = await supabaseAdmin
    .from("room_members")
    .select("status")
    .match({ room_id: roomId, user_id: userId })
    .maybeSingle();

  if (status === "canceled") {
    await supabaseAdmin.from("room_members").delete().match({ room_id: roomId, user_id: userId });
    if (prev && prev.status !== "canceled") await setMemberCount(roomId, -1);
    return;
  }

  await supabaseAdmin.from("room_members").upsert(
    {
      room_id: roomId,
      user_id: userId,
      role: "member",
      status,
      stripe_subscription_id: sub.id,
    },
    { onConflict: "room_id,user_id" }
  );
  if (!prev) await setMemberCount(roomId, 1);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("No webhook secret", { status: 400 });

  const sig = (await headers()).get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency — Stripe retries, and Connect + account events can double up.
  const { error: dupe } = await supabaseAdmin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dupe) return new Response("ok (already processed)", { status: 200 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        // Metadata set in subscribe route lives on subscription_data; ensure it's present.
        sub.metadata = {
          ...sub.metadata,
          ryzr_room_id: sub.metadata?.ryzr_room_id ?? (session.metadata?.ryzr_room_id ?? ""),
          ryzr_user_id: sub.metadata?.ryzr_user_id ?? (session.metadata?.ryzr_user_id ?? ""),
        };
        await applySubscription(sub);

        const userId = sub.metadata.ryzr_user_id;
        const roomId = sub.metadata.ryzr_room_id;
        if (userId && roomId) {
          const { data: room } = await supabaseAdmin.from("rooms").select("name, slug").eq("id", roomId).single();
          if (room) {
            void sendPushToUser(userId, {
              title: `✅ Welcome to ${room.name}`,
              body: "Your subscription is active.",
              url: `/rooms/${room.slug}`,
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const uid = acct.metadata?.ryzr_user_id;
        if (uid) {
          await supabaseAdmin
            .from("creator_accounts")
            .update({
              payouts_enabled: !!acct.payouts_enabled && !!acct.charges_enabled,
              onboarding_complete: !!acct.details_submitted,
            })
            .eq("user_id", uid);
        }
        break;
      }
    }
  } catch (err) {
    // Let Stripe retry — remove the idempotency row so the retry runs.
    await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
