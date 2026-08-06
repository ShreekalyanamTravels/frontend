import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchFlightPrice } from "@/app/lib/yatraPrice";

const querySchema = z.object({
  searchId: z.string().min(1),
  supplierCode: z.string().min(1),
  flightId: z.string().min(1),
  price: z.coerce.number().positive(),
  originCountry: z.string().optional(),
  destinationCountry: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const parsed = querySchema.safeParse({
    searchId: sp.get("searchId")?.trim(),
    supplierCode: sp.get("supplierCode")?.trim(),
    flightId: sp.get("flightId")?.trim(),
    price: sp.get("price"),
    originCountry: sp.get("originCountry") ?? undefined,
    destinationCountry: sp.get("destinationCountry") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ status: false, msg: "Missing or invalid required params" }, { status: 422 });
  }
  const { searchId, supplierCode, flightId, price, originCountry, destinationCountry } = parsed.data;

  // Comma-joined lists, one entry per leg — same "any leg IN" rule as /api/v1/flights/search.
  const originCountries = (originCountry ?? "").split(",").map(c => c.trim());
  const destinationCountries = (destinationCountry ?? "").split(",").map(c => c.trim());
  const isDomestic = originCountries.includes("IN") && destinationCountries.includes("IN");

  const data = await fetchFlightPrice({ searchId, supplierCode, flightId, price, isDomestic });

  return NextResponse.json({ status: true, data });
}
