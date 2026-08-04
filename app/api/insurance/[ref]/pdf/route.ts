import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { buildPolicyPdf } from "@/app/lib/policyPdf";

export async function GET(_request: Request, ctx: RouteContext<"/api/insurance/[ref]/pdf">) {
  const { ref } = await ctx.params;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pdfBuffer = await buildPolicyPdf(ref);
  if (!pdfBuffer) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Policy-${ref}.pdf"`,
    },
  });
}
