import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import razorpay, { computeFees } from "@/app/lib/razorpay";

const bodySchema = z.object({
  amount: z.coerce.number().min(100),
  paymentMode: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Minimum amount is Rs. 100 and paymentMode is required" }, { status: 400 });
    }
    const { amount, paymentMode } = parsed.data;

    const { convenienceFee, gst, total } = await computeFees(amount, paymentMode);

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: "INR",
      receipt: `topup_${session.userId}_${Date.now()}`,
      notes: { userId: String(session.userId), amount: String(amount) },
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      convenienceFee,
      gst,
      total,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
