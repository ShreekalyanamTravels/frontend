import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { createBookingRecord, parseBookingRequest } from "@/app/lib/createBooking";
import { sendBookingConfirmation } from "@/app/lib/sendBookingConfirmation";
import { reviewBookingIfEnabled } from "@/app/lib/reviewBooking";

const MODE_ID: Record<string, string> = { upi: "1", netbanking: "2", credit: "3", debit: "4" };

/* Verifies the Razorpay payment signature, then records the booking as ticketed. Mirrors
 * /api/payments/razorpay/verify's HMAC check, but on success creates a `booking` (via the shared
 * createBookingRecord helper) instead of crediting the wallet. */
export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode, booking } = body as {
    razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string;
    mode?: string; booking?: unknown;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const input = parseBookingRequest(booking);
  if (!input) {
    return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { bookingId } = await createBookingRecord(conn, {
      ...input,
      corporateId: String(session.userId),
      paymentModeId: MODE_ID[mode ?? ""] ?? "3",
      transactionId: razorpay_payment_id,
    });

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
