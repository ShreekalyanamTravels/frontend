import Razorpay from "razorpay";
import { getConvenienceFee } from "@/app/lib/convenienceFee";
import { moduleSetting } from "@/app/lib/moduleSetting";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
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
