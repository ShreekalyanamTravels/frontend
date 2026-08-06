import Razorpay from "razorpay";
import { getConvenienceFee } from "@/app/lib/convenienceFee";
import { moduleSetting } from "@/app/lib/moduleSetting";

// Razorpay's constructor throws synchronously if key_id/key_secret are missing — building this
// eagerly at module scope meant just *importing* this file (e.g. while Next collects page data
// during `next build`) crashed the build whenever those env vars weren't present at build time,
// even for routes that never actually call Razorpay. Deferring construction to first use means
// the throw only happens if/when a request actually needs it, at runtime, with real env vars
// loaded — every existing call site (`razorpay.orders.create(...)`, `.orders.fetch(...)`, etc.)
// keeps working unchanged since the proxy forwards property access to the lazily-built instance.
let _instance: Razorpay | null = null;
function getInstance(): Razorpay {
  if (!_instance) {
    _instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _instance;
}

const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});

export default razorpay;

/* Same dynamic convenience-fee + GST-on-convenience-fee logic as the flight booking flow
 * (convenience_fee table keyed by payment_mode + sector, GST rate from module_setting) — the
 * wallet recharge flow has no real "sector" of its own, so it always uses 'O' (the only sector
 * the corporate sales channel actually has convenience_fee rows for, same fallback the flight
 * flow already relies on). */
export async function computeFees(amount: number, paymentMode: string, sector: string = "O") {
  const convenienceFee = await getConvenienceFee(paymentMode, sector, amount);
  const settings = await moduleSetting().catch(() => null);
  const gstPercentage = settings?.gst_percentage ?? 18;
  const gst = Math.round((convenienceFee * gstPercentage) / 100);
  const total = amount + convenienceFee + gst;
  return { convenienceFee, gst, gstPercentage, total };
}
