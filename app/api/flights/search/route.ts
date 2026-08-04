import { NextRequest, NextResponse } from "next/server";
import { moduleSetting } from "@/app/lib/moduleSetting";

// The Yatra search webservice itself routinely takes 20-25s to respond (confirmed by timing a
// direct curl straight to api.yatra.com, bypassing this route entirely) — nothing in our own
// code adds meaningful latency. The one thing we DO control is not paying that cost twice for
// the identical search: results/page.tsx re-fetches on every mount (e.g. browser back from
// passenger-details), and concurrent users often search the same route/date. Cache successful
// responses in memory for a short window so repeats return instantly instead of re-querying.
const SEARCH_CACHE_TTL_MS = 90 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 200;

declare global {
  // eslint-disable-next-line no-var
  var _flightSearchCache: Map<string, { data: unknown; expires: number }> | undefined;
}

function searchCache(): Map<string, { data: unknown; expires: number }> {
  if (!global._flightSearchCache) global._flightSearchCache = new Map();
  return global._flightSearchCache;
}

function cacheKeyFor(sp: URLSearchParams): string {
  return [...sp.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
}

function extractCode(cityLabel: string): string {
  const m = cityLabel.match(/\(([^)]+)\)/);
  return m ? m[1] : "";
}

interface YatraSegment {
  ac: string; vc: string; fl: string; dac: string; aac: string;
  ddt: string; adt: string; dd: string; ad: string; du: string; dt: string; at: string; ft?: string; ml?: string;
}
interface YatraOD { tdu: string; FS: YatraSegment[]; fType?: string; bga?: string; hb?: string }
interface YatraFlightOption { ID: string; fareId: string; OD: YatraOD[] }
interface YatraFareAdt { af?: string; tf?: string }
interface YatraFareEntry { O?: { ADT?: YatraFareAdt } }

const NON_ROUTE_KEYS = new Set([
  "scid", "airlineNames", "taxLabel", "cityNames", "airportNames", "message", "fareType",
]);

const AIRLINE_COLORS: Record<string, string> = {
  AI: "#c8102e", "6E": "#1a237e", SG: "#e53935", UK: "#5c2d8c",
  G8: "#f7941d", I5: "#e4002b", "9I": "#0a5c36",
};
function colorFor(code: string): string {
  return AIRLINE_COLORS[code] ?? "#555555";
}

