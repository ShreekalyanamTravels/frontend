import pool from "@/app/lib/db";
import type { RowDataPacket } from "mysql2";

interface BookingRow extends RowDataPacket {
  id: number;
  booking_id: string;
  status: string;
  pnr_number: string | null;
  created_at: string;
}

interface RootRow extends RowDataPacket {
  booking_id: string;
  origin: string | null;
  destination: string | null;
  flight_depart_date: string | null;
  pnr_no: string | null;
}

interface TravellerRow extends RowDataPacket {
  booking_id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}

function parseDMY(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function normalizeStatus(status: string): string {
  const s = status.trim().toLowerCase();
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("refund")) return "Refunded";
  if (s.includes("hold")) return "On Hold";
  if (s.includes("tick")) return "Ticketed";
  // Yatra's own confirmed-ticket status is literally "SUCCESS" (see reviewBooking.ts) — some
  // bookings get booking.status set to that verbatim rather than 'Tickted'. Matched by exact
  // equality, not .includes(), so a value like "unsuccessful" doesn't false-positive here.
  if (s === "success") return "Ticketed";
  return "Pending";
}

function inferTripType(roots: RootRow[]): "one-way" | "round" | "multi" {
  if (roots.length <= 1) return "one-way";
  if (roots.length === 2) {
    const [a, b] = roots;
    if (a.origin === b.destination && a.destination === b.origin) return "round";
  }
  return "multi";
}

function formatBookedOn(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} (${date}), ${time}`;
}

export async function listBookingsForUser(userId: string) {
  const [bookings] = await pool.query<BookingRow[]>(
    `SELECT id, booking_id, status, pnr_number, created_at
     FROM booking
     WHERE coroprate_id = ? OR vendor_id = ?
     ORDER BY created_at DESC`,
    [userId, userId]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = [];

  for (const booking of bookings) {
    const [roots] = await pool.query<RootRow[]>(
      "SELECT booking_id, origin, destination, flight_depart_date, pnr_no FROM booking_root WHERE booking_id = ? ORDER BY id ASC",
      [booking.booking_id]
    );
    if (roots.length === 0) continue;

    const firstDate = parseDMY(roots[0].flight_depart_date);
    const lastDate = parseDMY(roots[roots.length - 1].flight_depart_date);
    if (!firstDate || !lastDate) continue;

    let tab: "upcoming" | "completed" | "canceled" | null = null;
    if (booking.status.trim().toLowerCase() === "cancel") {
      tab = "canceled";
    } else if (firstDate >= today && lastDate >= today) {
      tab = "upcoming";
    } else if (lastDate < today) {
      tab = "completed";
    }
    if (!tab) continue; // in-progress bookings aren't shown in any of the three tabs

    const [travellers] = await pool.query<TravellerRow[]>(
      "SELECT booking_id, title, first_name, last_name FROM booking_travellers WHERE booking_id = ?",
      [booking.booking_id]
    );

    const sectorStatus = normalizeStatus(booking.status);
    result.push({
      id: booking.booking_id,
      ref: booking.booking_id,
      type: inferTripType(roots),
      tab,
      product: "flights",
      bookedOn: formatBookedOn(booking.created_at),
      passengers: travellers.map(t => [t.title, t.first_name, t.last_name].filter(Boolean).join(" ")),
      sectors: roots.map((r, i) => ({
        num: i + 1,
        route: `${r.origin ?? "?"}-${r.destination ?? "?"}`,
        date: r.flight_depart_date ?? "",
        pnr: r.pnr_no || booking.pnr_number || "-",
        status: sectorStatus,
      })),
    });
  }

  return result;
}
