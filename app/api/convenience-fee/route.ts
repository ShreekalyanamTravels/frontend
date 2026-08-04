import { NextRequest, NextResponse } from "next/server";
import { getConvenienceFee } from "@/app/lib/convenienceFee";

/* Called from the flight booking flow (payment-details) whenever the traveller changes payment
 * mode, and from the wallet recharge flow (online-payment). See app/lib/convenienceFee.ts for the
 * lookup/fallback logic shared by both. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const paymentMode = sp.get("paymentMode");
  const sector = sp.get("sector");
  const amount = Number(sp.get("amount"));

  if (!paymentMode || !sector || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Missing paymentMode, sector or amount" }, { status: 400 });
  }

  const convenienceFee = await getConvenienceFee(paymentMode, sector, amount);
  return NextResponse.json({ convenienceFee });
}
