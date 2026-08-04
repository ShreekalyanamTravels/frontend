import { NextRequest, NextResponse } from "next/server";
import { fetchBajajPremium, destToAreaPlan, toBajajDate } from "@/app/lib/bajajTravelApi";

function ageFromDob(iso: string): number {
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return 30;
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000)));
}

/* Backs the real per-plan premium shown on the plans list — proxies Bajaj's `calculatepremium`
 * webservice using the trip dates/destination/traveller DOB already carried in the URL from the
 * dashboard search, so credentials and the plan-area mapping never need to reach the browser. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const plan = sp.get("plan");
  const dep = sp.get("dep");
  const ret = sp.get("ret");
  const dob = sp.get("dob");
  const dest = sp.get("dest") ?? "";

  if (!plan || !dep || !ret || !dob) {
    return NextResponse.json({ error: "Missing plan, dep, ret or dob" }, { status: 400 });
  }

  const fromDate = toBajajDate(dep);
  const toDate = toBajajDate(ret);
  const bajajDob = toBajajDate(dob);
  if (!fromDate || !toDate || !bajajDob) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const result = await fetchBajajPremium({
      travelPlan: plan,
      areaPlan: destToAreaPlan(dest),
      fromDate,
      toDate,
      dob: bajajDob,
      age: ageFromDob(dob),
    });

    if (result.totalPremium <= 0) {
      return NextResponse.json({ error: "Premium not available for this plan/area/age" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(`Bajaj premium calc failed for "${plan}"`, err);
    return NextResponse.json({ error: "Unable to fetch premium right now." }, { status: 502 });
  }
}
