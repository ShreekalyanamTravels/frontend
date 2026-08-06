import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";

interface TxnRow extends RowDataPacket {
  id: number;
  type: string | null;
  transaction_id: string | null;
  description: string | null;
  is_deposited: number | null;
  txn_type: string | null;
  booking_ref: string | null;
  opening_balance: string | null;
  closing_balance: string | null;
  opening_od_balance: string | null;
  closing_od_balance: string | null;
  temp_od_used: string | null;
  wallet_deducted: string | null;
  od_deducted: string | null;
  recharge_amount: string | null;
  remarks: string | null;
  created_at: string;
}

/* Lists the current user's Credit Pool ledger from creditpool_transactions, newest first — see
 * app/lib/wallet.ts for the write side. Every field here is a real stored column (opening/closing
 * Main Balance and OD balance, wallet/OD/temp-OD split, recharge amount, booking ref, remarks) —
 * nothing reconstructed. */
export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const [rows] = await pool.query<TxnRow[]>(
      `SELECT id, type, transaction_id, description, is_deposited, txn_type, booking_ref,
              opening_balance, closing_balance, opening_od_balance, closing_od_balance,
              temp_od_used, wallet_deducted, od_deducted, recharge_amount, remarks, created_at
       FROM creditpool_transactions
       WHERE agent_id = ?
       ORDER BY id DESC
       LIMIT 100`,
      [String(session.userId)]
    );

    return NextResponse.json({
      transactions: rows.map(r => ({
        id: r.id,
        direction: r.type === "CR" ? "credit" : "debit",
        isDeposit: r.is_deposited === 1,
        txnType: r.txn_type,
        transactionId: r.transaction_id,
        bookingRef: r.booking_ref,
        description: r.description,
        remarks: r.remarks,
        openingMainBalance: Number(r.opening_balance) || 0,
        closingMainBalance: Number(r.closing_balance) || 0,
        openingOdBalance: Number(r.opening_od_balance) || 0,
        closingOdBalance: Number(r.closing_od_balance) || 0,
        tempOdUsed: Number(r.temp_od_used) || 0,
        walletDeducted: Number(r.wallet_deducted) || 0,
        odDeducted: Number(r.od_deducted) || 0,
        rechargeAmount: Number(r.recharge_amount) || 0,
        amount: r.type === "CR" ? Number(r.recharge_amount) || 0 : (Number(r.wallet_deducted) || 0) + (Number(r.od_deducted) || 0),
        balanceAfter: Number(r.closing_balance) || 0,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
