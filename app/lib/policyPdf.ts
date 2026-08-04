import { renderToBuffer } from "@react-pdf/renderer";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { PolicyDocument } from "@/app/lib/policyDocument";

export interface InsuranceBookingRow extends RowDataPacket {
  id: number;
  ref: string;
  policy_number: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  policy_provider: string;
  plan_name: string;
  coverage_area: string;
  policy_start_date: string | null;
  policy_end_date: string | null;
  premium_per_pax: string;
  gst_percent: string;
  booking_date: string;
  created_at: string;
}

interface TravellerRow extends RowDataPacket {
  name: string;
  type: string;
  dob: string | null;
  passport_no: string | null;
  is_lead: number;
}

interface PaymentRow extends RowDataPacket {
  amount: string;
}

const TYPE_LABEL: Record<string, string> = { Adult: "Adult", Child: "Child" };

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* Looks up an insurance policy by ref. Shared by the fetch-for-display route, the PDF-download
 * route, and email sending (initial confirmation + resend), so all three read the same rows. */
export async function fetchInsuranceBooking(ref: string): Promise<{
  booking: InsuranceBookingRow;
  travellers: TravellerRow[];
  totalPaid: number;
} | null> {
  const [rows] = await pool.query<InsuranceBookingRow[]>(
    `SELECT id, ref, policy_number, client_name, client_phone, client_email, policy_provider, plan_name,
            coverage_area, policy_start_date, policy_end_date, premium_per_pax, gst_percent,
            booking_date, created_at
     FROM insurance_bookings WHERE ref = ? LIMIT 1`,
    [ref]
  );
  const booking = rows[0];
  if (!booking) return null;

  const [travellers] = await pool.query<TravellerRow[]>(
    "SELECT name, type, dob, passport_no, is_lead FROM insurance_travellers WHERE insurance_booking_id = ? ORDER BY sno ASC",
    [booking.id]
  );

  const [payments] = await pool.query<PaymentRow[]>(
    "SELECT amount FROM insurance_payments WHERE insurance_booking_id = ? AND status = 'Paid' ORDER BY id DESC LIMIT 1",
    [booking.id]
  );
  const totalPaid = Number(payments[0]?.amount) || Number(booking.premium_per_pax) * Math.max(1, travellers.length);

  return { booking, travellers, totalPaid };
}

/* Renders the policy certificate PDF for a given ref. Returns null if the ref doesn't exist. */
export async function buildPolicyPdf(ref: string): Promise<Buffer | null> {
  const data = await fetchInsuranceBooking(ref);
  if (!data) return null;
  const { booking, travellers, totalPaid } = data;

  const pdfBuffer = await renderToBuffer(
    PolicyDocument({
      policyNumber: booking.policy_number || booking.ref,
      issueDate: fmtDate(booking.created_at ?? booking.booking_date),
      supplier: booking.policy_provider,
      planName: booking.plan_name,
      coverageArea: booking.coverage_area,
      policyStartDate: fmtDate(booking.policy_start_date),
      policyEndDate: fmtDate(booking.policy_end_date),
      clientName: booking.client_name,
      clientPhone: booking.client_phone,
      clientEmail: booking.client_email,
      travellers: travellers.map(t => ({
        name: t.name,
        type: TYPE_LABEL[t.type] ?? t.type,
        dob: fmtDate(t.dob),
        passportNo: t.passport_no ?? "",
        isLead: !!t.is_lead,
      })),
      premiumPerPax: Number(booking.premium_per_pax) || 0,
      gstPercent: Number(booking.gst_percent) || 18,
      totalPaid,
    })
  );

  return pdfBuffer;
}
