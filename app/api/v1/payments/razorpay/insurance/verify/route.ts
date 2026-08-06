import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { parseInsuranceRequest } from "@/app/lib/insuranceRequest";
import { createInsuranceBookingRecord } from "@/app/lib/createInsuranceBooking";
import { sendInsuranceConfirmation } from "@/app/lib/sendInsuranceConfirmation";
import { issueInsurancePolicyIfEnabled } from "@/app/lib/issueInsurancePolicy";
import { verifyRazorpaySignature, fetchAuthoritativeOrder } from "@/app/lib/razorpayVerify";

const MODE_LABEL: Record<string, string> = { upi: "UPI", netbanking: "Net Banking", credit: "Credit Card", debit: "Debit Card" };
const AMOUNT_TOLERANCE = 1; // rupees — absorbs paise-rounding, not a meaningful gap either way

interface ExistingPayment extends RowDataPacket {
  ref: string;
}

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  mode: z.string().optional(),
}).passthrough();

/* Verifies the Razorpay payment signature for an insurance purchase — mirrors
 * /api/v1/payments/razorpay/booking/verify's checks, then records the policy via the shared
 * createInsuranceBookingRecord helper instead of creating a flight booking record. */
export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode } = parsed.data;

    const input = parseInsuranceRequest(body);
    if (!input) {
      return NextResponse.json({ error: "Invalid insurance purchase details" }, { status: 400 });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const { totalPaidAmount, notes } = await fetchAuthoritativeOrder(razorpay_order_id);
    if (notes.userId !== String(session.userId)) {
      return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
    }
    if (Math.abs(totalPaidAmount - input.amount) > AMOUNT_TOLERANCE) {
      return NextResponse.json({ error: "Paid amount does not match policy premium" }, { status: 400 });
    }

    // Idempotency: a replayed verify call for the same payment must not create a duplicate policy.
    const [existing] = await pool.query<ExistingPayment[]>(
      `SELECT ib.ref AS ref FROM insurance_payments ip
       JOIN insurance_bookings ib ON ib.id = ip.insurance_booking_id
       WHERE ip.txn_id = ? LIMIT 1`,
      [razorpay_payment_id]
    );
    if (existing[0]) {
      return NextResponse.json({ ref: existing[0].ref });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { ref, bookingId } = await createInsuranceBookingRecord(conn, input, {
        createdByName: session.name,
        paymentMode: MODE_LABEL[mode ?? ""] ?? "Card",
        transactionId: razorpay_payment_id,
      });

      await conn.commit();

      const policyNumber = await issueInsurancePolicyIfEnabled(input, bookingId, ref);
      await sendInsuranceConfirmation(ref, input, session.name);

      return NextResponse.json({ ref, policyNumber });
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
