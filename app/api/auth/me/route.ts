import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";

interface MobileRow extends RowDataPacket {
  mobile: string | null;
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ user: null });

  // The session JWT doesn't carry mobile (added after tokens were already being issued) — read
  // it fresh from the DB each time instead of forcing every logged-in user to re-login.
  const [rows] = await pool.query<MobileRow[]>("SELECT mobile FROM users WHERE id = ? LIMIT 1", [payload.userId]);
  const mobile = rows[0]?.mobile ?? null;

  return NextResponse.json({ user: { ...payload, mobile } });
}
