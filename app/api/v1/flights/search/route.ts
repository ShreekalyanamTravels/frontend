import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFlights } from "@/app/lib/flightSearch";

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

function isValidDdMmYyyy(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [d, m, y] = s.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const querySchema = z.object({
  type: z.enum(["O", "R", "M"]),
  no_segments: z.string().regex(/^\d+$/),
  "travelers[]": z.array(z.string()).min(1),
  adults: z.string().regex(/^\d+$/).refine(v => Number(v) >= 1 && Number(v) <= 9, "adults must be 1-9"),
  childs: z.string().regex(/^\d+$/).refine(v => Number(v) <= 9, "childs must be 0-9"),
  infants: z.string().regex(/^\d+$/).refine(v => Number(v) <= 9, "infants must be 0-9"),
  class: z.string().min(1),
  "departure[]": z.array(z.string()).min(1).refine(arr => arr.every(isValidDdMmYyyy), "invalid date in departure[]"),
  "origin_country[]": z.array(z.string()).min(1),
  "destination_country[]": z.array(z.string()).min(1),
  "from_city[]": z.array(z.string()).min(1),
  "to_city[]": z.array(z.string()).min(1),
  fare_type: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const raw = {
    type: sp.get("type") ?? undefined,
    no_segments: sp.get("no_segments") ?? undefined,
    "travelers[]": sp.getAll("travelers[]"),
    adults: sp.get("adults") ?? undefined,
    childs: sp.get("childs") ?? undefined,
    infants: sp.get("infants") ?? undefined,
    class: sp.get("class") ?? undefined,
    "departure[]": sp.getAll("departure[]").map(d => d.trim()),
    "origin_country[]": sp.getAll("origin_country[]").map(c => c.trim()),
    "destination_country[]": sp.getAll("destination_country[]").map(c => c.trim()),
    "from_city[]": sp.getAll("from_city[]"),
    "to_city[]": sp.getAll("to_city[]"),
    fare_type: sp.get("fare_type") ?? undefined,
  };

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { status: false, msg: parsed.error.issues[0]?.message ?? "Invalid request", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const q = parsed.data;

  if (q.type === "R" && !q["departure[]"][1]) {
    return NextResponse.json({ status: false, msg: "arrivalDate is required" }, { status: 422 });
  }

  const responseData = await searchFlights({
    type: q.type,
    noSegments: q.no_segments,
    travelers: q["travelers[]"],
    adults: q.adults,
    childs: q.childs,
    infants: q.infants,
    cabinClass: q.class,
    departures: q["departure[]"],
    originCountries: q["origin_country[]"],
    destinationCountries: q["destination_country[]"],
    fromCities: q["from_city[]"],
    toCities: q["to_city[]"],
    fareType: q.fare_type ?? "1",
  });

  return NextResponse.json(responseData);
}
