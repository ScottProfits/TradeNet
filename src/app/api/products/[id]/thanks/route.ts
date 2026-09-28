import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/products/:id/thanks — delivery instructions, only for someone
// who actually has an active subscription to this product (or owns it).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("title, delivery_instructions, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!product) return new Response("Not found", { status: 404 });

  if (product.user_id !== userId) {
    const { data: sub } = await supabaseAdmin
      .from("product_subscriptions")
      .select("status")
      .match({ product_id: id, user_id: userId })
      .maybeSingle();
    if (sub?.status !== "active") return new Response("Not subscribed", { status: 403 });
  }

  return Response.json({ title: product.title, delivery_instructions: product.delivery_instructions });
}
