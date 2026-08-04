import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { moduleSetting } from "@/app/lib/moduleSetting";

/* Mirrors the Laravel flow's moduleSetting()->is_automation gate around reviewBooking() — run
 * right after a flight booking's payment succeeds.
 *
 * STUB ONLY: the real reviewBooking() posts a live Yatra checkout session (pricingId, searchId,
 * superPnr, sessionTimeoutData, ebs_accountId/ebs_sessionId, fare/schedule breakdown) to
 * `{yatra_api_url}/flightsapi/air-pay-book-service/{tenant}/booking/pool/trigger`. This app's
 * booking flow (see app/lib/createBooking.ts) has no live Yatra search->price->checkout session —
 * bookings are recorded directly from client-entered fares, so none of that session data exists
 * to send. Calling the real endpoint with fabricated values would misfire against production
 * Yatra credentials, so this only performs the is_automation check and records why automation was
 * skipped, in the same `automation_responce` column the real call would have written to. Wire up
 * the actual Yatra call here once pricingId/searchId/superPnr/flightsData are captured through the
 * booking flow. Never throws — payment has already succeeded by the time this runs. */
export async function reviewBookingIfEnabled(bookingId: string): Promise<void> {
  try {
    const settings = await moduleSetting();
    if (settings.is_automation !== 1) return;

    const stubResponse = {
      status: "SKIPPED",
      reason:
        "Automation is enabled (module_setting.is_automation = 1) but this booking flow has no " +
        "live Yatra checkout session (pricingId/searchId/superPnr/flightsData) to send — " +
        "reviewBooking() was not called.",
    };

    await pool.query("UPDATE booking SET automation_responce = ? WHERE booking_id = ?", [
      JSON.stringify(stubResponse),
      bookingId,
    ]);

    // No-ops today (the stub object above has no `.response`) — starts working the moment the
    // block above is replaced with a real Yatra call, with no further changes needed here.
    await processReviewBookingResponse(stubResponse, bookingId);
  } catch (err) {
    console.error(`reviewBookingIfEnabled failed for booking ${bookingId}`, err);
  }
}

interface YatraReviewTicket {
  title?: string;
  fname?: string;
  lname?: string;
  org?: string;
  des?: string;
  status?: string;
  ticketNo?: string;
}

interface YatraReviewScheduleEntry {
  OD?: Array<{ FS?: Array<{ arpnr?: string; isGds?: boolean | string; ac?: string }> }>;
}

interface YatraReviewData {
  fltOrder?: Record<string, string>;
  fltSchedule?: Record<string, YatraReviewScheduleEntry[]>;
  passengerTickets?: YatraReviewTicket[][];
}

/* Mirrors Laravel's createTicket($responseData, $bookingId) — parses the real Yatra
 * pool/trigger response (only present once reviewBookingIfEnabled() above makes a live call) and
 * upserts booking_root.pnr_no + booking_tickets with the real PNR/ticket numbers/status, then
 * flips booking.status to 'Tickted' once every route has at least one successful ticket.
 *
 * booking_root/booking_travellers/booking_tickets already exist by the time this runs — this app
 * creates them synchronously in createBookingRecord() (no live airline API), unlike the Laravel
 * flow where createTicket() is what first creates booking_tickets rows. So this UPDATEs the
 * existing rows (matched the same way Laravel's find-or-create does: by booking_id + bookingroot,
 * and by booking_id + title/first_name/last_name for the traveller) instead of always inserting.
 *
 * Silently returns if `rawResponse` doesn't have Yatra's expected `.response` (JSON-string) shape
 * — true for every call today, since reviewBookingIfEnabled() only ever produces the stub object.
 * Never throws — same non-fatal contract as reviewBookingIfEnabled(). */
