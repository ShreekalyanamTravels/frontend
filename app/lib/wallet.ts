import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

/* Credit Pool (Main Balance + OD Balance) model, built directly on the existing `users` columns —
 * none renamed, none reinterpreted beyond what's specified:
 *   - `permanent_od_bal`   — the fixed, admin-set OD credit LIMIT. Never changes from spending or
 *                            recharging; only an admin resets it. Shown as "Your OD Limit is ₹X".
 *   - `current_od_balance` — the REMAINING permanent OD headroom. Starts equal to permanent_od_bal
 *                            and is decremented as OD gets drawn (see chargeWallet).
 *   - `temp_od_bal` (+`temp_od_bal_date`) — a time-limited bonus OD amount, added on top of
 *                            current_od_balance only while today <= temp_od_bal_date. Decremented
 *                            only once current_od_balance itself is fully drawn.
 *   - `current_balance`    — the signed Main Wallet Balance. Positive = real deposited cash
 *                            (green). Negative = that much has been borrowed from OD after the
 *                            wallet hit zero (red).
 * "OD Balance" as displayed = current_od_balance + (valid) temp_od_bal.
 * "Available Credit Pool" = current_balance + current_od_balance + (valid) temp_od_bal.
 * Every event (deposit or spend) is recorded as a row in `creditpool_transactions`, which already
 * has the full audit columns this needs (opening/closing balance, opening/closing OD balance,
 * temp OD used, wallet/OD split, recharge amount, booking ref, remarks, txn_type). */

export class InsufficientFundsError extends Error {
  constructor(public shortfall: number) {
    super("Insufficient Credit Pool Balance");
    this.name = "InsufficientFundsError";
  }
}

interface UserWalletRow extends RowDataPacket {
  current_balance: number;
  permanent_od_bal: string | null;
  current_od_balance: string | null;
  temp_od_bal: string | null;
  temp_od_bal_date: string | null;
}

/* temp_od_bal_date is a free-text varchar (no fixed format enforced by the admin panel) — accepts
 * both "YYYY-MM-DD" and "DD-MM-YYYY" (the format used in the spec's own example, "05-08-2026")
 * by detecting which segment is the 4-digit year. Falls back to native Date parsing otherwise. */
