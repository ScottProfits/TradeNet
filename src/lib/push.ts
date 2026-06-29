import webpush from "web-push";
import { supabase } from "@/lib/supabase";

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
  if (!initialized) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        const sub = JSON.parse(row.subscription);
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err && (err.statusCode === 410 || err.statusCode === 404)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        }
      }
    })
  );
}
