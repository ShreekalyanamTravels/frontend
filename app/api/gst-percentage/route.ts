import { NextResponse } from "next/server";
import { moduleSetting } from "@/app/lib/moduleSetting";

/* The single current GST rate (module_setting.gst_percentage) — used wherever GST needs to be
 * shown/computed on a fee that isn't itself tied to the flight service-fee lookup (e.g. GST on
 * the wallet recharge convenience fee). Flight booking pages get this bundled into
 * /api/service-fee's response instead, since they already call that per fare leg. */
export async function GET() {
  const settings = await moduleSetting().catch(() => null);
  return NextResponse.json({ gstPercentage: settings?.gst_percentage ?? 18 });
}