function parseDuration(raw: string): number {
  const clean = raw.replace(":", "");
  const h = parseInt(clean.slice(0, -2) || "0", 10);
  const m = parseInt(clean.slice(-2) || "0", 10);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function toEpochMinutes(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime() / 60000;
}

function ddmmyyyyToYyyymmdd(s: string): string {
  const [d, m, y] = s.split("/");
  return d && m && y ? `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}` : "";
}

function segmentSignature(opt: YatraFlightOption): string {
  return opt.OD[0].FS.map(s => `${s.vc}${s.fl}${s.dd}${s.ad}`).join("|");
}

function transformRoute(
  options: YatraFlightOption[],
  fareById: Record<string, YatraFareEntry>,
  airlineNames: Record<string, string>,
  cityNames: Record<string, string>,
) {
  // Multiple entries can represent the SAME physical flight (identical flight
  // numbers/times) with different fare bundles (Value, Flex, SME Fare, ...).
  // Group those together so the UI can show one card with a fare picker,
  // instead of one card per fare variant.
  const groups = new Map<string, YatraFlightOption[]>();
  for (const opt of options) {
    const sig = segmentSignature(opt);
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig)!.push(opt);
  }

  return [...groups.values()].map((group, idx) => {
    const first = group[0];
    const od = first.OD[0];
    const segs = od.FS;
    const firstSeg = segs[0];
    const lastSeg = segs[segs.length - 1];
    const stops = segs.length - 1;

    const fareOptions = group
      .map(opt => {
        const adt = fareById[opt.ID]?.O?.ADT;
        const optOd = opt.OD[0];
        return {
          fareId: opt.fareId,
          price: adt ? Math.round(parseFloat(adt.af ?? adt.tf ?? "0")) : 0,
          cabinBag: optOd.bga ?? "",
          checkIn: optOd.hb ?? "",
          meal: optOd.FS[0]?.ml ?? "",
          // FS[0].ft is the upstream API's authoritative refundable flag ("1" = Refundable,
          // anything else = Non-Refundable). OD.fType ("NF"/etc.) is a fare-category code, not
          // a refundability indicator, and can disagree with ft on the same fare — ft wins.
          refundable: optOd.FS[0]?.ft === "1",
          yatraId: opt.ID,
        };
      })
      .sort((a, b) => a.price - b.price);
    const cheapest = fareOptions[0];

    return {
      id: idx,
      yatraId: cheapest.yatraId,
      fareId: cheapest.fareId,
      refundable: cheapest.refundable,
      airCode: firstSeg.ac,
      airline: airlineNames[firstSeg.ac] || firstSeg.ac,
      color: colorFor(firstSeg.ac),
      dep: firstSeg.dd,
      arr: lastSeg.ad,
      from: `${cityNames[firstSeg.dac] || firstSeg.dac} (${firstSeg.dac})`,
      to: `${cityNames[lastSeg.aac] || lastSeg.aac} (${lastSeg.aac})`,
      dur: formatDuration(parseDuration(od.tdu)),
      durMin: parseDuration(od.tdu),
      stops,
      stopsLabel: stops === 0 ? "Non Stop" : `${stops} Stop${stops > 1 ? "s" : ""}`,
      price: cheapest.price,
      fareOptions,
      segments: segs.map((s, i) => {
        let layover: string | undefined;
        if (i > 0) {
          const prev = segs[i - 1];
          const gapMin = Math.round(toEpochMinutes(s.ddt, s.dd) - toEpochMinutes(prev.adt, prev.ad));
          if (gapMin > 0) {
            const h = Math.floor(gapMin / 60);
            const m = gapMin % 60;
            layover = `${h}h ${m}m Layover in ${cityNames[s.dac] || s.dac}`;
          }
        }
        return {
          airline: airlineNames[s.ac] || s.ac,
          code: `${s.vc}-${s.fl}`,
          color: colorFor(s.ac),
          dep: s.dd,
          arr: s.ad,
          from: `${cityNames[s.dac] || s.dac} (${s.dac})`,
          to: `${cityNames[s.aac] || s.aac} (${s.aac})`,
          dur: formatDuration(parseDuration(s.du)),
          layover,
        };
      }),
    };
  });
}

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

  const cacheKey = cacheKeyFor(sp);
  const cached = searchCache().get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const origin = fromCities.map(extractCode);
  const destination = toCities.map(extractCode);

  const settings = await moduleSetting();
  // Domestic only if every origin AND destination in the itinerary is within India;
  // any single leg touching a non-India city makes the whole search international.
  const isDomestic =
    originCountries.every(c => c === "IN") && destinationCountries.every(c => c === "IN");
  const baseUrl = isDomestic
    ? `${settings.yatra_api_url}/flightsapi/air-service/b2bdomapi/search`
    : `${settings.yatra_api_url}/flightsapi/air-service/b2bint/search`;

  // Built via raw string concatenation (not URLSearchParams) to match the existing
  // PHP integration exactly — the upstream API rejects percent-encoded '/' in dates.
  const parts = [
    `type=${type}`,
    `viewName=normal`,
    `flexi=${fareType}`,
    `noOfSegments=${noSegments}`,
    `ADT=${adults}`,
    `CHD=${childs}`,
    `INF=${infants}`,
    `class=${cabinClass}`,
    `hb=1`,
  ];

  if (type === "R") {
    parts.push(`arrivalDate=${departures[1]}`);
  }

  if (type === "M") {
    origin.forEach((_, i) => {
      parts.push(`flight_depart_date_${i}=${departures[i] ?? ""}`);
      parts.push(`origin_${i}=${encodeURIComponent(origin[i] ?? "")}`);
      parts.push(`originCountry_${i}=${encodeURIComponent(originCountries[i] ?? "")}`);
      parts.push(`destination_${i}=${encodeURIComponent(destination[i] ?? "")}`);
      parts.push(`destinationCountry_${i}=${encodeURIComponent(destinationCountries[i] ?? "")}`);
    });
  } else {
    parts.push(`origin=${origin[0] ?? ""}`);
    parts.push(`originCountry=${originCountries[0] ?? ""}`);
    parts.push(`destination=${destination[0] ?? ""}`);
    parts.push(`destinationCountry=${destinationCountries[0] ?? ""}`);
    parts.push(`flight_depart_date=${departures[0] ?? ""}`);
    parts.push(`source=fresco-home`);
    parts.push(`booking-type=official`);
  }

  const url = `${baseUrl}?${parts.join("&")}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      emailId: settings.email_id,
      password: settings.password,
      apiKey: settings.apiKey,
      Host: settings.Host,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await res.json().catch(() => null);
  const flightType = isDomestic ? "Domestic" : "International";

  const resultData = data?.resultData?.[0];
  if (!resultData || resultData.isFlights === "0" || resultData.isError === "true") {
    return NextResponse.json({
      status: false,
      flightType,
      msg: resultData?.fltSchedule?.message || data?.meta?.errorMsg || "No flights found",
      legs: [],
    });
  }

  const { fltSchedule, fareDetails } = resultData;
  const airlineNames: Record<string, string> = fltSchedule.airlineNames ?? {};
  const cityNames: Record<string, string> = fltSchedule.cityNames ?? {};

  // Yatra doesn't guarantee fltSchedule's keys come back in requested-segment order,
  // so match each requested segment to its route key explicitly instead of trusting
  // object key order (otherwise outbound/return can end up swapped in the response).
  const allRouteKeys = Object.keys(fltSchedule).filter(k => !NON_ROUTE_KEYS.has(k));
  const orderedRouteKeys: string[] = [];
  for (let i = 0; i < origin.length; i++) {
    const expectedKey = `${origin[i] ?? ""}${destination[i] ?? ""}${ddmmyyyyToYyyymmdd(departures[i] ?? "")}`;
    const match = allRouteKeys.find(k => k === expectedKey);
    if (match && !orderedRouteKeys.includes(match)) orderedRouteKeys.push(match);
  }
  allRouteKeys.forEach(k => { if (!orderedRouteKeys.includes(k)) orderedRouteKeys.push(k); });

  const legs = orderedRouteKeys.map(routeKey => ({
    routeKey,
    flights: transformRoute(
      fltSchedule[routeKey],
      fareDetails?.[routeKey] ?? {},
      airlineNames,
      cityNames,
    ),
  }));

  const responseData = { status: true, flightType, legs };

  const cache = searchCache();
  if (cache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, { data: responseData, expires: Date.now() + SEARCH_CACHE_TTL_MS });

  return NextResponse.json(responseData);
}
