import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendApnsNotification } from "@/lib/apns";

// POST /api/push/test — send a test push to the current user's own registered devices,
// bypassing sendPushToUser's normal notification-trigger flow. Diagnostic only.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: tokens, error } = await supabaseAdmin
    .from("native_push_tokens")
    .select("device_token, platform")
    .eq("user_id", userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!tokens || tokens.length === 0) {
    return Response.json({ error: "No native push tokens registered for this user" }, { status: 404 });
  }

  const results = await Promise.all(
    tokens.map(async (row) => {
      const result = await sendApnsNotification(row.device_token, {
        title: "Test notification",
        body: "If you see this, native push is working!",
      });
      return { deviceToken: row.device_token, ...result };
    })
  );

  return Response.json({ tokenCount: tokens.length, results });
}
