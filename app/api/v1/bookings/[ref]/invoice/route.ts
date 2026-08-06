import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { buildInvoicePdf } from "@/app/lib/invoicePdf";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/bookings/[ref]/invoice">) {
  try {
    const { ref } = await ctx.params;
    const session = await requireApiAuth(request);

    const pdfBuffer = await buildInvoicePdf(ref, String(session.userId), session.name);
    if (!pdfBuffer) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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
