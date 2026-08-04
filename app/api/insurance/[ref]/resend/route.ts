import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { fetchInsuranceBooking, buildPolicyPdf } from "@/app/lib/policyPdf";
import { sendInsuranceConfirmationEmail } from "@/app/lib/mailer";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* Re-sends the policy confirmation email (with PDF attached) for an already-issued policy —
 * pulls fresh data straight from insurance_bookings/_travellers/_payments rather than trusting
 * anything from the client. */
export async function POST(_request: Request, ctx: RouteContext<"/api/insurance/[ref]/resend">) {
  const { ref } = await ctx.params;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const data = await fetchInsuranceBooking(ref);
  if (!data) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  const { booking, travellers, totalPaid } = data;

  if (!booking.client_email) {
    return NextResponse.json({ error: "No email address on file for this policy" }, { status: 400 });
  }

  const policyPdf = (await buildPolicyPdf(ref)) ?? undefined;

  await sendInsuranceConfirmationEmail(booking.client_email, {
    policyRef: booking.ref,
    planName: booking.plan_name,
    supplier: booking.policy_provider,
    coverage: 0,
    destination: booking.coverage_area,
    startDate: fmtDate(booking.policy_start_date),
    endDate: fmtDate(booking.policy_end_date),
    travellers: travellers.map(t => ({ name: t.name, relation: t.is_lead ? "SELF" : "" })),
    totalPaid,
    proposerName: booking.client_name,
    policyPdf,
  });

  return NextResponse.json({ ok: true, email: booking.client_email });
}
