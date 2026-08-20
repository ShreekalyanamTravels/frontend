import { NextResponse } from "next/server";
import { getSystemSettings } from "@/app/lib/systemSettings";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";

// Same reasoning as /app-config: the enabled flag is an ops toggle that must take effect
// immediately, so this must never be statically prerendered or CDN-cached.
export const dynamic = "force-dynamic";

const DEFAULTS = {
  enabled: true,
  currency: "INR",
  companyName: "Shree Kalyanam",
  themeColor: "#f07820",
};

const KEYS = [
  "app_razorpay_enabled",
  "app_branding_primary_color",
  "app_name",
];

// Requires a logged-in session (like the other /payments/razorpay/* routes). Returns key_id
// (Razorpay's public key — safe to expose, it's what Checkout.js/SDKs use to open the payment
// modal) plus display config. Never returns key_secret: that's a server-only credential that
// authenticates server-to-server calls to Razorpay's API (create/refund orders, read transaction
// history) — order creation and payment verification already happen server-side via
// app/lib/razorpay.ts and razorpayVerify.ts, so the client never needs it.
export async function GET(request: Request) {
  try {
    await requireApiAuth(request);

    const settings = await getSystemSettings(KEYS);
    const enabledRow = settings.get("app_razorpay_enabled");

    return NextResponse.json(
      {
        enabled: enabledRow ? enabledRow.status === 1 : DEFAULTS.enabled,
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
        currency: DEFAULTS.currency,
        companyName: settings.get("app_name")?.value ?? DEFAULTS.companyName,
        themeColor: settings.get("app_branding_primary_color")?.value ?? DEFAULTS.themeColor,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
