import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { moduleSetting } from "@/app/lib/moduleSetting";

interface BookingRow extends RowDataPacket {
  booking_id: string;
  invoice_no: string | null;
  status: string;
  payment_status: string | null;
  class: string | null;
  flight_fare_type: string | null;
  adt: number;
  chd: number;
  inf: number;
  total_flight_amt: string;
  service_fee: string;
  convenience_fee: string;
  discount: string;
  total_payable_amt: string;
  payment_mode: string | null;
  pnr_number: string | null;
  transaction_id: string | null;
  created_at: string;
  automation_responce: string | null;
}

interface RootRow extends RowDataPacket {
  id: number;
  bookingroot: string | null;
  origin: string | null;
  destination: string | null;
  origin_city: string | null;
  destination_city: string | null;
  flight_depart_date: string | null;
  pnr_no: string | null;
}

interface TravellerRow extends RowDataPacket {
  id: number;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  type: string | null;
  nationality: string | null;
  passport: string | null;
  issuing_country: string | null;
  issuing_country_code: string | null;
  expiry_date: string | null;
}

interface TicketRow extends RowDataPacket {
  booking_traveller_id: string | null;
  booking_root: string | null;
  ticket_no: string;
  pnr_no: string | null;
  booking_status: string | null;
}

function inferTripType(roots: RootRow[]): "one-way" | "round" | "multi" {
  if (roots.length <= 1) return "one-way";
  if (roots.length === 2) {
    const [a, b] = roots;
    if (a.origin === b.destination && a.destination === b.origin) return "round";
  }
  return "multi";
}

export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[ref]">) {
  const { ref } = await ctx.params;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = String(session.userId);
  const [rows] = await pool.query<BookingRow[]>(
    `SELECT booking_id, invoice_no, status, payment_status, class, flight_fare_type, adt, chd, inf,
            total_flight_amt, service_fee, convenience_fee, discount,
            total_payable_amt, payment_mode, pnr_number, transaction_id, created_at, automation_responce
     FROM booking
     WHERE booking_id = ? AND (coroprate_id = ? OR vendor_id = ?)
     LIMIT 1`,
    [ref, userId, userId]
  );
  const booking = rows[0];
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const [roots] = await pool.query<RootRow[]>(
    "SELECT id, bookingroot, origin, destination, origin_city, destination_city, flight_depart_date, pnr_no FROM booking_root WHERE booking_id = ? ORDER BY id ASC",
    [booking.booking_id]
  );
  const [travellers] = await pool.query<TravellerRow[]>(
    `SELECT id, title, first_name, last_name, dob, type,
            nationality, passport, issuing_country, issuing_country_code, expiry_date
     FROM booking_travellers WHERE booking_id = ?`,
    [booking.booking_id]
  );
  const [tickets] = await pool.query<TicketRow[]>(
    "SELECT booking_traveller_id, booking_root, ticket_no, pnr_no, booking_status FROM booking_tickets WHERE booking_id = ?",
    [booking.booking_id]
  );

  // Reflects the live module_setting.is_automation flag, not whatever it was when this booking
  // was made — lets the confirmation page explain *why* a Pending booking is pending (automation
  // off entirely vs. automation on but not yet ticketed).
  const settings = await moduleSetting().catch(() => null);
  const automationEnabled = settings?.is_automation === 1;

  return NextResponse.json({
    booking: {
      ref: booking.booking_id,
      invoiceNo: booking.invoice_no,
      status: booking.status,
      paymentStatus: booking.payment_status,
      travelClass: booking.class,
      fareType: booking.flight_fare_type,
      adt: booking.adt,
      chd: booking.chd,
      inf: booking.inf,
      totalFlightAmt: Number(booking.total_flight_amt) || 0,
      serviceFee: Number(booking.service_fee) || 0,
      convenienceFee: Number(booking.convenience_fee) || 0,
      discount: Number(booking.discount) || 0,
      totalPayableAmt: Number(booking.total_payable_amt) || 0,
      paymentMode: booking.payment_mode,
      paymentReferenceNo: booking.transaction_id,
      pnr: booking.pnr_number,
      createdAt: booking.created_at,
      tripType: inferTripType(roots),
      automationEnabled,
      automationResponse: booking.automation_responce,
    },
    sectors: roots.map(r => ({
      id: r.id,
      route: r.bookingroot ?? `${r.origin ?? "?"}-${r.destination ?? "?"}`,
      originCity: r.origin_city,
      destinationCity: r.destination_city,
      date: r.flight_depart_date,
      pnr: r.pnr_no,
    })),
    passengers: travellers.map(t => ({
      id: t.id,
      title: t.title,
      firstName: t.first_name,
      lastName: t.last_name,
      name: [t.title, t.first_name, t.last_name].filter(Boolean).join(" "),
      dob: t.dob,
      type: t.type,
      nationality: t.nationality,
      passport: t.passport,
      issuingCountry: t.issuing_country,
      issuingCountryCode: t.issuing_country_code,
      passportExpiry: t.expiry_date,
    })),
    tickets: tickets.map(t => ({
      travellerId: t.booking_traveller_id,
      sector: t.booking_root,
      ticketNo: t.ticket_no,
      pnr: t.pnr_no,
      status: t.booking_status,
    })),
  });
}
