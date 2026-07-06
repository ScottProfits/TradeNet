import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  const body = await req.json().catch(() => ({}));
  const { message, stack, url } = body;

  // Vercel captures console output from serverless functions in its Runtime Logs,
  // so this is queryable there without needing a third-party error-tracking service.
  console.error("[client-error]", JSON.stringify({ userId: userId ?? null, message, stack, url }));

  return NextResponse.json({ ok: true });
}
