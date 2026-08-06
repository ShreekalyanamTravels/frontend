import crypto from "crypto";
import razorpay from "@/app/lib/razorpay";

// Constant-time comparison — the existing web-app routes use `!==`, which leaks timing
// information about how many leading bytes matched (a real, if narrow, side channel for
// forging a signature byte-by-byte). v1 always uses timingSafeEqual instead.
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const givenBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

// The existing web-app verify routes trust a client-submitted `amount` for how much to credit —
// a client could submit a genuinely-signed order/payment pair alongside an inflated `amount` to
// over-credit their wallet. v1 instead re-fetches the order from Razorpay's own API and treats
// its `notes` (set server-side, at create-order time, before the client ever sees the order) as
// authoritative, ignoring whatever the client claims in the verify request body. `totalPaidAmount`
// is the actual paise amount charged by Razorpay (base + convenience fee + GST, where applicable)
// — useful for sanity-checking, but the amount to credit/record always comes from `notes`.
export async function fetchAuthoritativeOrder(orderId: string): Promise<{ totalPaidAmount: number; notes: Record<string, string> }> {
  const order = await razorpay.orders.fetch(orderId);
  return {
    totalPaidAmount: Number(order.amount) / 100,
    notes: (order.notes as Record<string, string>) ?? {},
  };
}
