import { NextRequest, NextResponse } from "next/server";
import { fetchBajajPlanDetails } from "@/app/lib/bajajTravelApi";

/* Backs the "Policy details" expansion on the plans list — proxies Bajaj's `getplandtls`
 * webservice so the plan name/credentials never need to reach the client. */
export async function GET(request: NextRequest) {
  const planName = request.nextUrl.searchParams.get("plan");
  if (!planName) {
    return NextResponse.json({ error: "Missing plan name" }, { status: 400 });
  }

  try {
    const details = await fetchBajajPlanDetails(planName);
    return NextResponse.json(details);
  } catch (err) {
    console.error(`Bajaj plan-details lookup failed for "${planName}"`, err);
    return NextResponse.json({ error: "Unable to fetch policy details right now." }, { status: 502 });
  }
}
