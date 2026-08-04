import pool from "@/app/lib/db";

/* booking_history.booking_id references booking.id (the numeric PK), not booking.booking_id
 * (the "SKRT..." ref) — matches the admin panel's own logBookingHistory (backend/src/lib/bookingHistory.js). */
export async function logBookingHistory(
  bookingId: number,
  action: string,
  description: string,
  performedBy?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO booking_history (booking_id, action, description, performed_by, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [bookingId, action, description || null, performedBy || "Corporate user"]
  );
}
