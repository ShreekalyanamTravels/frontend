import { NextRequest, NextResponse } from "next/server";
import { moduleSetting } from "@/app/lib/moduleSetting";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var _searchCityCacheV1: Map<string, { data: unknown; expires: number }> | undefined;
}

const cache = global._searchCityCacheV1 ?? new Map<string, { data: unknown; expires: number }>();
global._searchCityCacheV1 = cache;

export async function GET(request: NextRequest) {
  const key = (request.nextUrl.searchParams.get("key") ?? "").trim().toLowerCase();

  if (!key) {
    return NextResponse.json({ airports: [], nearbyAirports: [] });
  }

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const settings = await moduleSetting();
  const res = await fetch(
    `${settings.yatra_api_url}/flightsapi/nearby-service/autoSuggest?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      headers: {
        emailId: settings.email_id,
        password: settings.password,
        apiKey: settings.apiKey,
        Host: settings.Host,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ airports: [], nearbyAirports: [] });
  }

  const data = await res.json();
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json(data);
}
