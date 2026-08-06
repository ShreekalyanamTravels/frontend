import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import razorpay from "@/app/lib/razorpay";

const bodySchema = z.object({
  amount: z.coerce.number().positive(),
});

/* Creates a Razorpay order for the exact booking total — unlike wallet top-up, no convenience
 * fee is added on top here, since `amount` already IS the fully-computed booking total. */
export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const { amount } = parsed.data;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `booking_${session.userId}_${Date.now()}`,
      notes: { userId: String(session.userId), amount: String(amount) },
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
