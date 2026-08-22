import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { serialize } from "php-serialize";

export interface BookingSectorInput {
  /** Full "City, Country (CODE)" label from the search form (e.g. "Jaipur, India (JAI)") — stored
   * as-is in booking_root.origin_city/destination_city. */
  originCity: string;
  destinationCity: string;
  /** Airport codes (e.g. "JAI"/"DEL") — the same codes used to query the flight-search API.
   * Used for booking_root.bookingroot/origin/destination and booking_tickets.booking_root. */
  originCode: string;
  destinationCode: string;
  /** 2-letter country codes (e.g. "IN") for booking_root.origin_country/destination_country. */
  originCountry: string;
  destinationCountry: string;
  flightDepartDateRaw: string; // "DD/MM/YYYY"
  /** Airline+number for this sector, e.g. "6E-2341" ("6E-2341+6E-2342" when it has a connecting
   * segment). Joined across sectors with "," into booking.flight_no (one-way: 1 sector, round
   * trip: 2, multi-city: N). */
  flightNo?: string;
  /** Yatra's `yatraId` for the selected fare on this sector — joined across sectors with ","
   * into booking.flight_id, same pattern as flightNo. */
  flightId?: string;
  /** Fare bundle name the user actually picked for this sector (e.g. "SME Fare", "Saver Fare",
   * "Flexi Plus", "Corp Fare") — Yatra's `fareId` from the fare-options list on results. Joined
   * across sectors with "," into booking.flight_fare_type, same pattern as flightNo. */
  fareType?: string;
}
export interface BookingPassengerInput {
  title: string;
  firstName: string;
  lastName: string;
  type: "Adult" | "Child" | "Infant";
  /** International bookings only — collected on passenger-details for every passenger type,
   * not just infants. All optional since domestic bookings never send them. */
  dob?: string;
  nationality?: string;
  passport?: string;
  issuingCountry?: string;
  passportExpiry?: string;
}
// Company/GST details collected on passenger-details when "I have a GST Number" is checked —
// optional, and only present for GST-enabled bookings.
export interface BookingGstInput {
  companyName: string;
  registrationNo: string;
  gstNumber: string;
  pincode: string;
  stateName: string;
  address: string;
}

export interface CreateBookingParams {
  corporateId: string; // session.userId, as string — matches `booking.coroprate_id`
  countryCode: string;
  mobile: string;
  email: string;
  adt: number;
  chd: number;
  inf: number;
  travelClass: string;
  tripLabel: "O" | "R" | "M"; // one-way / round / multi-city, mirrors the flight-search `type` param
  sectors: BookingSectorInput[]; // 1 (one-way), 2 (round trip), or N (multi-city)
  passengers: BookingPassengerInput[];
  totalFlightAmt: number;
  serviceFee: number;
  convenienceFee: number;
  totalPayableAmt: number;
  paymentModeId: string; // payment_modes.id: 1=UPI 2=NetBanking 3=Credit 4=Debit 5=Creditpool
  transactionId: string;
  gst?: BookingGstInput;
  /** Raw live Yatra pricing re-check response (payment-details' call to /api/flights/price,
   * right before submitting) — PHP-serialized + base64-encoded here (not by the client) into
   * booking.flightsDataArray, matching Laravel's `base64_encode(serialize($flight_detail))`
   * exactly, so bookings created by this app stay readable by unserialize(base64_decode(...))
   * everywhere the reference app reads it (invoice PDF, ticket view, booking detail). Mandatory:
   * payment-details blocks Pay Now until this resolves, and parseBookingRequest() rejects any
   * request missing it, so booking.flightsDataArray is never left null for a flight booking. */
  flightsData: unknown;
}

// Client-supplied subset of CreateBookingParams (everything except corporateId/paymentModeId/
// transactionId, which each API route fills in itself from the session/payment result).
export type BookingRequestInput = Omit<CreateBookingParams, "corporateId" | "paymentModeId" | "transactionId">;

