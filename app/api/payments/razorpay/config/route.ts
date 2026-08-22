import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { getSystemSettings } from "@/app/lib/systemSettings";

// Same reasoning as /app-config: the enabled flag is an ops toggle that must take effect
// immediately, so this must never be statically prerendered or CDN-cached.
export const dynamic = "force-dynamic";

const DEFAULTS = {
  enabled: true,
  currency: "INR",
  companyName: "Shree Kalyanam",
  themeColor: "#f07820",
  logo: "https://corporate.shreekalyanam.com/assets/logo.png",
};

const KEYS = [
  "app_razorpay_enabled",
  "app_branding_primary_color",
  "company_name",
  "app_branding_logo_url",
];

// Session-cookie counterpart of /api/v1/payments/razorpay/config — same response shape, for the
// corporate web app's own Razorpay checkout popups (payment-details, online-payment,
// insurance/payment) to source their name/image/theme.color from instead of hardcoding them.
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = await getSystemSettings(KEYS);
  const enabledRow = settings.get("app_razorpay_enabled");

  return NextResponse.json(
    {
      enabled: enabledRow ? enabledRow.status === 1 : DEFAULTS.enabled,
      keyId: process.env.RAZORPAY_KEY_ID ?? "",
      currency: DEFAULTS.currency,
      companyName: settings.get("company_name")?.value ?? DEFAULTS.companyName,
      themeColor: settings.get("app_branding_primary_color")?.value ?? DEFAULTS.themeColor,
      logo: settings.get("app_branding_logo_url")?.value ?? DEFAULTS.logo,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
