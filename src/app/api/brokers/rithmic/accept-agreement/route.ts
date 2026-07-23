import { auth } from "@clerk/nextjs/server";
import { RITHMIC_URI, RITHMIC_SYSTEM } from "@/lib/rithmic/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// POST /api/brokers/rithmic/accept-agreement — submits acceptance for one or
// more agreements the user has already reviewed and explicitly agreed to in
// the connect modal. Never called without the user having seen the actual
// agreement text and chosen their own market-data usage capacity.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rithmicUser, rithmicPassword, agreementIds, marketDataUsageCapacity } = await req.json();
  if (!rithmicUser || !rithmicPassword || !Array.isArray(agreementIds) || agreementIds.length === 0) {
    return NextResponse.json({ error: "Missing credentials or agreement IDs" }, { status: 400 });
  }
  if (marketDataUsageCapacity !== "Professional" && marketDataUsageCapacity !== "Non-Professional") {
    return NextResponse.json({ error: "Missing or invalid market data usage capacity" }, { status: 400 });
  }

  try {
    const { acceptRithmicAgreements } = await import("@/lib/rithmic/client");
    await acceptRithmicAgreements(rithmicUser, rithmicPassword, RITHMIC_SYSTEM, RITHMIC_URI, agreementIds, marketDataUsageCapacity);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Rithmic accept agreement error:", err);
    const message = err instanceof Error ? err.message : "Failed to accept agreement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
