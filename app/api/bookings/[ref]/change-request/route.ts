import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { logBookingHistory } from "@/app/lib/bookingHistory";

interface BookingRow extends RowDataPacket {
  id: number;
  booking_id: string;
}

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[ref]/change-request">) {
  const { ref } = await ctx.params;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = String(session.userId);
  const [rows] = await pool.query<BookingRow[]>(
    "SELECT id, booking_id FROM booking WHERE booking_id = ? AND (coroprate_id = ? OR vendor_id = ?) LIMIT 1",
    [ref, userId, userId]
  );
  const booking = rows[0];
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { requestType, remarks, sectorIds, passengerIds } = await request.json();

  if (!requestType || !remarks) {
    return NextResponse.json({ error: "Request type and remarks are required" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO change_requests (booking_id, corporate_id, request_type, sectors, passengers, remarks, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      ref,
      session.userId,
      requestType,
      JSON.stringify(sectorIds ?? []),
      JSON.stringify(passengerIds ?? []),
      remarks,
    ]
  );

  await logBookingHistory(
    booking.id,
    "Change Request Submitted",
    `${requestType} change request raised for booking ${booking.booking_id}: ${remarks}`,
    session.name
  );

  return NextResponse.json({ ok: true });
}
