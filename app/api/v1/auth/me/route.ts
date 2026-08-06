import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";

interface MobileRow extends RowDataPacket {
  mobile: string | null;
  status: "Active" | "Inactive";
}

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);

    // The access-token JWT doesn't carry `mobile`/`status` — read them fresh from the DB each
    // time instead of forcing every logged-in user to re-login when a field was added (mirrors
    // app/api/auth/me).
    const [rows] = await pool.query<MobileRow[]>("SELECT mobile, status FROM users WHERE id = ? LIMIT 1", [session.userId]);
    const mobile = rows[0]?.mobile ?? null;
    const status = rows[0]?.status ?? null;

    return NextResponse.json({ user: { ...session, mobile, status } });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