function parseFlexibleDate(raw: string): Date | null {
  const parts = raw.split(/[-/]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    let y: string, m: string, d: string;
    if (a.length === 4) { y = a; m = b; d = c; }
    else if (c.length === 4) { y = c; m = b; d = a; }
    else return null;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isTempOdValid(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const expiry = parseFlexibleDate(dateStr);
  if (!expiry) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return expiry.getTime() >= today.getTime();
}

export interface WalletSnapshot {
  /** users.current_balance, signed — "Main Balance". Positive = real wallet cash (green).
   * Negative = OD currently drawn (red). */
  walletBalance: number;
  /** users.permanent_od_bal — the fixed OD credit limit set by admin. Display-only, never spent. */
  permanentOdLimit: number;
  /** users.current_od_balance — remaining permanent OD headroom (decrements as OD is drawn). */
  currentOdBalance: number;
  /** Raw users.temp_od_bal value (may be expired — check tempOdValid). */
  tempOdBal: number;
  /** Whether temp_od_bal is still within its temp_od_bal_date expiry. */
  tempOdValid: boolean;
  /** users.temp_od_bal_date, unparsed, for display. */
  tempOdExpiry: string | null;
  /** "OD Balance" — currentOdBalance + (tempOdBal if still valid). */
  odBalance: number;
  /** "Available Credit Pool" — walletBalance + currentOdBalance + (tempOdBal if still valid). */
  creditPool: number;
  /** What to show as "the balance" — identical to walletBalance. */
  displayBalance: number;
}

function snapshotOf(row: UserWalletRow): WalletSnapshot {
  const walletBalance = Number(row.current_balance) || 0;
  const permanentOdLimit = Number(row.permanent_od_bal) || 0;
  const currentOdBalance = Number(row.current_od_balance) || 0;
  const tempOdBal = Number(row.temp_od_bal) || 0;
  const tempOdValid = isTempOdValid(row.temp_od_bal_date);
  const validTemp = tempOdValid ? tempOdBal : 0;
  return {
    walletBalance,
    permanentOdLimit,
    currentOdBalance,
    tempOdBal,
    tempOdValid,
    tempOdExpiry: row.temp_od_bal_date,
    odBalance: currentOdBalance + validTemp,
    creditPool: walletBalance + currentOdBalance + validTemp,
    displayBalance: walletBalance,
  };
}

export async function getWalletSnapshot(userId: string | number): Promise<WalletSnapshot> {
  const [rows] = await pool.query<UserWalletRow[]>(
    "SELECT current_balance, permanent_od_bal, current_od_balance, temp_od_bal, temp_od_bal_date FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  return snapshotOf(rows[0] ?? ({} as UserWalletRow));
}

/* Deducts `amount` from the user's Credit Pool — Main Balance first, then current_od_balance,
 * then (only once current_od_balance is exhausted) any still-valid temp_od_bal. Must run inside
 * an already-open transaction (conn); locks the user row via FOR UPDATE so concurrent spends
 * can't both pass the check. Throws InsufficientFundsError ("Insufficient Credit Pool Balance")
 * when amount exceeds the total Credit Pool. */
export async function chargeWallet(
  conn: PoolConnection,
  userId: string | number,
  amount: number,
  ref: { bookingId: string; description: string; kind?: "booking" | "insurance" | "refund" }
): Promise<{ walletDeducted: number; odDeducted: number; tempOdUsed: number; balanceAfter: number }> {
  const [rows] = await conn.query<UserWalletRow[]>(
    "SELECT current_balance, permanent_od_bal, current_od_balance, temp_od_bal, temp_od_bal_date FROM users WHERE id = ? FOR UPDATE",
    [userId]
  );
  const row = rows[0];
  if (!row) throw new Error("User not found");

  const before = snapshotOf(row);
  if (amount > before.creditPool) {
    throw new InsufficientFundsError(amount - before.creditPool);
  }

  // Rule 1 (current_balance > 0): wallet first. Rule 2 (current_balance <= 0): straight to OD.
  const walletDeducted = Math.max(0, Math.min(before.walletBalance, amount));
  let odPortion = amount - walletDeducted;
  const odDeducted = Math.min(odPortion, before.currentOdBalance);
  odPortion -= odDeducted;
  const tempOdUsed = before.tempOdValid ? Math.min(odPortion, before.tempOdBal) : 0;

  const newMainBalance = before.walletBalance - amount;
  const newCurrentOdBalance = before.currentOdBalance - odDeducted;
  const newTempOdBal = before.tempOdBal - tempOdUsed;

  await conn.query(
    "UPDATE users SET current_balance = ?, current_od_balance = ?, temp_od_bal = ? WHERE id = ?",
    [newMainBalance, newCurrentOdBalance, newTempOdBal, userId]
  );

  const prefix = ref.kind === "insurance" ? "INS" : ref.kind === "refund" ? "REF" : "BOOK";
  const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const txnType = ref.kind === "insurance" ? "Insurance Booking" : ref.kind === "refund" ? "Refund" : "Flight Booking";

  await conn.query(
    `INSERT INTO creditpool_transactions
      (agent_id, credit_amt, amount, type, transaction_id, description, is_deposited,
       txn_type, booking_ref, opening_balance, closing_balance,
       opening_od_balance, closing_od_balance, temp_od_used, wallet_deducted, od_deducted, remarks)
     VALUES (?, ?, ?, 'DR', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(userId), before.permanentOdLimit, amount, `${prefix}-${stamp}`, ref.description,
      txnType, ref.bookingId, before.walletBalance, newMainBalance,
      before.currentOdBalance, newCurrentOdBalance, tempOdUsed, walletDeducted, odDeducted,
      ref.description,
    ]
  );

  return { walletDeducted, odDeducted: odDeducted + tempOdUsed, tempOdUsed, balanceAfter: newMainBalance };
}

/* Credits `amount` into the Main Balance — a payment-gateway recharge. Adds to current_balance
 * directly (simple addition — naturally clears a negative/OD-borrowed balance first, since
 * -8039 + 10000 = 1961). Whatever portion of the recharge went toward clearing that negative
 * balance is also restored to current_od_balance (repaying OD debt gives the credit line back),
 * capped at permanent_od_bal so it can never exceed the admin-set limit. If current_balance was
 * already >= 0, none of the recharge counts as debt repayment and current_od_balance is
 * untouched. temp_od_bal is never restored here — it's a separate, time-limited bonus, not part
 * of the permanent credit line. Must run inside an already-open transaction (conn). */
export async function creditWallet(
  conn: PoolConnection,
  userId: string | number,
  amount: number,
  ref: { depositId: number | string; description: string }
): Promise<{ balanceAfter: number }> {
  const [rows] = await conn.query<UserWalletRow[]>(
    "SELECT current_balance, permanent_od_bal, current_od_balance, temp_od_bal, temp_od_bal_date FROM users WHERE id = ? FOR UPDATE",
    [userId]
  );
  const row = rows[0];
  if (!row) throw new Error("User not found");

  const before = snapshotOf(row);
  const newMainBalance = before.walletBalance + amount;

  const owed = Math.max(0, -before.walletBalance);
  const odRestored = Math.min(amount, owed);
  const newCurrentOdBalance = Math.min(before.permanentOdLimit, before.currentOdBalance + odRestored);

  await conn.query("UPDATE users SET current_balance = ?, current_od_balance = ? WHERE id = ?", [
    newMainBalance, newCurrentOdBalance, userId,
  ]);

  await conn.query(
    `INSERT INTO creditpool_transactions
      (agent_id, credit_amt, amount, type, transaction_id, description, is_deposited,
       txn_type, opening_balance, closing_balance, opening_od_balance, closing_od_balance,
       temp_od_used, wallet_deducted, od_deducted, recharge_amount, remarks)
     VALUES (?, ?, ?, 'CR', ?, ?, 1, 'Recharge', ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    [
      String(userId), before.permanentOdLimit, amount, `DEP-${ref.depositId}`, ref.description,
      before.walletBalance, newMainBalance, before.currentOdBalance, newCurrentOdBalance,
      amount, ref.description,
    ]
  );

  return { balanceAfter: newMainBalance };
}
