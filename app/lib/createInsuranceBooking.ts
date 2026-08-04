import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader } from "mysql2";
import type { InsuranceRequestInput } from "@/app/lib/insuranceRequest";

function toMysqlDate(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/* Inserts a full insurance policy purchase (insurance_bookings / insurance_travellers /
 * insurance_payments) as an already-active policy — mirrors createBookingRecord's flight-booking
 * pattern. Caller must run this inside a transaction on `conn` and commit/rollback around it. */
export async function createInsuranceBookingRecord(
  conn: PoolConnection,
  input: InsuranceRequestInput,
  opts: { createdByName: string; paymentMode: string; transactionId: string }
): Promise<{ ref: string; bookingId: number }> {
  const ref = `KLM-INS-${Date.now().toString().slice(-8)}`;
  const lead = input.travellers.find(t => t.relationship === "SELF") ?? input.travellers[0];
  const clientName = lead ? [lead.title, lead.firstName, lead.lastName].filter(Boolean).join(" ") : opts.createdByName;
  const nomineeName = lead ? [lead.nomineeFirst, lead.nomineeLast].filter(Boolean).join(" ") || null : null;
  const premiumPerPax = Math.round(input.amount / Math.max(1, input.travellers.length));

  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO insurance_bookings
      (ref, status, booked_by, created_by_name, client_name, client_phone, client_email,
       client_address, client_nationality, travellers_count, nominee_name, policy_provider,
       plan_name, policy_number, coverage_area, coverage_amount, policy_start_date, policy_end_date,
       destination, premium_per_pax, booking_date)
     VALUES (?, 'Active', 'Corporate', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
    [
      ref,
      opts.createdByName,
      clientName,
      input.proposer.mobile,
      input.proposer.email,
      [input.proposer.address1, input.proposer.address2].filter(Boolean).join(", ") || null,
      input.proposer.nationality,
      input.travellers.length,
      nomineeName,
      input.supplier,
      input.planName,
      ref,
      input.dest,
      input.coverage || null,
      toMysqlDate(input.dep),
      toMysqlDate(input.ret),
      input.dest,
      premiumPerPax,
    ]
  );
  const bookingId = result.insertId;

  for (let i = 0; i < input.travellers.length; i++) {
    const t = input.travellers[i];
    await conn.query(
      `INSERT INTO insurance_travellers
        (insurance_booking_id, sno, name, type, dob, passport_no, nationality, is_lead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId, i + 1,
        [t.title, t.firstName, t.lastName].filter(Boolean).join(" "),
        i >= input.adults ? "Child" : "Adult",
        toMysqlDate(t.dob), t.passport || null, t.nationality,
        t.relationship === "SELF" || (i === 0 && !input.travellers.some(x => x.relationship === "SELF")) ? 1 : 0,
      ]
    );
  }

  await conn.query(
    `INSERT INTO insurance_payments
      (insurance_booking_id, txn_id, method, amount, status, paid_at)
     VALUES (?, ?, ?, ?, 'Paid', NOW())`,
    [bookingId, opts.transactionId, opts.paymentMode, input.amount]
  );

  return { ref, bookingId };
}
