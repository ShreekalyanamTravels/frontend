import { buildInvoicePdf } from "@/app/lib/invoicePdf";
import { sendBookingConfirmationEmail } from "@/app/lib/mailer";

/* Fire-and-log: the booking has already succeeded by the time this runs, so a mail/PDF failure
 * here must never fail the booking request — just log it. Called after commit, since it needs
 * to re-query the just-inserted rows to render the invoice. */
export async function sendBookingConfirmation(params: {
  email: string;
  bookingId: string;
  pnr: string;
  corporateId: string;
  billToName: string;
  sectors: { originCity: string; destinationCity: string; flightDepartDateRaw: string }[];
  passengers: { firstName: string; lastName: string; type: string }[];
  totalPayableAmt: number;
}) {
  if (!params.email) return;
  try {
    const invoicePdf = (await buildInvoicePdf(params.bookingId, params.corporateId, params.billToName)) ?? undefined;
    await sendBookingConfirmationEmail(params.email, {
      bookingRef: params.bookingId,
      pnr: params.pnr,
      sectors: params.sectors.map(s => ({
        route: `${s.originCity} → ${s.destinationCity}`,
        date: s.flightDepartDateRaw,
      })),
      passengers: params.passengers.map(p => ({
        name: `${p.firstName} ${p.lastName}`.trim(),
        type: p.type,
      })),
      totalPayableAmt: params.totalPayableAmt,
      travellerName: params.billToName,
      invoicePdf,
    });
  } catch (err) {
    console.error(`Failed to send booking confirmation email for ${params.bookingId}`, err);
  }
}
