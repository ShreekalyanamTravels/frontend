import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { createBookingRecord, parseBookingRequest } from "@/app/lib/createBooking";
import { sendBookingConfirmation } from "@/app/lib/sendBookingConfirmation";
import { reviewBookingIfEnabled } from "@/app/lib/reviewBooking";
import { chargeWallet, InsufficientFundsError } from "@/app/lib/wallet";

/* Pays for a booking out of the corporate's Credit Pool (Main Balance first, then OD — see
 * app/lib/wallet.ts) and records the booking as ticketed. No external gateway involved — this
 * only touches our own DB. */
export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const input = parseBookingRequest(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const { bookingId } = await createBookingRecord(conn, {
      ...input,
      corporateId: String(session.userId),
      paymentModeId: "5", // Creditpool
      transactionId: `CREDITPOOL-${stamp}`,
    });

    try {
      await chargeWallet(conn, session.userId, input.totalPayableAmt, {
        bookingId,
        description: `Flight Booking Deduction - Booking ID: ${bookingId}`,
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await conn.rollback();
        return NextResponse.json({ error: "Insufficient Credit Pool Balance" }, { status: 400 });
      }
      throw err;
    }

    await conn.commit();

    await reviewBookingIfEnabled(bookingId);
    await sendBookingConfirmation({
      email: input.email,
      bookingId, pnr: null,
      corporateId: String(session.userId),
      billToName: session.name,
      sectors: input.sectors,
      passengers: input.passengers,
      totalPayableAmt: input.totalPayableAmt,
    });

    return NextResponse.json({ ref: bookingId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
