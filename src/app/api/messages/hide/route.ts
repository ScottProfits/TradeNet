import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// POST /api/messages/hide  { partnerId } — "delete for me": hide this DM
// thread from the caller's list up to now. The partner keeps their copy.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { partnerId } = await req.json();
  if (!partnerId) return new Response("Missing partnerId", { status: 400 });

  const { error } = await supabaseAdmin
    .from("dm_hidden")
    .upsert(
      { user_id: userId, partner_id: partnerId, hidden_at: new Date().toISOString() },
      { onConflict: "user_id,partner_id" }
    );

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ hidden: true });
}
