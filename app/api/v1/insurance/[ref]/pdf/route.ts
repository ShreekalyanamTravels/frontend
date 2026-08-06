import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { buildPolicyPdf } from "@/app/lib/policyPdf";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/insurance/[ref]/pdf">) {
  try {
    const { ref } = await ctx.params;
    await requireApiAuth(request);

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
  } catch (err) {
    return apiErrorResponse(err);
  }
}
