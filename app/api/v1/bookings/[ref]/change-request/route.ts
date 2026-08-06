import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { logBookingHistory } from "@/app/lib/bookingHistory";

interface BookingRow extends RowDataPacket {
  id: number;
  booking_id: string;
}

const bodySchema = z.object({
  requestType: z.string().min(1),
  remarks: z.string().min(1),
  sectorIds: z.array(z.number().int().positive()).optional().default([]),
  passengerIds: z.array(z.number().int().positive()).optional().default([]),
});

export async function POST(request: Request, ctx: RouteContext<"/api/v1/bookings/[ref]/change-request">) {
  try {
    const { ref } = await ctx.params;
    const session = await requireApiAuth(request);

    const userId = String(session.userId);
    const [rows] = await pool.query<BookingRow[]>(
      "SELECT id, booking_id FROM booking WHERE booking_id = ? AND (coroprate_id = ? OR vendor_id = ?) LIMIT 1",
      [ref, userId, userId]
    );
    const booking = rows[0];
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Request type and remarks are required" }, { status: 400 });
    }
    const { requestType, remarks, sectorIds, passengerIds } = parsed.data;

    await pool.query(
      `INSERT INTO change_requests (booking_id, corporate_id, request_type, sectors, passengers, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [ref, session.userId, requestType, JSON.stringify(sectorIds), JSON.stringify(passengerIds), remarks]
    );

    await logBookingHistory(
      booking.id,
      "Change Request Submitted",
      `${requestType} change request raised for booking ${booking.booking_id}: ${remarks}`,
      session.name
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
