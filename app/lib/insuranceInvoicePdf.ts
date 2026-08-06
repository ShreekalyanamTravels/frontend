import { renderToBuffer } from "@react-pdf/renderer";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { fetchInsuranceBooking } from "@/app/lib/policyPdf";
import { InsuranceInvoiceDocument } from "@/app/lib/insuranceInvoice";

interface GstRow extends RowDataPacket {
  c_gst: string | null;
}

const TYPE_LABEL: Record<string, string> = { Adult: "Adult", Child: "Child" };

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* Renders the tax invoice PDF for a given insurance policy ref. Returns null if the ref doesn't
 * exist. Shared query layer with buildPolicyPdf (fetchInsuranceBooking), so both PDFs stay
 * consistent with the same underlying data. */
export async function buildInsuranceInvoicePdf(ref: string, corporateUserId?: string): Promise<Buffer | null> {
  const data = await fetchInsuranceBooking(ref);
  if (!data) return null;
  const { booking, travellers, totalPaid } = data;

  let billToGst: string | null = null;
  if (corporateUserId) {
    const [rows] = await pool.query<GstRow[]>("SELECT c_gst FROM users WHERE id = ? LIMIT 1", [corporateUserId]);
    billToGst = rows[0]?.c_gst ?? null;
  }

  const gstPercent = 18;
  const basePremium = Math.round(totalPaid / (1 + gstPercent / 100));
  const gstAmount = totalPaid - basePremium;

  const pdfBuffer = await renderToBuffer(
    InsuranceInvoiceDocument({
      invoiceNo: `INV-${booking.ref}`,
      invoiceDate: fmtDate(booking.created_at ?? booking.booking_date),
      policyNo: booking.policy_number || booking.ref,
      billToName: booking.client_name,
      billToPhone: booking.client_phone,
      billToGst,
      insurer: booking.policy_provider,
      planName: booking.plan_name,
      travellers: travellers.map(t => ({
        name: t.name,
        type: TYPE_LABEL[t.type] ?? t.type,
        dob: fmtDate(t.dob),
      })),
      basePremium,
      gstAmount,
      gstPercent,
      totalPayableAmt: totalPaid,
    })
  );

  return pdfBuffer;
}
