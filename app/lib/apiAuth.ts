import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

// Bearer access tokens for /api/v1/** carry `scope: "v1-access"` so a stolen web-session cookie
// JWT (app/lib/auth.ts) can't be replayed as a mobile bearer token, and vice versa — both are
// signed with the same AUTH_SECRET but are not interchangeable.
const ACCESS_TOKEN_SCOPE = "v1-access";
const ACCESS_TOKEN_TTL = "15m";

export interface AccessTokenPayload {
  userId: number;
  email: string;
  name: string;
  corporateId: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload, scope: ACCESS_TOKEN_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.scope !== ACCESS_TOKEN_SCOPE) return null;
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function requireApiAuth(request: Request): Promise<AccessTokenPayload> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) throw new ApiError(401, "Not authenticated");

  const payload = await verifyAccessToken(token);
  if (!payload) throw new ApiError(401, "Invalid or expired access token");
  return payload;
}

// Never leak internals (stack traces, SQL errors) to a public mobile client — anything that
// isn't a deliberately-thrown ApiError collapses to a generic 500.
export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
