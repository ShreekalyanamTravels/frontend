import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import razorpay, { computeFees } from "@/app/lib/razorpay";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { amount, paymentMode } = await request.json();
  const numAmount = Number(amount);

  if (!numAmount || numAmount < 100) {
    return NextResponse.json({ error: "Minimum amount is Rs. 100" }, { status: 400 });
  }
  if (!paymentMode) {
    return NextResponse.json({ error: "Missing paymentMode" }, { status: 400 });
  }

  const { convenienceFee, gst, total } = await computeFees(numAmount, String(paymentMode));

  const order = await razorpay.orders.create({
    amount: Math.round(total * 100), // paise
    currency: "INR",
    receipt: `topup_${session.userId}_${Date.now()}`,
    notes: { userId: String(session.userId), amount: String(numAmount) },
  });

  return NextResponse.json({
    orderId: order.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    amount: numAmount,
    convenienceFee,
    gst,
    total,
  });
}
