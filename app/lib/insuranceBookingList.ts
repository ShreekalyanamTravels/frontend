import pool from "@/app/lib/db";
import type { RowDataPacket } from "mysql2";
import { coverageBreakdown } from "@/app/corporate/insurance/insuranceData";

interface BookingRow extends RowDataPacket {
  id: number;
  ref: string;
  status: string;
  policy_provider: string;
  policy_type: string;
  policy_number: string | null;
  plan_name: string;
  policy_start_date: string | null;
  policy_end_date: string | null;
  premium_per_pax: string;
  travellers_count: number;
  created_at: string;
  paid_amount: string | null;
  coverage_amount: string | null;
}

interface TravellerRow extends RowDataPacket {
  insurance_booking_id: number;
  name: string;
}

type InsStatus = "Active" | "Expired" | "Cancelled" | "Claim Pending";

// insurance_bookings has no corporate/user FK column — the closest available link to "my
// bookings" is created_by_name, which our own purchase flow always sets to session.name.
const STATUS_MAP: Record<string, InsStatus> = {
  New: "Active",
  "In Process": "Active",
  Active: "Active",
  Expired: "Expired",
  Claimed: "Claim Pending",
  Cancelled: "Cancelled",
};
const TAB_MAP: Record<InsStatus, "upcoming" | "completed" | "canceled"> = {
  Active: "upcoming",
  Expired: "completed",
  "Claim Pending": "completed",
  Cancelled: "canceled",
};

function fmtDMY(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fmtBookedOn(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const day = d.toLocaleDateString("en-IN", { day: "2-digit" });
  const mon = d.toLocaleDateString("en-IN", { month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
  return `${weekday} (${day} ${mon} ${d.getFullYear()}), ${time}`;
}

export async function listInsuranceBookingsForUser(createdByName: string) {
  const [rows] = await pool.query<BookingRow[]>(
    `SELECT ib.id, ib.ref, ib.status, ib.policy_provider, ib.policy_type, ib.policy_number,
            ib.plan_name, ib.policy_start_date, ib.policy_end_date, ib.premium_per_pax,
            ib.travellers_count, ib.created_at, ib.coverage_amount,
            (SELECT SUM(amount) FROM insurance_payments ip
             WHERE ip.insurance_booking_id = ib.id AND ip.status = 'Paid') AS paid_amount
     FROM insurance_bookings ib
     WHERE ib.created_by_name = ?
     ORDER BY ib.created_at DESC`,
    [createdByName]
  );

  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id);
  const [travellerRows] = await pool.query<TravellerRow[]>(
    `SELECT insurance_booking_id, name FROM insurance_travellers
     WHERE insurance_booking_id IN (?) ORDER BY sno ASC`,
    [ids]
  );
  const travellersByBooking = new Map<number, string[]>();
  for (const t of travellerRows) {
    const list = travellersByBooking.get(t.insurance_booking_id) ?? [];
    list.push(t.name);
    travellersByBooking.set(t.insurance_booking_id, list);
  }

  return rows.map(r => {
    const uiStatus = STATUS_MAP[r.status] ?? "Active";
    const premium = r.paid_amount != null
      ? Math.round(Number(r.paid_amount))
      : Math.round(Number(r.premium_per_pax) * Math.max(1, r.travellers_count));
    const coverageAmt = Number(r.coverage_amount) || 0;

    return {
      id: `INS${r.id}`,
      ref: r.ref,
      tab: TAB_MAP[uiStatus],
      bookedOn: fmtBookedOn(r.created_at),
      policyNo: r.policy_number || r.ref,
      provider: r.policy_provider,
      planType: r.policy_type,
      insured: travellersByBooking.get(r.id) ?? [],
      coverFrom: fmtDMY(r.policy_start_date),
      coverTo: fmtDMY(r.policy_end_date),
      sumInsured: coverageAmt > 0 ? `$${coverageAmt.toLocaleString("en-US")}` : "—",
      coverageItems: coverageAmt > 0 ? coverageBreakdown(coverageAmt, premium) : [],
      premium: premium.toLocaleString("en-IN"),
      status: uiStatus,
    };
  });
}
