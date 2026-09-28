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

async function applyIndicatorSubscription(sub: Stripe.Subscription, tvUsername?: string) {
  const userId = sub.metadata?.ryzr_user_id;
  if (!userId) return;

  const status = mapStatus(sub.status);
  if (status === "canceled") {
    // Only flip an existing active/needs_grant row to needs_revoke — don't
    // resurrect a row that was already fully revoked.
    await supabaseAdmin
      .from("indicator_subscriptions")
      .update({ status: "needs_revoke", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id)
      .in("status", ["needs_grant", "active"]);
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("indicator_subscriptions")
    .select("id, tv_username")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  await supabaseAdmin.from("indicator_subscriptions").upsert(
    {
      user_id: userId,
      tv_username: tvUsername ?? existing?.tv_username ?? "",
      status: existing ? existing.tv_username ? "active" : "needs_grant" : "needs_grant",
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function applyProductSubscription(sub: Stripe.Subscription) {
  const productId = sub.metadata?.ryzr_product_id;
  const userId = sub.metadata?.ryzr_user_id;
  if (!productId || !userId) return;

  const status = mapStatus(sub.status);
  if (status === "canceled") {
    await supabaseAdmin
      .from("product_subscriptions")
      .delete()
      .match({ product_id: productId, user_id: userId });
    return;
  }

  await supabaseAdmin.from("product_subscriptions").upsert(
    { product_id: productId, user_id: userId, status, stripe_subscription_id: sub.id },
    { onConflict: "product_id,user_id" }
  );
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
  if (!prev) {
    await setMemberCount(roomId, 1);
    const { notifyChannelJoin } = await import("@/lib/rooms");
    void notifyChannelJoin(roomId, userId, "join");
  }
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
          ryzr_product_id: sub.metadata?.ryzr_product_id ?? (session.metadata?.ryzr_product_id ?? ""),
          ryzr_user_id: sub.metadata?.ryzr_user_id ?? (session.metadata?.ryzr_user_id ?? ""),
          kind: sub.metadata?.kind ?? session.metadata?.kind ?? "",
        };

        if (sub.metadata.kind === "indicator") {
          const tvUsername = session.custom_fields?.find((f) => f.key === "tv_username")?.text?.value ?? "";
          await applyIndicatorSubscription(sub, tvUsername);
          if (sub.metadata.ryzr_user_id) {
            void sendPushToUser(sub.metadata.ryzr_user_id, {
              title: "✅ Indicator access requested",
              body: "We'll add your TradingView access shortly.",
              url: "/indicator",
            });
          }
          break;
        }

        if (sub.metadata.kind === "product") {
          await applyProductSubscription(sub);
          const productId = sub.metadata.ryzr_product_id;
          if (sub.metadata.ryzr_user_id && productId) {
            const { data: product } = await supabaseAdmin.from("products").select("title").eq("id", productId).single();
            void sendPushToUser(sub.metadata.ryzr_user_id, {
              title: `✅ You're subscribed to ${product?.title ?? "the product"}`,
              body: "Check how to access it.",
              url: `/products/${productId}/thanks`,
            });
          }
          break;
        }

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
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.kind === "indicator") {
          await applyIndicatorSubscription(sub);
          break;
        }
        if (sub.metadata?.kind === "product") {
          await applyProductSubscription(sub);
          break;
        }
        await applySubscription(sub);
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const uid = acct.metadata?.ryzr_user_id;
        if (uid) {
          await supabaseAdmin
            .from("creator_accounts")
            .update({
              payouts_enabled: !!acct.payouts_enabled && acct.capabilities?.transfers === "active",
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
