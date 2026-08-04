import { moduleSetting } from "@/app/lib/moduleSetting";

export interface FlightPriceParams {
  /** Yatra's search-session id (fltSchedule.scid from the search response). */
  searchId: string;
  /** Comma-joined supplier codes — one per leg, same order as flightId. */
  supplierCode: string;
  /** Comma-joined Yatra flight/fare ids — one per leg. */
  flightId: string;
  /** Combined ADT fare across every leg being priced. */
  price: number;
  isDomestic: boolean;
}

/* Mirrors Laravel's flightDetail() helper — re-checks live pricing/availability for the exact
 * flight(s) selected on results, against Yatra's `.../price` endpoint (a different endpoint from
 * `.../search`). Called once per booking with every leg's flightId/supplierCode comma-joined,
 * same as the reference implementation's combined `flightIdCSV`/`sc`. */
export async function fetchFlightPrice(p: FlightPriceParams): Promise<unknown> {
  const settings = await moduleSetting();
  const baseUrl = p.isDomestic
    ? `${settings.yatra_api_url}/flightsapi/air-service/b2bdomapi/price`
    : `${settings.yatra_api_url}/flightsapi/air-service/b2bint/price`;

  // Raw string concatenation (not URLSearchParams), matching the search route's convention —
  // the upstream API expects these ids/values unencoded.
  const parts = [
    `searchId=${p.searchId}`,
    `msid=${p.searchId}`,
    `mode=Instant`,
    `sc=${p.supplierCode}`,
    `flightIdCSV=${p.flightId}`,
    `flightPrice=${p.price}`,
    `bpc=true`,
    `isSR=false`,
  ];
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

  return res.json().catch(() => null);
}
