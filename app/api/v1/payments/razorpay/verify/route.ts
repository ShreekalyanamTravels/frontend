import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { creditWallet } from "@/app/lib/wallet";
import { verifyRazorpaySignature, fetchAuthoritativeOrder } from "@/app/lib/razorpayVerify";

interface ExistingDeposit extends RowDataPacket {
  id: number;
}

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Authoritative amount comes from the order's own `notes` (set server-side at create-order
    // time), never from the client body — prevents a client from submitting a genuinely-signed
    // order/payment pair alongside an inflated amount to over-credit their wallet.
    const { notes } = await fetchAuthoritativeOrder(razorpay_order_id);
    if (notes.userId !== String(session.userId)) {
      return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
    }
    const amount = Number(notes.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Order has no recorded amount" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Idempotency: a replayed verify call for the same payment must not credit twice.
      const [existing] = await conn.query<ExistingDeposit[]>(
        "SELECT id FROM deposits WHERE gateway_transaction_id = ? LIMIT 1",
        [razorpay_payment_id]
      );
      if (existing[0]) {
        await conn.rollback();
        return NextResponse.json({ ok: true });
      }

      const [depositResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO deposits
          (user_id, payment_type, payment_gateway, transaction_id, gateway_transaction_id,
           amount, convenience_fee, total_paid, transaction_date, status, is_online, admin_remarks)
         VALUES (?, 'online', 'Razorpay', ?, ?, ?, 0, ?, CURDATE(), 'approved', 1, 'Razorpay auto-verified')`,
        [session.userId, razorpay_order_id, razorpay_payment_id, amount, amount]
      );

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
  } catch (err) {
    return apiErrorResponse(err);
  }
}
