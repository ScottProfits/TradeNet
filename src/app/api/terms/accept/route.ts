import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/terms/accept — record that the signed-in user agreed to the
// Terms of Service and community standards.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
