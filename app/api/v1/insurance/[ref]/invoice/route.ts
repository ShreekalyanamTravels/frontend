import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { buildInsuranceInvoicePdf } from "@/app/lib/insuranceInvoicePdf";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/insurance/[ref]/invoice">) {
  try {
    const { ref } = await ctx.params;
    const session = await requireApiAuth(request);

    const pdfBuffer = await buildInsuranceInvoicePdf(ref, String(session.userId));
    if (!pdfBuffer) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${ref}.pdf"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
