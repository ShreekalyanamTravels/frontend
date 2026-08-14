import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSystemSettingValue } from "@/app/lib/systemSettings";

const querySchema = z.object({
  key: z.string().trim().min(1),
});

// Public, read-only lookup of a single system_settings value by key — e.g. company_name,
// app_logo — for client components (like CorpFooter) that have no server-side wrapper to fetch
// this for them at render time. Not authenticated: these are display-only, non-sensitive values.
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ key: request.nextUrl.searchParams.get("key") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const value = await getSystemSettingValue(parsed.data.key);
  return NextResponse.json({ value });
}
