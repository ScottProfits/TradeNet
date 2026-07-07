import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// DELETE /api/account — permanently delete the current user's account and all their data
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Delete rows the user owns/authored across every table, then the profile row itself.
  await Promise.all([
    supabaseAdmin.from("comment_likes").delete().eq("user_id", userId),
    supabaseAdmin.from("post_likes").delete().eq("user_id", userId),
    supabaseAdmin.from("likes").delete().eq("user_id", userId),
    supabaseAdmin.from("message_likes").delete().eq("user_id", userId),
    supabaseAdmin.from("comments").delete().eq("user_id", userId),
    supabaseAdmin.from("journal_entries").delete().eq("user_id", userId),
    supabaseAdmin.from("watchlist").delete().eq("user_id", userId),
    supabaseAdmin.from("verify_requests").delete().eq("user_id", userId),
    supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId),
    supabaseAdmin.from("native_push_tokens").delete().eq("user_id", userId),
    supabaseAdmin.from("broker_connections").delete().eq("user_id", userId),
  ]);

  await Promise.all([
    supabaseAdmin.from("notifications").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`),
    supabaseAdmin.from("explore_notifications").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`),
    supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    supabaseAdmin.from("follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`),
  ]);

  await Promise.all([
    supabaseAdmin.from("posts").delete().eq("user_id", userId),
    supabaseAdmin.from("trades").delete().eq("user_id", userId),
  ]);

  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  return new Response("OK", { status: 200 });
}
