import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { moduleSetting } from "@/app/lib/moduleSetting";

interface ServiceFeeRow extends RowDataPacket {
  percentage_type: string | null;
  value: string | null;
  is_gst: string | null;
}

// Matches getUserContext()'s corporate branch (sales_channel_id 4) — this app is the corporate
// portal only. product_id/supplier_id are fixed to the flight product/supplier.
const PRODUCT_ID = "1";
const SUPPLIER_ID = "1";
const SALES_CHANNEL_ID = "4";

/* Ports the Laravel service_fee lookup verbatim: one row per (sector, booking_type), a flat
 * amount when percentage_type='fixed', a percentage of the flight fare when 'percentage', 0 when
 * no row matches. Called from the flight booking flow (passenger-details, review-booking,
 * payment-details) so "Service Fee" in the Fare Summary always reflects the current DB rates
 * instead of a hardcoded per-pax value. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sector = sp.get("sector"); // 'O' one-way, 'R' round trip
  const bookingType = sp.get("bookingType"); // 'domestic' | 'international'
  const amount = Number(sp.get("amount"));

  if (!sector || !bookingType || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Missing sector, bookingType or amount" }, { status: 400 });
  }

  const [rows] = await pool.query<ServiceFeeRow[]>(
    `SELECT percentage_type, value, is_gst FROM service_fee
     WHERE product_id = ? AND supplier_id = ? AND sales_channel_id = ?
       AND sector = ? AND booking_type = ?
     LIMIT 1`,
    [PRODUCT_ID, SUPPLIER_ID, SALES_CHANNEL_ID, sector, bookingType]
  );
  const row = rows[0];

  let fee = 0;
  if (row) {
    const value = Number(row.value) || 0;
    fee = row.percentage_type === "percentage" ? (amount * value) / 100 : value;
  }
  fee = Math.round(fee);

  // GST only applies when the matched row says so, at whatever rate module_setting.gst_percentage
  // currently holds — not a hardcoded 18%, so changing that one setting updates every fare
  // breakdown that shows GST on the service fee.
  const isGst = row?.is_gst === "yes";
  const settings = await moduleSetting().catch(() => null);
  const gstPercentage = settings?.gst_percentage ?? 18;
  const gstOnServiceFee = isGst ? Math.round((fee * gstPercentage) / 100) : 0;

  return NextResponse.json({ serviceFee: fee, isGst, gstPercentage, gstOnServiceFee });
}