/* Validates the shape of a booking-creation request body. Both the Creditpool and Razorpay
 * booking-verify routes accept the same client payload, so they share this parser. Amounts are
 * trusted as sent by the client — this app has no server-side fare re-validation (matching the
 * fake per-pax rate tables used throughout the booking UI), so this only checks shape/types, not
 * that the amounts are "correct". */
export function parseBookingRequest(body: unknown): BookingRequestInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const sectors = b.sectors;
  const passengers = b.passengers;
  // Up to 6 sectors covers one-way (1), round trip (2), and multi-city (typically 2-6 legs).
  if (!Array.isArray(sectors) || sectors.length < 1 || sectors.length > 6) return null;
  if (!Array.isArray(passengers) || passengers.length < 1) return null;
  // Mandatory: booking.flightsDataArray must never be left null for a flight booking — reject
  // outright rather than silently proceeding without it (payment-details already blocks Pay Now
  // client-side until this is present; this is the server-side backstop).
  if (!b.flightsData || typeof b.flightsData !== "object") return null;

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const adt = num(b.adt), chd = num(b.chd), inf = num(b.inf);
  const totalFlightAmt = num(b.totalFlightAmt), serviceFee = num(b.serviceFee);
  const convenienceFee = num(b.convenienceFee), totalPayableAmt = num(b.totalPayableAmt);
  if ([adt, chd, inf, totalFlightAmt, serviceFee, convenienceFee, totalPayableAmt].some(Number.isNaN)) return null;
  if (adt < 1 || totalPayableAmt <= 0) return null;

  const parsedSectors: BookingSectorInput[] = [];
  for (const s of sectors) {
    if (!s || typeof s !== "object") return null;
    const so = s as Record<string, unknown>;
    if (!str(so.originCity) || !str(so.destinationCity) || !str(so.flightDepartDateRaw)) return null;
    parsedSectors.push({
      originCity: str(so.originCity),
      destinationCity: str(so.destinationCity),
      // Falls back to the city name if a code wasn't supplied, rather than rejecting the booking.
      originCode: str(so.originCode) || str(so.originCity),
      destinationCode: str(so.destinationCode) || str(so.destinationCity),
      originCountry: str(so.originCountry),
      destinationCountry: str(so.destinationCountry),
      flightDepartDateRaw: str(so.flightDepartDateRaw),
      flightNo: str(so.flightNo) || undefined,
      flightId: str(so.flightId) || undefined,
      fareType: str(so.fareType) || undefined,
    });
  }

  const parsedPassengers: BookingPassengerInput[] = [];
  for (const p of passengers) {
    if (!p || typeof p !== "object") return null;
    const po = p as Record<string, unknown>;
    const type = po.type;
    if (type !== "Adult" && type !== "Child" && type !== "Infant") return null;
    if (!str(po.firstName) || !str(po.lastName)) return null;
    parsedPassengers.push({
      title: str(po.title), firstName: str(po.firstName), lastName: str(po.lastName), type,
      dob: str(po.dob) || undefined,
      nationality: str(po.nationality) || undefined,
      passport: str(po.passport) || undefined,
      issuingCountry: str(po.issuingCountry) || undefined,
      passportExpiry: str(po.passportExpiry) || undefined,
    });
  }

  const tripLabel = b.tripLabel === "R" ? "R" : b.tripLabel === "M" ? "M" : "O";

  // GST is optional — only carried through when the client actually sent a company name and
  // GST number (matching the "I have a GST Number" checkbox flow on passenger-details).
  let gst: BookingGstInput | undefined;
  const g = b.gst;
  if (g && typeof g === "object") {
    const go = g as Record<string, unknown>;
    if (str(go.companyName) && str(go.gstNumber)) {
      gst = {
        companyName: str(go.companyName),
        registrationNo: str(go.registrationNo),
        gstNumber: str(go.gstNumber),
        pincode: str(go.pincode),
        stateName: str(go.stateName),
        address: str(go.address),
      };
    }
  }

  return {
    countryCode: str(b.countryCode) || "+91",
    mobile: str(b.mobile),
    email: str(b.email),
    adt, chd, inf,
    travelClass: str(b.travelClass) || "Economy",
    tripLabel,
    sectors: parsedSectors,
    passengers: parsedPassengers,
    totalFlightAmt, serviceFee, convenienceFee, totalPayableAmt,
    gst,
    flightsData: b.flightsData,
  };
}

