import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { createBookingRecord, parseBookingRequest } from "@/app/lib/createBooking";
import { sendBookingConfirmation } from "@/app/lib/sendBookingConfirmation";
import { reviewBookingIfEnabled } from "@/app/lib/reviewBooking";
import { verifyRazorpaySignature, fetchAuthoritativeOrder } from "@/app/lib/razorpayVerify";

const MODE_ID: Record<string, string> = { upi: "1", netbanking: "2", credit: "3", debit: "4" };
const AMOUNT_TOLERANCE = 1; // rupees — absorbs paise-rounding, not a meaningful gap either way

interface ExistingBooking extends RowDataPacket {
  booking_id: string;
}

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  mode: z.string().optional(),
  booking: z.unknown(),
});

/* Verifies the Razorpay payment signature, then records the booking as ticketed. Mirrors
 * /api/payments/razorpay/verify's HMAC check, but on success creates a `booking` (via the shared
 * createBookingRecord helper) instead of crediting the wallet. */
export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode, booking } = parsed.data;

    const input = parseBookingRequest(booking);
    if (!input) {
      return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Cross-check what was actually charged via Razorpay against what the client claims the
    // booking costs — the two are otherwise never compared, so nothing stops a client from
    // paying a small amount and submitting an unrelated, much larger totalPayableAmt.
    const { totalPaidAmount, notes } = await fetchAuthoritativeOrder(razorpay_order_id);
    if (notes.userId !== String(session.userId)) {
      return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
    }
    if (Math.abs(totalPaidAmount - input.totalPayableAmt) > AMOUNT_TOLERANCE) {
      return NextResponse.json({ error: "Paid amount does not match booking total" }, { status: 400 });
    }

    // Idempotency: a replayed verify call for the same payment must not create a duplicate booking.
    const [existing] = await pool.query<ExistingBooking[]>(
      "SELECT booking_id FROM booking WHERE transaction_id = ? LIMIT 1",
      [razorpay_payment_id]
    );
    if (existing[0]) {
      return NextResponse.json({ ref: existing[0].booking_id });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { bookingId, pnr } = await createBookingRecord(conn, {
        ...input,
        corporateId: String(session.userId),
        paymentModeId: MODE_ID[mode ?? ""] ?? "3",
        transactionId: razorpay_payment_id,
      });

      await conn.commit();

      await reviewBookingIfEnabled(bookingId);
      await sendBookingConfirmation({
        email: input.email,
        bookingId, pnr,
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
  } catch (err) {
    return apiErrorResponse(err);
  }
}
