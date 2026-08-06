import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import type { TicketLeg, TicketPassenger } from "@/app/lib/ticket";
import { buildTicketHtml } from "@/app/lib/ticketHtml";
import { parseFlightItinerary } from "@/app/lib/flight-schedule";

interface BookingRow extends RowDataPacket {
  booking_id: string;
  status: string;
  class: string | null;
  flight_fare_type: string | null;
  country_code: string | null;
  mobile_no: string | null;
  gst_number: string | null;
  gst_reg_no: string | null;
  created_at: string;
  flightsDataArray: string | null;
  total_flight_amt: number;
  convenience_fee: number;
  service_fee: number;
  without_gst_service_fee: number;
  total_payable_amt: string;
  discount: string | null;
  pnr_number: string | null;
}

interface RootRow extends RowDataPacket {
  bookingroot: string | null;
  origin_city: string | null;
  destination_city: string | null;
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

const TYPE_LABEL: Record<string, string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };

function inferTripType(roots: RootRow[]): string {
  if (roots.length <= 1) return "One Way";
  if (roots.length === 2) {
    const [a, b] = roots;
    if (a.bookingroot && b.bookingroot) {
      const [aOrigin, aDest] = a.bookingroot.split("-");
      const [bOrigin, bDest] = b.bookingroot.split("-");
      if (aOrigin === bDest && aDest === bOrigin) return "Round Trip";
    }
  }
  return "Multi City";
}

export async function GET(request: Request, ctx: RouteContext<"/api/v1/bookings/[ref]/ticket">) {
  try {
    const { ref } = await ctx.params;
    const session = await requireApiAuth(request);

    const userId = String(session.userId);
    const [rows] = await pool.query<BookingRow[]>(
      `SELECT booking_id, status, class, flight_fare_type, country_code, mobile_no, gst_number, gst_reg_no, created_at, flightsDataArray,
              total_flight_amt, convenience_fee, service_fee, without_gst_service_fee,
              total_payable_amt, discount, pnr_number
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
      "SELECT bookingroot, origin_city, destination_city, pnr_no FROM booking_root WHERE booking_id = ? ORDER BY id ASC",
      [booking.booking_id]
    );

    const [tickets] = await pool.query<TicketRow[]>(
      `SELECT tk.ticket_no, tk.booking_root, tr.title, tr.first_name, tr.last_name, tr.type
       FROM booking_tickets tk
       LEFT JOIN booking_travellers tr ON tr.id = tk.booking_traveller_id
       WHERE tk.booking_id = ?`,
      [booking.booking_id]
    );

    let passengers: TicketPassenger[] = tickets.map(t => ({
      name: [t.title, t.first_name, t.last_name].filter(Boolean).join(" ") || "-",
      type: t.type ? (TYPE_LABEL[t.type] ?? t.type) : "-",
      ticketNo: t.ticket_no,
    }));

    if (passengers.length === 0) {
      const [travellers] = await pool.query<TravellerRow[]>(
        "SELECT title, first_name, last_name, type FROM booking_travellers WHERE booking_id = ?",
        [booking.booking_id]
      );
      passengers = travellers.map(t => ({
        name: [t.title, t.first_name, t.last_name].filter(Boolean).join(" ") || "-",
        type: t.type ? (TYPE_LABEL[t.type] ?? t.type) : "-",
        ticketNo: "-",
      }));
    }

    const legs: TicketLeg[] = roots
      .map(r => {
        const sector = r.bookingroot ?? "";
        const itinerary = parseFlightItinerary(booking.flightsDataArray, sector);
        const segments = (itinerary?.segments ?? []).map(seg => ({ ...seg, airlineIconPath: null }));
        return {
          originCity: (r.origin_city ?? sector).split(",")[0].trim(),
          destinationCity: (r.destination_city ?? "").split(",")[0].trim(),
          pnr: r.pnr_no || booking.pnr_number || "-",
          baggage: itinerary?.baggage ?? null,
          segments,
        };
      })
      .filter(leg => leg.segments.length > 0);

    const html = buildTicketHtml({
      bookingRef: booking.booking_id,
      pnr: legs[0]?.pnr && legs[0].pnr !== "-" ? legs[0].pnr : (booking.pnr_number || "-"),
      status: booking.status,
      bookingDate: new Date(booking.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-"),
      countryCode: booking.country_code,
      phone: booking.mobile_no,
      gstin: booking.gst_number || booking.gst_reg_no,
      travelClass: booking.class,
      fareType: booking.flight_fare_type,
      tripType: inferTripType(roots),
      passengers,
      legs,
      totalFlightAmt: booking.total_flight_amt,
      serviceFeeExGst: booking.without_gst_service_fee,
      serviceFeeGst: booking.service_fee - booking.without_gst_service_fee,
      convenienceFee: booking.convenience_fee,
      discount: Number(booking.discount) || 0,
      totalPayableAmt: Number(booking.total_payable_amt) || 0,
    });

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
