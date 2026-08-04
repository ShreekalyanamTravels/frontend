import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

interface ConvenienceFeeRow extends RowDataPacket {
  percentage_type: string | null;
  convenience_fee: string | null;
}

// Matches getUserContext()'s corporate branch (sales_channel_id 4) — this app is the corporate
// portal only. product_id/supplier_id are fixed to the flight product/supplier, same as the
// service_fee lookup.
const PRODUCT_ID = "1";
const SUPPLIER_ID = "1";
const SALES_CHANNEL_ID = "4";

/* Shared convenience-fee lookup — used by both /api/convenience-fee (flight booking) and
 * computeFees() (wallet recharge order creation), so the two never drift. The convenience_fee
 * table only has sector='O' rows for the corporate sales channel, so a sector-specific miss falls
 * back to 'O' rather than silently returning 0. Flat amount when percentage_type='fixed', a
 * percentage of `amount` when 'percentage'. */
export async function getConvenienceFee(paymentMode: string, sector: string, amount: number): Promise<number> {
  const lookup = async (sectorValue: string) => {
    const [rows] = await pool.query<ConvenienceFeeRow[]>(
      `SELECT percentage_type, convenience_fee FROM convenience_fee
       WHERE product_id = ? AND supplier_id = ? AND sales_channel_id = ?
         AND payment_mode = ? AND sector = ?
       LIMIT 1`,
      [PRODUCT_ID, SUPPLIER_ID, SALES_CHANNEL_ID, paymentMode, sectorValue]
    );
    return rows[0];
  };

  const row = (await lookup(sector)) ?? (sector !== "O" ? await lookup("O") : undefined);

  let covAmt = 0;
  if (row) {
    const fee = Number(row.convenience_fee) || 0;
    covAmt = row.percentage_type === "percentage" ? (amount * fee) / 100 : fee;
  }
  return Math.round(covAmt);
}
