import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { buildInvoicePdf } from "@/app/lib/invoicePdf";

export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[ref]/invoice">) {
  const { ref } = await ctx.params;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
}
