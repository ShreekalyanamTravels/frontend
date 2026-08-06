import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

// Scoped to /api/v1/** only (see config.matcher below) — the existing app/api/** routes used by
// the web app are untouched by this file.
//
// This API is for the native mobile app, which doesn't enforce CORS at all, so in production no
// Access-Control-Allow-Origin is needed there. But the Expo web preview (a browser) does enforce
// CORS during local development, so we reflect the origin back only when it's localhost or a
// private-LAN address on the Expo dev server's port (8081) — DHCP reassigns that IP, so this is a
// pattern match rather than a fixed allowlist. Any other origin (a random website, or a public web
// dashboard pointed at this API later) still gets no CORS headers and can't read the response.
const DEV_ORIGIN_PATTERN =
  /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):8081$/;

function corsHeaders(origin: string | null): HeadersInit {
  if (!origin || !DEV_ORIGIN_PATTERN.test(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

// Coarse first line of defense in front of the stricter per-route limits (e.g. login) applied
// inside individual route handlers.
const GLOBAL_LIMIT = 120;
const GLOBAL_WINDOW_MS = 60_000;

export function proxy(request: NextRequest) {
  const cors = corsHeaders(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // Reverse proxies that terminate TLS set this header; only reject an explicit "http" — if the
  // header is simply absent (no reverse proxy in front, e.g. local `next start`), don't block.
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") === "http") {
    return NextResponse.json({ error: "HTTPS is required" }, { status: 400, headers: cors });
  }

  const ip = clientIp(request);
  const { allowed, resetAt } = rateLimit(`global:${ip}`, GLOBAL_LIMIT, GLOBAL_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { ...cors, "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    );
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: "/api/v1/:path*",
};