export async function processReviewBookingResponse(rawResponse: unknown, bookingId: string): Promise<void> {
  try {
    const envelope = rawResponse as { response?: string } | null;
    if (!envelope?.response) return;

    const finalData = JSON.parse(envelope.response) as { data?: YatraReviewData };
    const data = finalData.data;
    if (!data?.fltOrder) return;

    let lastRootHadSuccess = false;

    for (const [orderKeyStr, routeKey] of Object.entries(data.fltOrder)) {
      const orderKey = Number(orderKeyStr);
      const scheduleEntries = data.fltSchedule?.[routeKey] ?? [];

      // Same as the PHP loop: takes whichever schedule entry under this route key was seen last.
      let pnr = "";
      let isGds: boolean | string = false;
      let ac = "";
      for (const entry of scheduleEntries) {
        const fs = entry.OD?.[0]?.FS?.[0];
        if (!fs) continue;
        pnr = fs.arpnr ?? pnr;
        isGds = fs.isGds ?? isGds;
        ac = fs.ac ?? ac;
      }

      // passengerTickets is a plain array keyed by (orderKey - 1), one entry per traveller on
      // that route — matches Laravel's `$crootkey = $orderkey - 1`.
      const tickets = data.passengerTickets?.[orderKey - 1] ?? [];

      for (let i = 0; i < tickets.length; i++) {
        const passenger = tickets[i];
        const root = `${passenger.org ?? ""}-${passenger.des ?? ""}`;

        await pool.query("UPDATE booking_root SET pnr_no = ? WHERE booking_id = ? AND bookingroot = ?", [
          pnr, bookingId, root,
        ]);

        const [travellerRows] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM booking_travellers WHERE booking_id = ? AND title = ? AND first_name = ? AND last_name = ? LIMIT 1",
          [bookingId, passenger.title ?? "", passenger.fname ?? "", passenger.lname ?? ""]
        );
        const travellerId = travellerRows[0]?.id;
        if (!travellerId) continue;

        const ticketNo = isGds === false || isGds === "false"
          ? `${passenger.ticketNo ?? ""}${i}${ac}`
          : (passenger.ticketNo ?? "");

        // Yatra's own per-passenger status is literally "SUCCESS" on a confirmed ticket — but
        // that string is also this app's own pre-automation placeholder (see createBooking.ts),
        // so it's normalized to our 'Tickted' label here instead of passed through verbatim, to
        // keep "genuinely confirmed by the airline" distinguishable from "not yet confirmed".
        // Anything else Yatra returns (a failure reason, etc.) is kept as-is for visibility.
        const bookingStatus = (passenger.status ?? "").toUpperCase() === "SUCCESS" ? "Tickted" : (passenger.status ?? "");

        const [existing] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM booking_tickets WHERE booking_id = ? AND booking_root = ? AND booking_traveller_id = ? LIMIT 1",
          [bookingId, root, travellerId]
        );

        if (existing[0]) {
          await pool.query(
            "UPDATE booking_tickets SET pnr_no = ?, ticket_no = ?, booking_status = ? WHERE id = ?",
            [pnr, ticketNo, bookingStatus, existing[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO booking_tickets (booking_id, booking_traveller_id, booking_root, pnr_no, ticket_no, booking_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [bookingId, String(travellerId), root, pnr, ticketNo, bookingStatus]
          );
        }
      }
    }

    // Mirrors the Laravel loop exactly: $allticket only reflects the LAST booking_root checked in
    // the loop, not an AND across every root — preserved as-is for parity with the reference.
    const [roots] = await pool.query<RowDataPacket[]>(
      "SELECT bookingroot FROM booking_root WHERE booking_id = ?",
      [bookingId]
    );
    for (const root of roots) {
      const [successRows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM booking_tickets WHERE booking_id = ? AND booking_root = ? AND booking_status = 'Tickted' LIMIT 1",
        [bookingId, root.bookingroot]
      );
      lastRootHadSuccess = !!successRows[0];
    }

    if (lastRootHadSuccess) {
      await pool.query("UPDATE booking SET status = 'Tickted' WHERE booking_id = ?", [bookingId]);
    }
  } catch (err) {
    console.error(`processReviewBookingResponse failed for booking ${bookingId}`, err);
  }
}
