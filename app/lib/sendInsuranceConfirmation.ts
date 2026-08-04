import { sendInsuranceConfirmationEmail } from "@/app/lib/mailer";
import { buildPolicyPdf, fetchInsuranceBooking } from "@/app/lib/policyPdf";
import type { InsuranceRequestInput } from "@/app/lib/insuranceRequest";

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* Fire-and-log: the policy purchase has already succeeded (and the DB rows committed) by the
 * time this runs, so a mail/PDF failure here must never fail the payment request — just log it. */
export async function sendInsuranceConfirmation(policyRef: string, input: InsuranceRequestInput, proposerName?: string) {
  if (!input.proposer.email) return;
  try {
    const [booking, policyPdf] = await Promise.all([
      fetchInsuranceBooking(policyRef),
      buildPolicyPdf(policyRef).then(pdf => pdf ?? undefined),
    ]);
    await sendInsuranceConfirmationEmail(input.proposer.email, {
      policyRef,
      policyNumber: booking?.booking.policy_number || undefined,
      planName: input.planName,
      supplier: input.supplier,
      coverage: input.coverage,
      destination: input.dest,
      startDate: fmtDate(input.dep),
      endDate: fmtDate(input.ret),
      travellers: input.travellers.map(t => ({
        name: [t.title, t.firstName, t.lastName].filter(Boolean).join(" ") || "Traveller",
        relation: t.relationship,
      })),
      totalPaid: input.amount,
      proposerName,
      policyPdf,
    });
  } catch (err) {
    console.error(`Failed to send insurance confirmation email for ${policyRef}`, err);
  }
}
