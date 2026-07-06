import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendApnsNotification } from "@/lib/apns";

let initialized = false;

function init() {
  if (initialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  init();

  const [{ data: subs }, { data: nativeTokens }] = await Promise.all([
    supabaseAdmin.from("push_subscriptions").select("endpoint, subscription").eq("user_id", userId),
    supabaseAdmin.from("native_push_tokens").select("device_token").eq("user_id", userId),
  ]);

  const webPushSends = initialized
    ? (subs ?? []).map(async (row) => {
        try {
          const sub = JSON.parse(row.subscription);
          await webpush.sendNotification(sub, JSON.stringify(payload));
        } catch (err: unknown) {
          if (err && typeof err === "object" && "statusCode" in err && (err.statusCode === 410 || err.statusCode === 404)) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
        }
      })
    : [];

  const apnsSends = (nativeTokens ?? []).map(async (row) => {
    const { shouldRemove } = await sendApnsNotification(row.device_token, payload);
    if (shouldRemove) {
      await supabaseAdmin.from("native_push_tokens").delete().eq("device_token", row.device_token);
    }
  });

  await Promise.allSettled([...webPushSends, ...apnsSends]);
}
