import { NextRequest, NextResponse } from "next/server";
import { fetchFlightPrice } from "@/app/lib/yatraPrice";

/* Thin wrapper around fetchFlightPrice() — the live Yatra re-check called once per booking,
 * right before showing the passenger-details form, mirroring Laravel's flights_detail()
 * controller (which calls flightDetail() the same way, at the same point in the flow). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const searchId = sp.get("searchId")?.trim() || "";
  const supplierCode = sp.get("supplierCode")?.trim() || "";
  const flightId = sp.get("flightId")?.trim() || "";
  const price = Number(sp.get("price")) || 0;
  // Comma-joined lists, one entry per leg — same "any leg IN" rule as /api/flights/search.
  const originCountry = (sp.get("originCountry") ?? "").split(",").map(c => c.trim());
  const destinationCountry = (sp.get("destinationCountry") ?? "").split(",").map(c => c.trim());

  if (!searchId || !supplierCode || !flightId || !price) {
    return NextResponse.json({ status: false, msg: "Missing required params" }, { status: 422 });
  }

  const isDomestic = originCountry.includes("IN") && destinationCountry.includes("IN");

  const data = await fetchFlightPrice({ searchId, supplierCode, flightId, price, isDomestic });

  return NextResponse.json({ status: true, data });
}
