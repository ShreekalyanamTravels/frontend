import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/app/lib/flightSearch";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const type = sp.get("type")?.trim() || null;
  const noSegments = sp.get("no_segments")?.trim() || null;
  const travelers = sp.getAll("travelers[]");
  const adults = sp.get("adults")?.trim() || null;
  const childs = sp.get("childs")?.trim() || null;
  const infants = sp.get("infants")?.trim() || null;
  const cabinClass = sp.get("class")?.trim() || null;
  const departures = sp.getAll("departure[]").map(d => d.trim());
  const originCountries = sp.getAll("origin_country[]").map(c => c.trim());
  const destinationCountries = sp.getAll("destination_country[]").map(c => c.trim());
  const fromCities = sp.getAll("from_city[]");
  const toCities = sp.getAll("to_city[]");
  const fareType = sp.get("fare_type")?.trim() || "1";

  const missing: string[] = [];
  if (!type) missing.push("type");
  if (!noSegments) missing.push("no_segments");
  if (!travelers.length) missing.push("travelers");
  if (!adults) missing.push("adults");
  if (!childs) missing.push("childs");
  if (!infants) missing.push("infants");
  if (!cabinClass) missing.push("class");
  if (type === "R" && !departures[1]) missing.push("arrivalDate");
  if (!departures.length) missing.push("departure");
  if (!originCountries.length) missing.push("origin_country");
  if (!fromCities.length) missing.push("from_city");
  if (!toCities.length) missing.push("to_city");

  if (missing.length) {
    return NextResponse.json(
      { status: false, msg: `${missing[0]} is required`, missing },
      { status: 422 }
    );
  }

  try {
    const responseData = await searchFlights({
      type: type!, noSegments: noSegments!, travelers, adults: adults!, childs: childs!, infants: infants!,
      cabinClass: cabinClass!, departures, originCountries, destinationCountries, fromCities, toCities, fareType,
    });

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("[GET /api/flights/search] Unhandled error:", err);
    return NextResponse.json(
      { status: false, msg: "Flight search is temporarily unavailable. Please try again.", legs: [] },
      { status: 500 }
    );
  }
}
