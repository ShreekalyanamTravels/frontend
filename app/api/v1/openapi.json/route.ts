import { NextResponse } from "next/server";
import { openApiSpec } from "@/app/lib/openapiSpec";

// Derives the server URL from whatever host actually served this request (localhost during dev,
// a LAN IP when testing from a physical phone, the real domain in production) instead of a
// hardcoded value that would go stale the moment you test from anywhere but this one machine.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    ...openApiSpec,
    servers: [{ url: `${origin}/api/v1` }],
  });
}
