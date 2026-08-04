import { renderToBuffer } from "@react-pdf/renderer";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { InvoiceDocument } from "@/app/lib/invoice";

interface BookingRow extends RowDataPacket {
  booking_id: string;
  invoice_no: string | null;
  class: string | null;
  flight_fare_type: string | null;
  total_flight_amt: number;
  convenience_fee: number;
  service_fee: number;
  without_gst_service_fee: number;
  total_payable_amt: string;
  discount: string | null;
  pnr_number: string | null;
  created_at: string;
  company_name: string | null;
  gst_number: string | null;
}

interface RootRow extends RowDataPacket {
  bookingroot: string | null;
  pnr_no: string | null;
}

interface TicketRow extends RowDataPacket {
  ticket_no: string;
  booking_root: string | null;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  type: string | null;
}

interface TravellerRow extends RowDataPacket {
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  type: string | null;
}

interface UserRow extends RowDataPacket {
  mobile: string | null;
  c_gst: string | null;
}

const TYPE_LABEL: Record<string, string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };

/* Shared by the invoice-download API route and the post-booking confirmation email, so both
 * produce byte-identical PDFs from the same query/render logic. Returns null if the booking
 * isn't found for this user. */
export async function buildInvoicePdf(
  bookingId: string,
  userId: string,
  billToName: string
): Promise<Buffer | null> {
  const [rows] = await pool.query<BookingRow[]>(
    `SELECT booking_id, invoice_no, class, flight_fare_type, total_flight_amt, convenience_fee,
            service_fee, without_gst_service_fee, total_payable_amt, discount, pnr_number, created_at,
            company_name, gst_number
     FROM booking
     WHERE booking_id = ? AND (coroprate_id = ? OR vendor_id = ?)
     LIMIT 1`,
    [bookingId, userId, userId]
  );
  const booking = rows[0];
  if (!booking) return null;

  const [roots] = await pool.query<RootRow[]>(
    "SELECT bookingroot, pnr_no FROM booking_root WHERE booking_id = ? ORDER BY id ASC",
    [booking.booking_id]
  );

  const [tickets] = await pool.query<TicketRow[]>(
    `SELECT tk.ticket_no, tk.booking_root, tr.title, tr.first_name, tr.last_name, tr.type
     FROM booking_tickets tk
     LEFT JOIN booking_travellers tr ON tr.id = tk.booking_traveller_id
     WHERE tk.booking_id = ?`,
    [booking.booking_id]
  );

  let ticketRows = tickets.map(t => ({
    ticketNo: t.ticket_no,
    sector: t.booking_root ?? roots[0]?.bookingroot ?? "-",
    paxName: [t.title, t.first_name, t.last_name].filter(Boolean).join(" ") || "-",
    type: t.type ? (TYPE_LABEL[t.type] ?? t.type) : "-",
  }));

  if (ticketRows.length === 0) {
    const [travellers] = await pool.query<TravellerRow[]>(
      "SELECT title, first_name, last_name, type FROM booking_travellers WHERE booking_id = ?",
      [booking.booking_id]
    );
    ticketRows = travellers.map(t => ({
      ticketNo: "-",
      sector: roots[0]?.bookingroot ?? "-",
      paxName: [t.title, t.first_name, t.last_name].filter(Boolean).join(" ") || "-",
      type: t.type ? (TYPE_LABEL[t.type] ?? t.type) : "-",
    }));
  }

  const [userRows] = await pool.query<UserRow[]>(
    "SELECT mobile, c_gst FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  const billTo = userRows[0];

  const pdfBuffer = await renderToBuffer(
    InvoiceDocument({
      invoiceNo: booking.invoice_no || booking.booking_id,
      invoiceDate: new Date(booking.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-"),
      pnr: roots[0]?.pnr_no || booking.pnr_number || "-",
      billToName: billToName || "-",
      billToPhone: billTo?.mobile ?? null,
      // The GST/company details entered for this specific booking (passenger-details' "I have a
      // GST Number" section) take priority over the account-level GST — they're what the
      // traveller actually chose to bill this trip to.
      billToCompanyName: booking.company_name ?? null,
      billToGst: booking.gst_number ?? billTo?.c_gst ?? null,
      travelClass: booking.class,
      fareType: booking.flight_fare_type,
      tickets: ticketRows,
      totalFlightAmt: booking.total_flight_amt,
      serviceFeeExGst: booking.without_gst_service_fee,
      serviceFeeGst: booking.service_fee - booking.without_gst_service_fee,
      convenienceFee: booking.convenience_fee,
      discount: Number(booking.discount) || 0,
      totalPayableAmt: Number(booking.total_payable_amt) || 0,
    })
  );

  return pdfBuffer;
}
