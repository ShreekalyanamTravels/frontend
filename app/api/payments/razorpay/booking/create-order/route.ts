import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import razorpay from "@/app/lib/razorpay";

/* Creates a Razorpay order for the exact booking total — unlike wallet top-up, no convenience
 * fee is added on top here, since `amount` already IS the fully-computed booking total. */
export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { amount } = await request.json().catch(() => ({}));
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const order = await razorpay.orders.create({
    amount: Math.round(numAmount * 100), // paise
    currency: "INR",
    receipt: `booking_${session.userId}_${Date.now()}`,
    notes: { userId: String(session.userId), amount: String(numAmount) },
  });

  return NextResponse.json({
    orderId: order.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    amount: numAmount,
  });
}
