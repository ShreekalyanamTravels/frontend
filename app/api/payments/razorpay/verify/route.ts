import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import type { ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { creditWallet } from "@/app/lib/wallet";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,
    convenienceFee,
    total,
  } = await request.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [depositResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO deposits
        (user_id, payment_type, payment_gateway, transaction_id, gateway_transaction_id,
         amount, convenience_fee, total_paid, transaction_date, status, is_online, admin_remarks)
       VALUES (?, 'online', 'Razorpay', ?, ?, ?, ?, ?, CURDATE(), 'approved', 1, 'Razorpay auto-verified')`,
      [session.userId, razorpay_order_id, razorpay_payment_id, amount, convenienceFee ?? 0, total ?? amount]
    );

    // Recharge only affects the Main Balance — never the OD limit — per app/lib/wallet.ts.
    await creditWallet(conn, session.userId, amount, {
      depositId: depositResult.insertId,
      description: `Deposit Approved - Amount Credited/Settled (ID: ${depositResult.insertId})`,
    });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return NextResponse.json({ ok: true });
}
