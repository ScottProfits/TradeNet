import { auth } from "@clerk/nextjs/server";
import { RITHMIC_URI, RITHMIC_SYSTEM } from "@/lib/rithmic/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// POST /api/brokers/rithmic/agreements — lists any Rithmic agreements this
// account hasn't accepted yet, with the actual text, so the user can review
// them in the app before we ever submit acceptance on their behalf.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rithmicUser, rithmicPassword } = await req.json();
  if (!rithmicUser || !rithmicPassword) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const { listUnacceptedRithmicAgreements } = await import("@/lib/rithmic/client");
    const agreements = await listUnacceptedRithmicAgreements(rithmicUser, rithmicPassword, RITHMIC_SYSTEM, RITHMIC_URI);
    return NextResponse.json({ agreements });
  } catch (err: unknown) {
    console.error("Rithmic list agreements error:", err);
    const message = err instanceof Error ? err.message : "Failed to check agreements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
