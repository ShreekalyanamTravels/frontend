import { NextResponse } from "next/server";
import { moduleSetting } from "@/app/lib/moduleSetting";

export async function GET() {
  const settings = await moduleSetting().catch(() => null);
  return NextResponse.json({ gstPercentage: settings?.gst_percentage ?? 18 });
}