const TYPE_CODE: Record<BookingPassengerInput["type"], string> = {
  Adult: "ADT",
  Child: "CHD",
  Infant: "INF",
};

// Matches the fixed "Issuing Country" dropdown on passenger-details — that field only collects
// the country name, so the code is derived here for booking_travellers.issuing_country_code.
const ISSUING_COUNTRY_CODE: Record<string, string> = {
  "India": "IN",
  "Thailand": "TH",
  "United Arab Emirates": "AE",
  "Singapore": "SG",
  "United Kingdom": "GB",
  "United States": "US",
  "Australia": "AU",
  "Germany": "DE",
  "France": "FR",
  "Japan": "JP",
};

/* Inserts a full booking (booking / booking_root / booking_travellers / booking_tickets) right
 * after payment clears. booking.status and booking_tickets.booking_status both start 'Pending'
 * — meaning "payment succeeded, ticket not yet confirmed" — and only become 'Tickted' once
 * processReviewBookingResponse() (app/lib/reviewBooking.ts) confirms a real ticket was issued.
 * No PNR is generated here: the PNR is the airline's own confirmation code, assigned by Yatra —
 * every PNR field (booking.pnr_number, booking_root.pnr_no, booking_tickets.pnr_no/ticket_no)
 * starts null/blank and is meant to be filled in later by a separate cron that polls Yatra for
 * the real ticketing result and writes it back (booking_tickets.pnr_no/ticket_no are NOT NULL
 * columns, so those two use '' rather than null until that cron exists).
 * Caller must run this inside a transaction on `conn` and commit/rollback around it. */
