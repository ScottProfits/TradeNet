import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({});

  const ids = req.nextUrl.searchParams.get("ids");
  if (!ids) return NextResponse.json({});

  const targetIds = ids.split(",").filter(Boolean);
  if (!targetIds.length) return NextResponse.json({});

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .in("following_id", targetIds);

  const result: Record<string, boolean> = {};
  for (const id of targetIds) result[id] = false;
  for (const row of data ?? []) result[row.following_id] = true;

  return NextResponse.json(result);
}
