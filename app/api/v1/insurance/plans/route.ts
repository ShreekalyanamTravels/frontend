import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getInsurancePlans } from "@/app/lib/insurancePlans";

function isValidDateString(s: string): boolean {
  return s === "" || !Number.isNaN(new Date(s).getTime());
}

const querySchema = z.object({
  type: z.string().optional().default(""),
  dest: z.string().optional().default("Worldwide"),
  dep: z.string().optional().default("").refine(isValidDateString, "invalid dep date"),
  ret: z.string().optional().default("").refine(isValidDateString, "invalid ret date"),
  dob: z.string().optional().default("").refine(isValidDateString, "invalid dob date"),
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    type: sp.get("type") ?? undefined,
    dest: sp.get("dest") ?? undefined,
    dep: sp.get("dep") ?? undefined,
    ret: sp.get("ret") ?? undefined,
    dob: sp.get("dob") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const result = await getInsurancePlans(parsed.data);
  return NextResponse.json(result);
}
