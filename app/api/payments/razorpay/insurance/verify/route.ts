import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { parseInsuranceRequest } from "@/app/lib/insuranceRequest";
import { createInsuranceBookingRecord } from "@/app/lib/createInsuranceBooking";
import { sendInsuranceConfirmation } from "@/app/lib/sendInsuranceConfirmation";
import { issueInsurancePolicyIfEnabled } from "@/app/lib/issueInsurancePolicy";

const MODE_LABEL: Record<string, string> = { upi: "UPI", netbanking: "Net Banking", credit: "Credit Card", debit: "Debit Card" };

/* Verifies the Razorpay payment signature for an insurance purchase — mirrors
 * /api/payments/razorpay/booking/verify's HMAC check, then records the policy via the shared
 * createInsuranceBookingRecord helper instead of creating a flight booking record. */
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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode } = body as {
    razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string; mode?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const input = parseInsuranceRequest(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid insurance purchase details" }, { status: 400 });
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

    const { ref, bookingId } = await createInsuranceBookingRecord(conn, input, {
      createdByName: session.name,
      paymentMode: MODE_LABEL[mode ?? ""] ?? "Card",
      transactionId: razorpay_payment_id,
    });

    await conn.commit();

    // Issue with Bajaj (if enabled) before emailing, so the confirmation email/PDF/policy_number
    // already reflect the real policy number instead of the internal ref placeholder.
    const policyNumber = await issueInsurancePolicyIfEnabled(input, bookingId, ref);
    await sendInsuranceConfirmation(ref, input, session.name);

    return NextResponse.json({ ref, policyNumber });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
