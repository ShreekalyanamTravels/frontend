import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";

interface ProfileRow extends RowDataPacket {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  mobile: string | null;
  type: string | null;
  status: "Active" | "Inactive";
  created_at: string | null;
  c_name: string | null;
  c_gst: string | null;
  c_pan: string | null;
  c_address: string | null;
  c_state: string | null;
  c_pincode: number | string | null;
}

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const [rows] = await pool.query<ProfileRow[]>(
      `SELECT id, first_name, last_name, email, mobile, type, status, created_at,
              c_name, c_gst, c_pan, c_address, c_state, c_pincode
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [session.userId]
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        email: row.email,
        mobile: row.mobile ?? "",
        accountType: row.type ?? "",
        status: row.status,
        corporateId: String(row.id),
        createdAt: row.created_at,
        companyName: row.c_name ?? "",
        gstNumber: row.c_gst ?? "",
        panNumber: row.c_pan ?? "",
        address: row.c_address ?? "",
        state: row.c_state ?? "",
        pincode: row.c_pincode != null ? String(row.c_pincode) : "",
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
