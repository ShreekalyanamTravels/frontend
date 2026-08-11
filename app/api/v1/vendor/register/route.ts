import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

// Public registration endpoint for the separate vendor.shreekalyanam.com site — cross-origin, no
// bearer auth, so origin is the only gate. Locked to exactly this one origin rather than a
// wildcard/allowlist since there's currently only one caller; widen ALLOWED_ORIGIN if more vendor
// front-ends need to call this later. Origin/CORS only makes sense for a browser-issued request —
// if vendor.shreekalyanam.com ends up calling this server-to-server instead, swap this for a
// shared API key check, since a server-to-server client won't reliably send an Origin header.
const ALLOWED_ORIGIN = "https://vendor.shreekalyanam.com";

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (origin !== ALLOWED_ORIGIN) return null;
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request) {
  const headers = corsHeaders(request.headers.get("origin"));
  if (!headers) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers });
}

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
  mobile: z.string().trim().min(6).max(20),
  companyName: z.string().trim().max(255).optional(),
  gstNumber: z.string().trim().max(50).optional(),
  panNumber: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional(),
});

interface ExistingUserRow extends RowDataPacket {
  id: number;
}

function isDuplicateEmailError(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ER_DUP_ENTRY";
}

// New vendor accounts land Inactive — same gate app/api/auth/login/route.ts already enforces
// (`user.status !== "Active"` blocks login), so self-registered vendors can't sign in until an
// admin approves them from the admin panel. type='Vendor' tags the account's origin/category,
// mirroring how `type` is already surfaced elsewhere as `accountType` (see app/api/profile).
const NEW_ACCOUNT_STATUS = "Inactive";
const NEW_ACCOUNT_TYPE = "Vendor";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!headers) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  // Keyed on IP only (no email yet at this point in a bad-body case) — registration has no
  // legitimate reason to be called dozens of times a minute from one IP.
  const { allowed } = rateLimit(`vendor-register:${clientIp(request)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400, headers }
    );
  }
  const f = parsed.data;

  const [existing] = await pool.query<ExistingUserRow[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [f.email]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409, headers });
  }

  const passwordHash = await bcrypt.hash(f.password, 10);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users
        (first_name, last_name, email, password, mobile, type, status,
         c_name, c_gst, c_pan, c_address, c_state, c_pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.firstName, f.lastName, f.email, passwordHash, f.mobile, NEW_ACCOUNT_TYPE, NEW_ACCOUNT_STATUS,
        f.companyName ?? null, f.gstNumber ?? null, f.panNumber ?? null,
        f.address ?? null, f.state ?? null, f.pincode ?? null,
      ]
    );
    return NextResponse.json(
      { id: result.insertId, status: NEW_ACCOUNT_STATUS },
      { status: 201, headers }
    );
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409, headers });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500, headers });
  }
}