export async function createBookingRecord(
  conn: PoolConnection,
  p: CreateBookingParams
): Promise<{ bookingId: string }> {
  const [lastRows] = await conn.query<RowDataPacket[]>(
    "SELECT sequence_number FROM booking ORDER BY id DESC LIMIT 1 FOR UPDATE"
  );
  const lastSeq = parseInt(lastRows[0]?.sequence_number ?? "", 10);
  const seq = (Number.isFinite(lastSeq) ? lastSeq : 9999) + 1;
  const bookingId = `SKRT${seq}`;
  const invoiceNo = `INVOICE${seq}`;

  const gstPincode = p.gst?.pincode ? Number(p.gst.pincode) || null : null;

  // One-way: 1 sector, round trip: 2, multi-city: N — join whatever each sector carried, comma
  // separated, into a single flight_no/flight_id column on the booking (blank entries kept so
  // position still lines up with the sector list; null out entirely if nothing was sent at all).
  const flightNoJoined = p.sectors.map(s => s.flightNo ?? "").join(",");
  const flightIdJoined = p.sectors.map(s => s.flightId ?? "").join(",");
  const fareTypeJoined = p.sectors.map(s => s.fareType ?? "").join(",");
  const flightNo = flightNoJoined.replace(/,/g, "") ? flightNoJoined : null;
  const flightId = flightIdJoined.replace(/,/g, "") ? flightIdJoined : null;
  // Falls back to "Corp Fare" only when no sector actually carried a fare bundle name (e.g. an
  // old/demo client payload) — previously this was hardcoded to 'Corp Fare' unconditionally,
  // overwriting whatever fare (SME Fare/Saver Fare/Flexi Plus/...) the user actually selected.
  const flightFareType = fareTypeJoined.replace(/,/g, "") ? fareTypeJoined : "Corp Fare";

  // Matches Laravel's base64_encode(serialize($flight_detail)) byte-for-byte format (PHP
  // serialize, not JSON) so unserialize(base64_decode(...)) — used everywhere the reference app
  // reads this column (invoice PDF, ticket view, booking detail) — can read bookings this app
  // creates too.
  const flightsDataArray = p.flightsData
    ? Buffer.from(serialize(p.flightsData), "utf8").toString("base64")
    : null;

  const [bookingResult] = await conn.query<ResultSetHeader>(
    `INSERT INTO booking
      (booking_id, sequence_number, invoice_no, coroprate_id, country_code, mobile_no, email,
       adt, chd, inf, class, viewName, type, total_payable_amt, total_flight_amt, payment_mode,
       convenience_fee, service_fee, without_gst_service_fee, authorized_date, transaction_id,
       payment_status, pnr_number, flight_fare_type, booking_from, status, flight_no, flight_id,
       flightsDataArray, company_name, gst_reg_no, gst_number, pincode, state, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?, ?, NOW(), ?,
       'Success', ?, ?, 'Manual', 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bookingId, String(seq), invoiceNo, p.corporateId, p.countryCode, p.mobile, p.email,
      p.adt, p.chd, p.inf, p.travelClass, p.tripLabel, String(p.totalPayableAmt), p.totalFlightAmt,
      p.paymentModeId, p.convenienceFee, p.serviceFee, p.serviceFee, p.transactionId, null,
      flightFareType, flightNo, flightId,
      flightsDataArray,
      p.gst?.companyName || null, p.gst?.registrationNo || null, p.gst?.gstNumber || null,
      gstPincode, p.gst?.stateName || null, p.gst?.address || null,
    ]
  );

  // Mirrors the "Booking Created" entries the admin panel's own booking flow already logs —
  // on `conn` (not the pool) so this rolls back together with the rest of the booking if
  // anything after it fails.
  await conn.query(
    `INSERT INTO booking_history (booking_id, action, description, performed_by, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [bookingResult.insertId, "Booking Created", `Booking ${bookingId} was created`, "Corporate user"]
  );

  for (const sector of p.sectors) {
    const bookingroot = `${sector.originCode}-${sector.destinationCode}`;
    await conn.query(
      `INSERT INTO booking_root
        (booking_id, bookingroot, origin, destination, origin_country, destination_country,
         origin_city, destination_city, flight_depart_date, pnr_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingId, bookingroot, sector.originCode, sector.destinationCode,
       sector.originCountry, sector.destinationCountry,
       sector.originCity, sector.destinationCity, sector.flightDepartDateRaw, null]
    );
  }

  const travellerIds: number[] = [];
  for (const pax of p.passengers) {
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO booking_travellers
        (booking_id, title, first_name, last_name, dob, type,
         nationality, passport, issuing_country, issuing_country_code, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId, pax.title, pax.firstName, pax.lastName, pax.dob || null, TYPE_CODE[pax.type],
        pax.nationality || null, pax.passport || null, pax.issuingCountry || null,
        (pax.issuingCountry && ISSUING_COUNTRY_CODE[pax.issuingCountry]) || null,
        pax.passportExpiry || null,
      ]
    );
    travellerIds.push(result.insertId);
  }

  for (const sector of p.sectors) {
    const bookingroot = `${sector.originCode}-${sector.destinationCode}`;
    for (const travellerId of travellerIds) {
      // pnr_no/ticket_no are NOT NULL columns — '' rather than null, to be filled in once the
      // (future) cron writes back Yatra's real PNR/ticket number.
      await conn.query(
        `INSERT INTO booking_tickets (booking_id, booking_traveller_id, booking_root, pnr_no, ticket_no, booking_status)
         VALUES (?, ?, ?, '', '', 'Pending')`,
        [bookingId, String(travellerId), bookingroot]
      );
    }
  }

  return { bookingId };
}
