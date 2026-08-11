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

function extractCode(cityLabel: string): string {
  const m = cityLabel.match(/\(([^)]+)\)/);
  return m ? m[1] : "";
}

interface YatraSegment {
  ac: string; vc: string; fl: string; dac: string; aac: string;
  ddt: string; adt: string; dd: string; ad: string; du: string; dt: string; at: string; ft?: string; ml?: string;
}
interface YatraOD { tdu: string; FS: YatraSegment[]; fType?: string; bga?: string; hb?: string }
interface YatraFlightOption { ID: string; fareId: string; OD: YatraOD[]; supplierCode?: string }
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
  scid: string,
) {
  // International responses have been observed to include malformed/partial entries
  // (empty OD, or OD with no segments) that domestic responses never send — drop those
  // instead of letting segmentSignature() throw on opt.OD[0].FS.
  const validOptions = (Array.isArray(options) ? options : []).filter(
    opt => Array.isArray(opt?.OD) && opt.OD[0] && Array.isArray(opt.OD[0].FS) && opt.OD[0].FS.length > 0
  );

  // Multiple entries can represent the SAME physical flight (identical flight
  // numbers/times) with different fare bundles (Value, Flex, SME Fare, ...).
  // Group those together so the UI can show one card with a fare picker,
  // instead of one card per fare variant.
  const groups = new Map<string, YatraFlightOption[]>();
  for (const opt of validOptions) {
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
          // Yatra's per-flight supplier/vendor code — required (alongside yatraId/searchId) for
          // the live pricing re-check call (.../price) mirroring Laravel's flightDetail().
          supplierCode: opt.supplierCode ?? "",
        };
      })
      .sort((a, b) => a.price - b.price);
    const cheapest = fareOptions[0];

    return {
      id: idx,
      yatraId: cheapest.yatraId,
      fareId: cheapest.fareId,
      refundable: cheapest.refundable,
      supplierCode: cheapest.supplierCode,
      // Search-session id shared by every flight/leg in this search response — required
      // alongside yatraId/supplierCode for the live pricing re-check call.
      scid,
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

export interface FlightSearchInput {
  type: string;
  noSegments: string;
  travelers: string[];
  adults: string;
  childs: string;
  infants: string;
  cabinClass: string;
  departures: string[];
  originCountries: string[];
  destinationCountries: string[];
  fromCities: string[];
  toCities: string[];
  fareType: string;
}

export async function searchFlights(input: FlightSearchInput) {
  const {
    type, noSegments, adults, childs, infants, cabinClass,
    departures, originCountries, destinationCountries, fromCities, toCities, fareType,
  } = input;

  const cacheKey = JSON.stringify(input);
  const cached = searchCache().get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const origin = fromCities.map(extractCode);
  const destination = toCities.map(extractCode);

  const settings = await moduleSetting();
  // Mirrors the Laravel reference's in_array('IN', ...) check exactly: domestic as long as ANY
  // leg's origin is IN and ANY leg's destination is IN — a mixed multi-city itinerary with just
  // one India-touching leg still goes to the domestic endpoint, even if other legs are international.
  const isDomestic =
    originCountries.includes("IN") && destinationCountries.includes("IN");
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
  const flightType = isDomestic ? "Domestic" : "International";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        emailId: settings.email_id,
        password: settings.password,
        apiKey: settings.apiKey,
        Host: settings.Host,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  } catch (err) {
    console.error(`[flightSearch] Upstream request failed for ${flightType} search (${url}):`, err);
    return { status: false, flightType, msg: "Could not reach the airline search service. Please try again.", legs: [] };
  }

  const data = await res.json().catch(() => null);

  const resultData = data?.resultData?.[0];
  if (!resultData || resultData.isFlights === "0" || resultData.isError === "true") {
    return {
      status: false,
      flightType,
      msg: resultData?.fltSchedule?.message || data?.meta?.errorMsg || "No flights found",
      legs: [],
    };
  }

  let responseData: { status: true; flightType: string; legs: unknown[] };
  try {
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

    const scid: string = fltSchedule.scid ?? "";

    // International responses have been observed to carry extra top-level metadata keys
    // (beyond the known NON_ROUTE_KEYS set) that aren't route data — skip anything that
    // isn't actually an array of flight options instead of crashing inside transformRoute.
    const legs = orderedRouteKeys
      .filter(routeKey => Array.isArray(fltSchedule[routeKey]))
      .map(routeKey => ({
        routeKey,
        flights: transformRoute(
          fltSchedule[routeKey],
          fareDetails?.[routeKey] ?? {},
          airlineNames,
          cityNames,
          scid,
        ),
      }));

    responseData = { status: true, flightType, legs };
    // TEMPORARY diagnostic — remove once the international response shape is confirmed.
    if (legs.length === 0) {
      (responseData as Record<string, unknown>)._debug = {
        allRouteKeys,
        orderedRouteKeys,
        keyTypes: Object.fromEntries(Object.keys(fltSchedule).map(k => [k, Array.isArray(fltSchedule[k]) ? "array" : typeof fltSchedule[k]])),
        sample: orderedRouteKeys[0] ? JSON.stringify(fltSchedule[orderedRouteKeys[0]]).slice(0, 1500) : null,
      };
    }
  } catch (err) {
    // Whatever shape this response has, it broke an assumption transformRoute() makes
    // (built against domestic responses) — log the raw payload so the actual mismatch is
    // visible in the server logs instead of the client just seeing a bare 500.
    console.error(
      `[flightSearch] Failed to parse ${flightType} response for ${origin.join(",")}->${destination.join(",")}:`,
      err,
      JSON.stringify(resultData).slice(0, 4000)
    );
    return {
      status: false,
      flightType,
      msg: "We couldn't process the airline's response for this route. Please try again shortly.",
      legs: [],
    };
  }

  const cache = searchCache();
  if (cache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, { data: responseData, expires: Date.now() + SEARCH_CACHE_TTL_MS });

  return responseData;
}
